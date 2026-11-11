import { splitLines } from './splitLines'

/**
 * Reports the character index of a one-based line and column.
 *
 * The inverse of `getPosition`, and for the same reason: the lines come from
 * `splitLines`, so a CRLF file yields the index a `\n`-only reader would miss
 * by one per preceding line.
 *
 * @param {string} text - the text the position belongs to.
 * @param {number} lineNumber - one-based line number.
 * @param {number} columnNumber - one-based column number.
 */
export const getIndex = (
  text: string,
  lineNumber: number,
  columnNumber: number
): number => {
  if (lineNumber <= 1) return Math.max(columnNumber - 1, 0)

  const lines = splitLines(text)
  let index = 0

  for (let line = 1; line < lineNumber && line <= lines.length; line++) {
    // The terminator is not part of the line, so it is measured here: one
    // character for a LF file, two for a CRLF one.
    const terminator = text.startsWith('\r\n', index + lines[line - 1].length)
      ? 2
      : 1
    index += lines[line - 1].length + terminator
  }

  return Math.min(index + Math.max(columnNumber - 1, 0), text.length)
}
