/**
 * The close of a Doxygen header: a line that holds nothing but the marker (two
 * asterisks and a slash), so both the rules and `sasjs compile` can locate the
 * header's end. Leading whitespace is allowed; anything else on the line is
 * not.
 */
const doxygenHeaderClose = '**/'

/**
 * Whether a file opens with a Doxygen header - a block comment that opens with
 * two asterisks as the first non-whitespace text in the file, and closes with a
 * line that holds nothing but the close marker.
 *
 * The close is what tells a header from a plain comment. A comment that fits on
 * one line, a block opened with a single asterisk, and a block opened with two
 * that is never closed all fail here; `hasDoxygenHeader` reports each of those
 * shapes, and its fix puts the close on a line of its own.
 *
 * The opener is the first non-whitespace text, so a header that follows a
 * statement is not one, and the first close marker ends the block - a close
 * line below a block that already closed belongs to something else.
 *
 * @param {string} text - the text content of the file.
 */
export const isDoxygenHeader = (text: string): boolean => {
  if (!text) return false

  const lines = text.split(/\r\n|\n/)
  let first = -1

  for (let index = 0; index < lines.length; index++) {
    if (lines[index].trim() !== '') {
      first = index
      break
    }
  }

  if (first === -1) return false

  const opener = lines[first].trimStart()
  if (!opener.startsWith('/**')) return false

  // A close on the opener's own line is not a close of its own: the block ends
  // there, so no later line can close it.
  if (opener.includes('*/')) return false

  for (let index = first + 1; index < lines.length; index++) {
    const line = lines[index]

    if (line.trim() === doxygenHeaderClose) return true

    // The block closed earlier, on a line that is not a close of its own.
    if (line.includes('*/')) return false
  }

  return false
}
