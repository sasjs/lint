/**
 * The macro functions whose argument SAS carries as masked data.
 *
 * Inside the parentheses a quote, a semicolon or a comment marker is data
 * rather than syntax, so `%str(%")` is one masked quote - not the end of the
 * double-quoted string it is written in. A scanner that follows strings or
 * comments has to skip such an argument whole: the quote inside it otherwise
 * flips its state and the rest of the file is read as string content.
 *
 * These are the calls that mask their argument (`%str`, `%nrstr`, `%bquote`,
 * `%nrbquote`, `%quote`, `%nrquote`) or take a name whose value arrives masked
 * (`%superq`, `%nrsuperq`). `%unquote` is retained as a lexical boundary for
 * the existing formatting and comment scanners, but it resolves its argument;
 * callers that scan invocations must not treat that argument as masked.
 * The `%q*` forms are a different family
 * and are NOT in this list: they quote the value they return, while their
 * argument is ordinary macro text in which a quote is still a delimiter - so a
 * scanner that tracks string or comment state must follow the quotes there
 * rather than step over them. That is why trimComments, noXcmd and
 * noSingleAsteriskComments enter through this list; see
 * `argumentTextFunctionNames` for the scanners that only need an argument's end.
 *
 * The names live here rather than in each scanner so those scanners cannot
 * disagree about which calls mask, and the formatter's line scan shares them.
 */
export const maskingFunctionNames = '(?:nr)?(?:str|bquote|superq|quote|unquote)'

/**
 * The `%q*` functions, which return their result quoted.
 *
 * Their argument is resolved like any other macro argument - a quote in it is
 * still a delimiter - but it is the argument of one function call, so a comma
 * in it belongs to that call rather than separating macro parameters. A scanner
 * that splits a parameter list, or that only has to find where an argument
 * ends, steps over it; one that tracks string or comment state does not.
 */
export const quotingFunctionNames =
  'qsysfunc|qcmpres|qleft|qlowcase|qscan|qsubstr|qtrim|qupcase|qverify'

/**
 * Every call whose argument is one value rather than a parameter list: the
 * masking calls, whose argument is masked data, and the `%q*` forms, whose
 * argument is a single function argument. Use this to find where an argument
 * ends; use `maskingFunctionNames` to decide whether its content is data.
 */
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
