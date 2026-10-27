import { splitLines } from './splitLines'

/**
 * Reports the one-based line and column of a character index.
 *
 * The lines come from `splitLines`, so a file with either line ending reads
 * correctly; a reader that splits on `\n` alone reports the wrong position for
 * a CRLF file.
 *
 * @param {string} text - the text the index belongs to.
 * @param {number} index - the index to locate.
 */
export const getPosition = (text: string, index: number) => {
  if (index <= 0) return { lineNumber: 1, columnNumber: 1 }

  const lines = splitLines(text.slice(0, index))

  return {
    lineNumber: lines.length,
    columnNumber: lines[lines.length - 1].length + 1
  }
}
