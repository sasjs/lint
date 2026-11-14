import { LintConfig } from '../types'
import { LineEndings } from '../types/LineEndings'
import {
  checkIsDataLine,
  getDataSectionsDetail
} from '../utils/getDataSectionsDetail'
import { cleanState, noScan, scanLine } from '../utils/scanLine'
import {
  breakAwareState,
  continuationIndentFor,
  firstNonSpace,
  indentationMultipleOf,
  macroComment,
  macroDeclaration,
  putTextStart
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

/**
 * Breaks a macro declaration before its parameter commas, or returns `null`
 * when it cannot.
 *
 * The declaration is the one statement the macro rules read as a whole, so the
 * break is placed only at a comma that separates two parameters - never inside
 * one - and a continuation line starts with the comma, which is how the library
 * already writes a call that does not fit. `%mend` has no parameters and is
 * left alone.
 *
 * @param {string} line - the declaration.
 * @param {string} code - the same line with literals blanked, so a comma inside
 *   a quoted default is not mistaken for a separator.
 * @param {number} limit - the maximum line length.
 * @param {number} multiple - the indentation multiple.
 * @returns {string[] | null} the lines, or `null` when no split fits.
 */
const splitMacroDeclaration = (
  line: string,
  code: string,
  limit: number,
  multiple: number
): string[] | null => {
  const opening = /^\s*%macro\s+[\w.]+\s*\(/i.exec(code)

  if (!opening) return null

  const open = opening[0].length - 1
  let depth = 0
  let close = -1

  for (let index = open; index < code.length; index++) {
    if (code[index] === '(') depth++
    else if (code[index] === ')' && --depth === 0) {
      close = index
      break
    }
  }

  if (close < 0) return null

  const inside = code.slice(open + 1, close)
  const commas: number[] = []

  depth = 0
  for (let index = 0; index < inside.length; index++) {
    if (inside[index] === '(') depth++
    else if (inside[index] === ')') depth--
    else if (inside[index] === ',' && depth === 0) commas.push(index + open + 1)
  }

  if (!commas.length) return null

  const indent = /^\s*/.exec(line)![0]
  const continuationIndent = continuationIndentFor(indent, multiple)
  const parameters: string[] = []
  let from = open + 1

  commas.forEach((comma) => {
    parameters.push(line.slice(from, comma))
    from = comma + 1
  })
  parameters.push(line.slice(from, close))

  const tail = line.slice(close)
  const pieces: string[] = []
  let current = line.slice(0, open + 1) + parameters[0]

  for (const parameter of parameters.slice(1)) {
    const candidate = current + ',' + parameter

    if (candidate.length <= limit) current = candidate
    else {
      pieces.push(current)
      current = continuationIndent + ',' + parameter
    }

    if (current.length > limit) return null
  }

  if (current.length + tail.length <= limit) {
    pieces.push(current + tail)
  } else {
    pieces.push(current)
    pieces.push(continuationIndent + tail)
  }

  return pieces.length > 1 && pieces.every((piece) => piece.length <= limit)
    ? pieces
    : null
}

/**
 * Breaks a `put`-family statement by ending the line with `%trim(` and opening
 * the continuation with `)`, or returns `null` when it cannot.
 *
 * The newline and the continuation's indentation become the argument of
 * `%trim`, which resolves to nothing, so the statement SAS reads is the same
 * text it read before the break - `%put NOTE- the text %trim(` and
 * `)continues;` write one line, not two. The space before `%trim(` is the
 * separator the two halves need, so the space is kept rather than lost.
 *
 * @param {string} line - the line to break.
 * @param {number} limit - the maximum line length.
 * @param {number} multiple - the indentation multiple.
 * @param {number[]} positions - the indexes of the line's safe spaces.
 * @param {number} from - the index where the statement's text begins.
 * @returns {string[] | null} the lines, or `null` when no break fits.
 */
const splitWithTrim = (
  line: string,
  limit: number,
  multiple: number,
  positions: number[],
  from: number
): string[] | null => {
  const indent = /^\s*/.exec(line)![0]
  const continuationIndent = continuationIndentFor(indent, multiple)
  const opening = '%trim('
  const pieces: string[] = []
  let prefix = ''
  let start = firstNonSpace(line, 0)
  let textFrom = from

  for (;;) {
    const tail = line.slice(start)

    if (prefix.length + tail.length <= limit) {
      pieces.push((pieces.length ? prefix : '') + tail)

      return pieces.length > 1 ? pieces : null
    }

    // The piece carries the prefix, the text up to the space it breaks at,
    // and the `%trim(` that swallows the break. The space itself is carried by
    // the `) ` that opens the next piece. The first piece is measured from the
    // start of the line, because it keeps the line's own indentation.
    const pieceFrom = pieces.length ? start : 0
    const maximum = pieceFrom + limit - prefix.length - opening.length
    const cut = lastPositionAtMost(positions, maximum, positions.length - 1)
    const at =
      cut >= 0 && positions[cut] >= textFrom && positions[cut] > start
        ? positions[cut]
        : -1

    if (at < 0) return null

    // The first piece keeps the line's own indentation and keyword; every
    // later one starts with the `)` that closes the `%trim(` above it, and the
    // blank the break replaced follows it. A blank left at the end of the
    // upper line would be discarded, because SAS drops one that sits
    // immediately before a macro call - and a trailing blank is what
    // `noTrailingSpaces` reports anyway.
    pieces.push(
      (pieces.length ? prefix + line.slice(start, at) : line.slice(0, at)) +
        opening
    )
    start = at + 1
    textFrom = start
    prefix = continuationIndent + ') '
  }
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
    // A data record is data, so it is not scanned: a comment marker or an
    // apostrophe in one would otherwise stay open for the rest of the file.
    const isData = checkIsDataLine(dataSections, index)
    const scanned = isData ? noScan() : scanLine(line, state)
    state = scanned.endState

    const breakAware = isData
      ? { line: false, open: false }
      : breakAwareState(scanned.code, breakAwareOpen)
    breakAwareOpen = breakAware.open

    // Trailing spaces are another rule's finding: a line whose content fits is
    // left for that fix rather than wrapped into a blank continuation.
    const fits = line.trimEnd().length <= configuration.maxLineLength

    const wrapped =
      isData || macroComment.test(line) || fits
        ? null
        : macroDeclaration.test(line)
          ? splitMacroDeclaration(
              line,
              scanned.code,
              configuration.maxLineLength,
              multiple
            )
          : breakAware.line
            ? splitWithTrim(
                line,
                configuration.maxLineLength,
                multiple,
                scanned.positions,
                putTextStart(line)
              )
            : scanned.hasComment
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
