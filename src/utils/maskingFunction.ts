/**
 * Macro-function argument boundaries used by the existing lexical scanners.
 *
 * Inside a masking call's parentheses a quote, semicolon or comment marker is data
 * rather than syntax, so `%str(%")` is one masked quote - not the end of the
 * double-quoted string it is written in. A scanner that follows strings or
 * comments has to skip such an argument whole: the quote inside it otherwise
 * flips its state and the rest of the file is read as string content.
 *
 * These include calls that mask their argument (`%str`, `%nrstr`, `%bquote`,
 * `%nrbquote`, `%quote`, `%nrquote`) or take a name whose value arrives masked
 * (`%superq`, `%nrsuperq`). `%unquote` is retained as a lexical boundary for
 * existing formatting and comment scanners even though it resolves its argument.
 * The legacy matcher also accepts `%nrunquote`; keep that spelling here for
 * compatibility, not as a claim that SAS defines it.
 * The `%q*` forms are a different family
 * and are NOT in this list: they quote the value they return, while their
 * argument is ordinary macro text in which a quote is still a delimiter - so a
 * scanner that tracks string or comment state must follow the quotes there
 * rather than step over them. That is why trimComments, noXcmd and
 * noSingleAsteriskComments enter through this list; see
 * `argumentTextFunctionNames` for the scanners that only need an argument's end.
 *
 * Callers needing actual masking semantics should use dataMaskingFunctionNames,
 * rather than treating this boundary list as a list of masking functions.
 */
// Calls that mask their argument or take a name whose value arrives masked.
export const dataMaskingFunctionNames = '(?:nr)?(?:str|bquote|superq|quote)'

/** The legacy lexical boundary set includes resolved unquote forms. */
export const maskingFunctionNames = `(?:${dataMaskingFunctionNames}|(?:nr)?unquote)`

/**
 * Invocation scanner policy: actual masks plus the historical `%nrunquote`
 * boundary. `%unquote` itself is resolved and must be scanned as code.
 */
export const callScannerMaskingFunctionStart = new RegExp(
  `^%(?:${dataMaskingFunctionNames}|nrunquote)\\s*\\(`,
  'i'
)

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
 * legacy lexical boundaries and the `%q*` forms, whose arguments are treated
 * as a single function argument. Use this to find where an argument
 * ends; use `dataMaskingFunctionNames` to decide whether its content is data.
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
