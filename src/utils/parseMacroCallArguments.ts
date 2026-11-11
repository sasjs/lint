import { getIndex } from './getIndex'
import { MacroCall } from './parseMacroCalls'

/**
 * Why a macro call does not close: the scan ran to the end of the file while
 * inside a quoted string, inside parentheses, or inside a comment.
 */
export type MacroCallUnclosed = 'quote' | 'parenthesis' | 'comment'

/** One comma-separated parameter of a macro call, with its span in the file. */
export interface MacroCallParameter {
  /** The parameter text, exactly as written. */
  text: string
  /** True when the parameter opens with `name=`. */
  isKeyword: boolean
  /** Index of the parameter's first character. */
  start: number
  /** Index one past the parameter's last character. */
  end: number
}

/** The argument region of one macro call. */
export interface MacroCallArguments {
  /** Index of the opening parenthesis. */
  openParen: number
  /** Index of the closing parenthesis, or -1 when the call does not close. */
  closeParen: number
  /** What the scan was in when it ran out of file, or null when it closed. */
  unclosed: MacroCallUnclosed | null
  /** The parameters, in order, including empty ones. */
  parameters: MacroCallParameter[]
  /** The text between the closing parenthesis and the end of its line. */
  afterClose: string
}

/**
 * The functions whose argument is text rather than code. A comma or a quote
 * inside one belongs to the value, so the scan steps over the whole argument
 * instead of reading it.
 */
const maskingFunction =
  /%(nrstr|str|bquote|quote|superq|qsysfunc|qcmpres|qleft|qlowcase|qscan|qsubstr|qtrim|qupcase|qverify)\s*\(/iy

/**
 * A parameter that opens with `name=`, which is what makes it a keyword one.
 *
 * The name may arrive through a macro trigger: the macro processor resolves
 * `&k` before the parameter list is parsed, so `%foo(a=1, &k=2)` with
 * `%let k=b;` passes `b` as a keyword parameter (SAS 9.4, syscc 0).
 */
const keywordParameter = /^\s*(?:&+[a-z_][a-z0-9_.]*|[a-z_][a-z0-9_]*)\s*=/i

/**
 * A comment at the start of a parameter, which the engine ignores: in
 * `%foo(a=1, [comment] b=2)` the parameter still opens with `b=`, so it is a
 * keyword one.
 */
const leadingComment = /^(?:\s*\/\*[\s\S]*?\*\/)*\s*/

/** Index one past the `)` that closes a masking function's argument. */
const skipMasked = (text: string, openParen: number): number => {
  let depth = 1
  let index = openParen + 1

  while (index < text.length && depth) {
    // `%(` and `%)` are literal parenthesis inside a masked argument.
    if (
      text[index] === '%' &&
      (text[index + 1] === '(' || text[index + 1] === ')')
    ) {
      index += 2
      continue
    }
    if (text[index] === '(') depth++
    if (text[index] === ')') depth--
    index++
  }

  return index
}

/**
 * True when a parameter opens with a masking function whose argument is
 * followed by `=`, as in `%str(b)=2`.
 *
 * That is not a keyword parameter: the engine reads the whole thing as
 * positional text and refuses the call, which is why the rule reports it and
 * tells the reader to drop the mask rather than add one.
 *
 * @param {string} parameter - one parameter's text, as written.
 */
export const hasMaskedName = (parameter: string): boolean => {
  const start = parameter.length - parameter.trimStart().length

  maskingFunction.lastIndex = start
  if (!maskingFunction.test(parameter)) return false

  const end = skipMasked(parameter, maskingFunction.lastIndex - 1)

  return /^\s*=/.test(parameter.slice(end))
}

/**
 * Reads the argument region of a macro call: where it starts and ends, the
 * parameters it contains, and whether it closes at all.
 *
 * The scan follows what the macro tokenizer does - it tracks single and double
 * quotes, parenthesis depth and block comments, and skips the argument of a
 * masking function - because that is what decides where the call ends. A
 * parameter is only split at a comma that sits at depth zero, outside a quote
 * and outside a mask, which is the same rule: `%foo(a="x, y")` and
 * `%foo(a=%str(x, y))` are one parameter each.
 *
 * @param {string} text - the whole file.
 * @param {MacroCall} call - an invocation reported by `parseMacroCalls`.
 * @returns {MacroCallArguments | null} null when the call carries no argument
 * list, so there is nothing to read.
 */
export const parseMacroCallArguments = (
  text: string,
  call: MacroCall
): MacroCallArguments | null => {
  if (!text) return null

  // `endColumnNumber` is the column one past the name, so the parenthesis is
  // the first `(` after it. Whitespace between the two is allowed, and a call
  // may put the parenthesis on the next line.
  let openParen = getIndex(text, call.lineNumber, call.endColumnNumber)

  while (openParen < text.length && /\s/.test(text[openParen])) openParen++

  if (text[openParen] !== '(') return null

  const parameters: MacroCallParameter[] = []
  let depth = 0
  let quote: string | null = null
  let inComment = false
  let parameterStart = openParen + 1
  let index = openParen + 1

  const closeParameter = (end: number) => {
    const parameter = text.slice(parameterStart, end)
    parameters.push({
      text: parameter,
      isKeyword: keywordParameter.test(parameter.replace(leadingComment, '')),
      start: parameterStart,
      end
    })
  }

  while (index < text.length) {
    const char = text[index]

    if (inComment) {
      if (text.startsWith('*/', index)) {
        inComment = false
        index += 2
        continue
      }
      index++
      continue
    }

    if (quote) {
      if (char === quote) quote = null
      index++
      continue
    }

    maskingFunction.lastIndex = index
    if (maskingFunction.test(text)) {
      index = skipMasked(text, maskingFunction.lastIndex - 1)
      continue
    }

    if (text.startsWith('/*', index)) {
      inComment = true
      index += 2
      continue
    }

    if (char === "'" || char === '"') {
      quote = char
      index++
      continue
    }

    if (char === '(') {
      depth++
      index++
      continue
    }

    if (char === ')') {
      if (depth) {
        depth--
        index++
        continue
      }

      closeParameter(index)

      const lineEnd = text.indexOf('\n', index)
      const afterClose = text.slice(
        index + 1,
        lineEnd === -1 ? text.length : lineEnd
      )

      return {
        openParen,
        closeParen: index,
        unclosed: null,
        parameters,
        afterClose
      }
    }

    if (char === ',' && !depth) {
      closeParameter(index)
      parameterStart = index + 1
      index++
      continue
    }

    index++
  }

  return {
    openParen,
    closeParen: -1,
    unclosed: inComment ? 'comment' : quote ? 'quote' : 'parenthesis',
    parameters,
    afterClose: ''
  }
}
