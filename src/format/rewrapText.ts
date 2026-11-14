import { LintConfig } from '../types'
import { LineEndings } from '../types/LineEndings'
import {
  checkIsDataLine,
  getDataSectionsDetail
} from '../utils/getDataSectionsDetail'

/**
 * The state the scanner carries from one physical line to the next.
 *
 * A SAS quoted literal and a block comment both continue onto the next line, so
 * a break is only safe where none of these is open. The text before a break is
 * not rewritten, so the state at the end of a line survives wrapping.
 */
interface ScanState {
  /** The quote character a literal is still open with, or `''`. */
  quote: string
  /** Whether a block comment is still open. */
  inComment: boolean
  /** Depth of the masking call the scan is inside. */
  maskedDepth: number
}

/**
 * The macros whose argument text is carried as DATA rather than as tokens:
 * `%str(`, `%nrstr(`, `%bquote(`, `%nrbquote(`, `%superq(`, `%nrsuperq(`,
 * `%quote(`, `%nrquote(` and `%unquote(`. A newline inserted inside one of
 * these becomes part of the value the macro returns, so their spaces are never
 * break points.
 */
const maskStart = /%n?r?(?:str|bquote|superq|quote|unquote)\s*\(/iy

/** A macro declaration, which the macro rules read as one statement. */
const macroDeclaration = /^\s*%(?:macro|mend)\b/i

/**
 * A statement whose line breaks SAS reads as output lines rather than as space
 * between tokens: the DATA step's `put` and `putlog`, and the macro and window
 * statements that write text a reader sees. A break inside one of these adds a
 * line to the log or to the file being written, so the pass leaves them alone -
 * including a line that only carries the continuation of such a statement.
 */
const breakAwareStatement =
  /^\s*%?(?:&?[\w.]*\.)?(?:put|putlog|window|display)\b|\b(?:then|else)\s+put\b/i

const cleanState = (): ScanState => ({
  quote: '',
  inComment: false,
  maskedDepth: 0
})

/** A physical line, as the scanner reads it. */
interface ScannedLine {
  /**
   * The columns at which a newline may be inserted: every space that is not
   * inside a quoted literal, inside a masking macro's parentheses, or inside a
   * block comment.
   */
  positions: number[]
  /** The line with every literal and comment character blanked to a space. */
  code: string
  /** Whether the line carries any block comment, open or closed. */
  hasComment: boolean
  endState: ScanState
}

/**
 * Reads one line, starting from the state the previous line ended in.
 *
 * A break is never taken inside a literal, because a SAS literal really does
 * continue onto the next line (`"ab` / `cd"` is one value) and an inserted
 * newline would become part of the string.
 */
const scanLine = (line: string, state: ScanState): ScannedLine => {
  const positions: number[] = []
  const code: string[] = new Array(line.length).fill(' ')
  let { quote, inComment, maskedDepth } = state
  let hasComment = inComment

  for (let index = 0; index < line.length; index++) {
    const character = line[index]

    if (inComment) {
      if (character === '*' && line[index + 1] === '/') {
        inComment = false
        index++
        continue
      }
      if (character === ' ') positions.push(index)
      continue
    }

    if (quote) {
      if (character === quote) quote = ''
      continue
    }

    if (character === "'" || character === '"') {
      quote = character
      continue
    }

    if (character === '/' && line[index + 1] === '*') {
      inComment = true
      hasComment = true
      index++
      continue
    }

    if (maskedDepth) {
      if (character === '(') maskedDepth++
      else if (character === ')') maskedDepth--
      continue
    }

    maskStart.lastIndex = index
    if (maskStart.test(line)) {
      maskedDepth = 1
      index = maskStart.lastIndex - 1
      continue
    }

    if (character === ' ') positions.push(index)
    code[index] = character
  }

  return {
    positions,
    code: code.join(''),
    hasComment,
    endState: { quote, inComment, maskedDepth }
  }
}

/** The index of the first non-whitespace character at or after `from`. */
const firstNonSpace = (line: string, from: number): number => {
  const rest = line.slice(from)

  return from + rest.length - rest.trimStart().length
}

/** The index just past the last safe break point at or before `maximum`. */
const lastPositionAtMost = (
  positions: number[],
  maximum: number,
  lastIndex: number
): number => {
  let low = 0
  let high = lastIndex
  let found = -1

  while (low <= high) {
    const middle = (low + high) >> 1

    if (positions[middle] <= maximum) {
      found = middle
      low = middle + 1
    } else {
      high = middle - 1
    }
  }

  return found
}

/**
 * The indentation a continuation line takes: the next multiple of
 * `indentationMultiple` after the line's own, so the wrap can never introduce
 * an `indentationMultiple` diagnostic of its own.
 */
const continuationIndentFor = (indent: string, multiple: number): string =>
  indent + ' '.repeat(multiple - (indent.length % multiple))

/**
 * Breaks one line into lines no longer than `limit`, or returns `null` when no
 * break produces a line that fits.
 *
 * The break is greedy: the last safe space that fits, walking back towards the
 * indentation until one is found, so a wrap never turns one diagnostic into
 * two. A continuation is indented one `indentationMultiple` past the line it
 * came from, which keeps a file that satisfies `indentationMultiple` doing so.
 */
const wrapLine = (
  line: string,
  limit: number,
  multiple: number,
  positions: number[]
): string[] | null => {
  const indent = /^\s*/.exec(line)![0]
  const continuationIndent = continuationIndentFor(indent, multiple)
  const continuationWidth = continuationIndent.length
  const lines: string[] = []
  let start = firstNonSpace(line, 0)
  let first = true

  while (line.length - start + (first ? 0 : continuationWidth) > limit) {
    // A continuation line carries its indentation, so it has that much less
    // room than the line it replaces.
    const maximum = first ? limit : start + limit - continuationWidth
    const found = lastPositionAtMost(positions, maximum, positions.length - 1)

    // The last break point that fits is at or before `start` when the line has
    // no break left to take; the tail then stays on one line and the caller
    // leaves the whole line as it is.
    if (found < 0 || positions[found] <= start) return null

    const cut = positions[found]
    lines.push(
      first
        ? line.slice(0, cut).trimEnd()
        : continuationIndent + line.slice(start, cut).trimEnd()
    )
    start = firstNonSpace(line, cut)
    first = false
  }

  lines.push(first ? line : continuationIndent + line.slice(start))

  return lines
}

/**
 * The lines of the text, each paired with the terminator that follows it.
 *
 * The terminator is kept rather than assumed, so a line this pass does not
 * touch keeps its own bytes - including in a file whose endings are mixed, and
 * in a file that has no final terminator at all.
 */
const splitWithTerminators = (
  text: string
): { line: string; ending: string }[] => {
  const parts = text.split(/(\r\n|\n)/)
  const lines: { line: string; ending: string }[] = []

  for (let index = 0; index < parts.length; index += 2) {
    lines.push({ line: parts[index], ending: parts[index + 1] ?? '' })
  }

  return lines
}

/**
 * Wraps the lines of a file that exceed `maxLineLength`, and leaves every other
 * line byte-identical.
 *
 * Lines that are left alone, because a break would change what SAS reads or
 * what another rule has to parse:
 *
 * - `datalines` / `cards` / `parmcards` records, and the statement that opens
 *   them, where a newline ends the record;
 * - `%macro` and `%mend` declarations, which the macro rules read as one
 *   statement;
 * - a `put` / `putlog` / `%put` / `%window` / `%display` statement and every
 *   line of it, where a newline is a line of output rather than a delimiter;
 * - any line that carries a block comment, which is what keeps the header
 *   (`@sasjslint {json}` tag, `<h4> SAS Macros </h4>` section and all) out of
 *   the pass: wrapping one line of a paragraph reflows it against the lines
 *   around it.
 *
 * A line is wrapped only when every line it becomes fits the limit, so the pass
 * never turns one diagnostic into two.
 *
 * @param {string} text - the text to rewrap.
 * @param {LintConfig} configuration - the configuration in force, header
 *   override included.
 * @returns {string} the rewrapped text, with every untouched line's own
 *   terminator preserved.
 */
export const rewrapText = (text: string, configuration: LintConfig): string => {
  if (!text) return text

  // The limit is off when the rule is absent from the config, not when
  // `maxLineLength` reads 0: a switched-off limit leaves the property at its
  // documented default of 80.
  if (
    !configuration.lineLintRules.some((rule) => rule.name === 'maxLineLength')
  )
    return text

  const entries = splitWithTerminators(text)
  const lines = entries.map((entry) => entry.line)
  const dataSections = getDataSectionsDetail(text, configuration)
  const multiple =
    configuration.indentationMultiple > 0
      ? configuration.indentationMultiple
      : 2

  // The terminator for a break inserted into a line that has none of its own
  // (the final line of a file with no final newline).
  const defaultEnding =
    configuration.lineEndings === LineEndings.CRLF ? '\r\n' : '\n'
  const result: string[] = []
  let state = cleanState()
  // Whether the previous line opened a `put`-family statement that has not
  // reached its `;` yet, which makes this line a continuation of it.
  let breakAwareOpen = false
  let changed = false

  lines.forEach((line, index) => {
    const { positions, code, hasComment, endState } = scanLine(line, state)
    state = endState

    const ending = entries[index].ending
    const limit = configuration.maxLineLength

    // `code.split(';')` gives one entry per statement on the line, the last
    // entry being the part that has not reached its `;`.
    const statements = code.split(';')
    const breakAwareAt = statements.findIndex((statement) =>
      breakAwareStatement.test(statement)
    )
    const isBreakAware = breakAwareOpen || breakAwareAt > -1
    breakAwareOpen = breakAwareOpen
      ? statements.length === 1
      : breakAwareAt > -1 && breakAwareAt === statements.length - 1

    const isProtected =
      isBreakAware ||
      // Prose is not read as code, but wrapping one physical line of a
      // paragraph reflows it against the lines around it, so the pass leaves
      // comments to their author.
      hasComment ||
      checkIsDataLine(dataSections, index) ||
      macroDeclaration.test(line)

    // Trailing spaces are another rule's finding: a line whose content fits is
    // left for that fix rather than wrapped into a blank continuation.
    const wrapped =
      isProtected || line.trimEnd().length <= limit
        ? null
        : wrapLine(line, limit, multiple, positions)

    if (!wrapped) {
      result.push(line + ending)
      return
    }

    changed = true
    // The break inside the line takes that line's own terminator, and a
    // break in the final line takes the configured one.
    const breakEnding = ending || defaultEnding
    wrapped.forEach((piece, pieceIndex) => {
      result.push(
        piece + (pieceIndex === wrapped.length - 1 ? ending : breakEnding)
      )
    })
  })

  return changed ? result.join('') : text
}
