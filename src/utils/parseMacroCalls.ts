import { LintConfig } from '../types'

/**
 * A macro invocation found in a file, with the position of its `%` character.
 */
export interface MacroCall {
  name: string
  lineNumber: number
  startColumnNumber: number
  endColumnNumber: number
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
 * Finds the macro invocations in a file.
 *
 * SAS resolves macro triggers inside double-quoted strings but not inside
 * single-quoted strings, so a double-quoted string is scanned as code while a
 * single-quoted string is opaque. Invocations inside block comments, macro
 * comments, comment statements, masking functions (`%str` / `%nrstr`), data
 * sections and embedded-language `submit` blocks are excluded.
 *
 * Every `%name` token is reported, including the macro language keywords and
 * the macros that ship with SAS. Callers decide which names are interesting.
 *
 * @param {string} text - the text content to scan.
 * @param {LintConfig} config - the lint configuration. It is accepted for
 * symmetry with the other utilities and is not used by the scan.
 * @returns {MacroCall[]} the invocations, in the order they appear.
 */
export const parseMacroCalls = (
  text: string,
  config?: LintConfig
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

    // Single-quoted string - opaque. `''` is an escaped quote character. An
    // apostrophe inside a double-quoted string is ordinary text.
    if (char === "'") {
      if (inDoubleQuote) {
        columnNumber++
        index++
        continue
      }
      let end = index + 1
      while (end < length) {
        if (text[end] === "'") {
          if (text[end + 1] === "'") {
            end += 2
            continue
          }
          end++
          break
        }
        if (text[end] === '\n') break
        end++
      }
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
      // not affect the nesting depth.
      const maskingFunction = maskingFunctionStart.exec(text.slice(index))
      if (maskingFunction) {
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
