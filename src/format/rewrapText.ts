import { LintConfig } from '../types'
import { LineEndings } from '../types/LineEndings'
import {
  checkIsDataLine,
  getDataSectionsDetail
} from '../utils/getDataSectionsDetail'
import { cleanState, scanLine } from '../utils/scanLine'
import {
  breakAwareState,
  continuationIndentFor,
  firstNonSpace,
  indentationMultipleOf,
  macroComment,
  macroDeclaration
} from './longLines'

/**
 * A macro keyword that reads the token after it, so a break that leaves one at
 * the end of a line is legal but reads badly.
 */
const leadingKeyword = /%?(?:let|global|local|then|else|do|to|by)$/i

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
 * Breaks one line into lines no longer than `limit`, or returns `null` when no
 * break produces a line that fits.
 *
 * The break is greedy: the last safe space that fits, walking back towards the
 * indentation until one is found, so a wrap never turns one diagnostic into
 * two. A continuation is indented one `indentationMultiple` past the line it
 * came from, which keeps a file that satisfies `indentationMultiple` doing so.
 */
const lastBreakBefore = (
  line: string,
  positions: number[],
  maximum: number,
  start: number
): number => {
  const last = lastPositionAtMost(positions, maximum, positions.length - 1)
  let fallback = -1

  for (let index = last; index >= 0; index--) {
    const position = positions[index]

    if (position <= start) break
    if (!leadingKeyword.test(line.slice(0, position).trimEnd())) return position
    if (fallback < 0) fallback = position
  }

  return fallback
}

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

  while (line.length - start + (first ? start : continuationWidth) > limit) {
    // A continuation line carries its indentation, so it has that much less
    // room than the line it replaces.
    const maximum = first ? limit : start + limit - continuationWidth
    const cut = lastBreakBefore(line, positions, maximum, start)

    // No break point fits: the tail stays on one line and the caller leaves the
    // whole line as it is.
    if (cut < 0) return null
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
 * The terminator is kept rather than assumed, so a line a pass does not touch
 * keeps its own bytes - including in a file whose endings are mixed, and in a
 * file that has no final terminator at all.
 */
export const splitWithTerminators = (
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
 * - a `%*` comment statement, which is prose;
 * - a `put` / `putlog` / `%put` / `%window` / `%display` statement and every
 *   line of it, where a newline is a line of output rather than a delimiter;
 * - any line that carries a block comment, which `reflowComments` owns.
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
  const dataSections = getDataSectionsDetail(text, configuration)
  const multiple = indentationMultipleOf(configuration)

  // The terminator for a break inserted into a line that has none of its own
  // (the final line of a file with no final newline).
  const defaultEnding =
    configuration.lineEndings === LineEndings.CRLF ? '\r\n' : '\n'
  const result: string[] = []
  let state = cleanState()
  // Whether the previous line opened a `put`-family statement that has not
  // reached its terminator yet, which makes this line a continuation of it.
  let breakAwareOpen = false
  let changed = false

  entries.forEach(({ line, ending }, index) => {
    const scanned = scanLine(line, state)
    state = scanned.endState

    const breakAware = breakAwareState(scanned.code, breakAwareOpen)
    breakAwareOpen = breakAware.open

    const isProtected =
      breakAware.line ||
      scanned.hasComment ||
      checkIsDataLine(dataSections, index) ||
      macroComment.test(line) ||
      macroDeclaration.test(line)

    // Trailing spaces are another rule's finding: a line whose content fits is
    // left for that fix rather than wrapped into a blank continuation.
    const wrapped =
      isProtected || line.trimEnd().length <= configuration.maxLineLength
        ? null
        : wrapLine(
            line,
            configuration.maxLineLength,
            multiple,
            scanned.positions
          )

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
