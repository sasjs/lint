/**
 * The macro functions whose argument SAS masks.
 *
 * Inside the parentheses a quote, a semicolon or a comment marker is data
 * rather than syntax, so `%str(%")` is one masked quote - not the end of the
 * double-quoted string it is written in. A scanner that follows strings or
 * comments has to skip such an argument whole: the quote inside it otherwise
 * flips its state and the rest of the file is read as string content.
 *
 * The names live here rather than in each scanner that skips a masking
 * argument, so the formatter's line scan, trimComments, noXcmd and
 * noSingleAsteriskComments cannot disagree about which calls mask.
 */
export const maskingFunctionNames = '(?:nr)?(?:str|bquote|superq|quote|unquote)'

/**
 * The `%q*` functions. SAS hands their argument to a DATA step function rather
 * than resolving it as macro code, so a comma or a quote in it is data - the
 * same reason to step over a masking call's argument, and they belong beside
 * the masking names in a scanner that does that.
 */
export const quotingFunctionNames =
  'qsysfunc|qcmpres|qleft|qlowcase|qscan|qsubstr|qtrim|qupcase|qverify'

/** Every call whose argument a scanner has to step over rather than read. */
export const argumentTextFunctionNames = `${maskingFunctionNames}|${quotingFunctionNames}`

/** Matches one of those calls, at the start of the supplied text. */
export const maskingFunctionStart = new RegExp(
  `^%${maskingFunctionNames}\\s*\\(`,
  'i'
)

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
