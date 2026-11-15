import { LintConfig } from '../types'

/**
 * A macro invocation found in a file, with the position of its `%` character.
 */
export interface MacroCall {
  name: string
  lineNumber: number
  startColumnNumber: number
  endColumnNumber: number
  /** True when the token sits inside a single-quoted string. */
  quoted?: boolean
  /** True when an opening parenthesis follows the name. */
  hasParen?: boolean
}

/**
 * Options for the scan.
 */
export interface MacroCallScanOptions {
  /**
   * Reports the invocations written inside the argument of a masking function
   * (`%str` / `%nrstr`).
   *
   * The argument is text while the masking function runs, but the caller
   * normally unquotes it later: `%mp_assert(iftrue=%str(%mf_existds(work.x)=1))`
   * resolves `%mf_existds` when `%mp_assert` evaluates the condition. A caller
   * that asks which macros a file uses - the `noUnusedMacros` side - sets this.
   * A caller that asks which macros a file invokes in open code leaves it off,
   * so text a file masks only in order to print it is not reported.
   */
  includeMasked?: boolean
}

/** Matches a macro invocation at the start of the supplied text. */
const macroNameStart = /^%([a-z_][a-z0-9_]*)/i

/** Matches the statements that open a data section. */
const dataSectionStart = /^(datalines4?|cards4?|parmcards4?)\s*;/i

/** Matches the functions whose argument is data rather than code. */
const maskingFunctionStart = /^%(nrstr|str)\s*\(/i

/** Matches the procedures whose `submit` block holds another language. */
const embeddedLanguageProc = /^proc\s+(lua|groovy)\b/i

/** Matches the statement that closes an embedded-language block. */
const embeddedLanguageEnd = /^endsubmit\s*;/i
const embeddedLanguageEndSearch = /endsubmit/i

/**
 * Finds the `%name` tokens inside a region that is text rather than code - the
 * argument of a masking function, or the body of a single-quoted string.
 *
 * Since the region is text, a quote or a comment marker in it opens nothing.
 * The scan therefore recognises only the escapes `%(` / `%)` and a `%name`
 * token, and it does not report a `%name:` label.
 *
 * @param {string} text - the whole file.
 * @param {number} from - the offset at which the region starts.
 * @param {number} to - the offset at which it ends.
 * @returns {{ name: string; offset: number }[]} the tokens, in order.
 */
const findNameTokens = (
  text: string,
  from: number,
  to: number
): { name: string; offset: number; hasParen: boolean }[] => {
  const tokens: { name: string; offset: number; hasParen: boolean }[] = []
  let index = from

  while (index < to) {
    if (text[index] === '%') {
      if (text[index + 1] === '(' || text[index + 1] === ')') {
        index += 2
        continue
      }

      const macroName = macroNameStart.exec(text.slice(index, to))
      if (macroName) {
        const after = text.slice(index + macroName[0].length, to)
        const isLabel = after.startsWith(':')

        if (!isLabel) {
          // Reported, not filtered: whether a bare name in a string is a call
          // is the reporting rule's decision, and a use that goes unseen costs
          // a declaration.
          tokens.push({
            name: macroName[1],
            offset: index,
            hasParen: /^\s*\(/.test(after)
          })
        }
        index += macroName[0].length
        continue
      }
    }

    index++
  }

  return tokens
}

/**
 * Finds the macro invocations in a file.
 *
 * SAS resolves macro triggers inside double-quoted strings but not inside
 * single-quoted strings, so a double-quoted string is scanned as code while a
 * single-quoted string is opaque. Invocations inside block comments, macro
 * comments, comment statements, data sections and embedded-language `submit`
 * blocks are excluded. The argument of a masking function (`%str` / `%nrstr`)
 * is excluded unless the caller asks for it with `includeMasked`.
 *
 * Every `%name` token is reported, including the macro language keywords and
 * the macros that ship with SAS. Callers decide which names are interesting.
 *
 * @param {string} text - the text content to scan.
 * @param {LintConfig} config - the lint configuration. It is accepted for
 * symmetry with the other utilities and is not used by the scan.
 * @param {MacroCallScanOptions} options - how much of the masked text to scan.
 * The default skips the argument of a masking function; `includeMasked` scans
 * it for invocations.
 * @returns {MacroCall[]} the invocations, in the order they appear.
 */
export const parseMacroCalls = (
  text: string,
  config?: LintConfig,
  options?: MacroCallScanOptions
): MacroCall[] => {
  const calls: MacroCall[] = []
  if (!text) return calls

  const length = text.length

  let index = 0
  let lineNumber = 1
  let columnNumber = 1
  let atStatementStart = true
  let inDoubleQuote = false

  /**
   * Advances the cursor to `target`, keeping the line and column counters in
   * step. Every branch that consumes a non-code region moves through here.
   */
  const advanceTo = (target: number) => {
    const limit = Math.min(target, length)
    while (index < limit) {
      if (text[index] === '\n') {
        lineNumber++
        columnNumber = 1
      } else {
        columnNumber++
      }
      index++
    }
  }

  while (index < length) {
    const char = text[index]

    if (char === '\n') {
      lineNumber++
      columnNumber = 1
      inDoubleQuote = false
      index++
      continue
    }

    if (char === '\r' || char === ' ' || char === '\t') {
      columnNumber++
      index++
      continue
    }

    // Single-quoted string - SAS resolves no macro trigger in it, so it is
    // data. The scan matches straight to the next quote: SAS also treats a
    // doubled quote as an escaped character, but a pair either closes and
    // reopens the string or is skipped, and both leave every character after
    // it in the same state, so modelling the escape changes nothing that can
    // be observed here. An apostrophe inside a double-quoted string is
    // ordinary text. A caller that asks which macros the file uses still wants
    // the invocations in it, because code that generates code submits this
    // text later, so its invocations are reported.
    if (char === "'") {
      if (inDoubleQuote) {
        columnNumber++
        index++
        continue
      }
      let end = index + 1
      while (end < length) {
        if (text[end] === "'") {
          end++
          break
        }
        if (text[end] === '\n') break
        end++
      }
      findNameTokens(text, index + 1, end).forEach((token) => {
        advanceTo(token.offset)
        calls.push({
          name: token.name,
          lineNumber,
          startColumnNumber: columnNumber,
          endColumnNumber: columnNumber + 1 + token.name.length,
          quoted: true,
          hasParen: token.hasParen
        })
      })
      advanceTo(end)
      continue
    }

    // Double-quoted string - SAS resolves macro triggers inside it, so the
    // scan continues until the closing quote.
    if (char === '"') {
      inDoubleQuote = !inDoubleQuote
      columnNumber++
      index++
      continue
    }

    if (!inDoubleQuote) {
      if (char === ';') {
        atStatementStart = true
        columnNumber++
        index++
        continue
      }

      // Block comment - /* ... */
      if (char === '/' && text[index + 1] === '*') {
        let end = index + 2
        while (end < length && !(text[end] === '*' && text[end + 1] === '/')) {
          end++
        }
        advanceTo(Math.min(end + 2, length))
        continue
      }
    }

    if (char === '%') {
      // Macro comment - %* ... ;
      if (text[index + 1] === '*') {
        let end = index + 2
        while (end < length && text[end] !== ';') end++
        advanceTo(Math.min(end + 1, length))
        continue
      }

      // Masking functions - the argument is data, not code. `%(` and `%)` are
      // the escapes for literal parentheses inside the argument, so they do
      // not affect the nesting depth. When the caller asks for masked text,
      // the function name is skipped and the argument is scanned in place, so
      // an invocation the file defers is still reported at its own position.
      const maskingFunction = maskingFunctionStart.exec(text.slice(index))
      if (maskingFunction) {
        // The extent of the argument comes from the parenthesis depth, with
        // `%(` and `%)` treated as escapes rather than as delimiters.
        let depth = 0
        let end = index + maskingFunction[0].length - 1
        while (end < length) {
          if (
            text[end] === '%' &&
            (text[end + 1] === '(' || text[end + 1] === ')')
          ) {
            end += 2
            continue
          }
          if (text[end] === '(') depth++
          else if (text[end] === ')') {
            depth--
            if (depth === 0) {
              end++
              break
            }
          }
          end++
        }

        if (options?.includeMasked) {
          // The argument is scanned for `%name` tokens only, never as code: a
          // quote or a comment marker in it is data to SAS, and letting one
          // open a string or a comment here would swallow the invocations that
          // follow - which under-counts uses, the direction that makes the
          // formatter delete a declaration the file needs.
          const argumentStart = index + maskingFunction[0].length

          advanceTo(argumentStart)
          findNameTokens(text, argumentStart, end).forEach((token) => {
            advanceTo(token.offset)
            calls.push({
              name: token.name,
              lineNumber,
              startColumnNumber: columnNumber,
              endColumnNumber: columnNumber + 1 + token.name.length
            })
          })
        }

        advanceTo(end)
        atStatementStart = false
        continue
      }

      const macroName = macroNameStart.exec(text.slice(index))
      if (macroName) {
        // A macro statement label - `%label:` - is not an invocation.
        if (text[index + macroName[0].length] !== ':') {
          calls.push({
            name: macroName[1],
            lineNumber,
            startColumnNumber: columnNumber,
            endColumnNumber: columnNumber + 1 + macroName[1].length
          })
        }
        advanceTo(index + macroName[0].length)
        atStatementStart = false
        continue
      }
    }

    if (atStatementStart && !inDoubleQuote) {
      // A proc lua / proc groovy submit block holds another language, so its
      // body is skipped. The block is only entered when an `endsubmit`
      // statement closes it, so a stray `proc lua;` cannot swallow the rest
      // of the file.
      const embeddedProcStart = embeddedLanguageProc.exec(text.slice(index))
      if (
        embeddedProcStart &&
        embeddedLanguageEndSearch.test(text.slice(index))
      ) {
        const afterProc = index + embeddedProcStart[0].length
        const offset = text.slice(afterProc).search(embeddedLanguageEndSearch)
        const endSubmit = embeddedLanguageEnd.exec(
          text.slice(afterProc + offset)
        )
        advanceTo(endSubmit ? afterProc + offset + endSubmit[0].length : length)
        atStatementStart = true
        continue
      }

      // A data section - everything up to its terminating line is data, not
      // code. The terminator is a line containing only the `;` or `;;;;`.
      const dataSection = dataSectionStart.exec(text.slice(index))
      if (dataSection) {
        const terminator = /4/.test(dataSection[1]) ? ';;;;' : ';'
        let lineStart = index + dataSection[0].length
        let end = length
        while (lineStart <= length) {
          const lineEnd = text.indexOf('\n', lineStart)
          const actualEnd = lineEnd === -1 ? length : lineEnd
          if (text.slice(lineStart, actualEnd).trim() === terminator) {
            end = actualEnd
            break
          }
          if (lineEnd === -1) break
          lineStart = lineEnd + 1
        }
        advanceTo(end)
        atStatementStart = true
        continue
      }

      // A comment statement - its body is opaque up to the terminating `;`.
      if (char === '*') {
        let end = index + 1
        while (end < length && text[end] !== ';') end++
        advanceTo(end + 1)
        atStatementStart = true
        continue
      }
    }

    atStatementStart = false
    columnNumber++
    index++
  }

  return calls
}
