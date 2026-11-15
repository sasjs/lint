/**
 * The macro functions whose argument SAS masks.
 *
 * Inside the parentheses a quote, a semicolon or a comment marker is data
 * rather than syntax, so `%str(%")` is one masked quote - not the end of the
 * double-quoted string it is written in. Every scanner that follows strings or
 * comments has to skip such an argument whole, or the quote inside it flips its
 * state and the rest of the file is read as string content.
 */
export const maskingFunctionStart = /^%(nrstr|str)\s*\(/i

/**
 * Finds the end of a masking function's argument.
 * `%(` and `%)` are the escapes for literal parentheses inside the argument, so
 * they do not affect the nesting depth.
 * @param {string} text - the text the argument sits in.
 * @param {number} start - the index of the first character after the `(`.
 * @returns {number} the index one past the closing `)`, or the length of the
 * text when the argument is never closed.
 */
export const maskedArgumentEnd = (text: string, start: number): number => {
  // The scan starts inside the argument's own parenthesis.
  let depth = 1

  for (let index = start; index < text.length; index++) {
    if (
      text[index] === '%' &&
      (text[index + 1] === '(' || text[index + 1] === ')')
    ) {
      index++
      continue
    }

    if (text[index] === '(') depth++
    else if (text[index] === ')') {
      depth--
      if (depth === 0) return index + 1
    }
  }

  return text.length
}
