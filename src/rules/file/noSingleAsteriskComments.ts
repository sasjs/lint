import { Diagnostic, LintConfig } from '../../types'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'

const name = 'noSingleAsteriskComments'
const description =
  'Disallow comment statements that begin with a single asterisk (*).'
const message = 'Line contains a single asterisk comment'

/**
 * Matches the statements that open a data section. The `4` variants are
 * terminated by `;;;;`, the others by a semicolon.
 */
const dataSectionStart = /^(datalines4?|cards4?|parmcards4?)\s*;/i

/**
 * Matches the functions whose argument is data rather than code.
 */
const maskingFunctionStart = /^%(nrstr|str)\s*\(/i

/**
 * Matches the procedures whose `submit` block holds another language, so SAS
 * statement rules do not apply inside it.
 */
const embeddedLanguageProc = /^proc\s+(lua|groovy)\b/i

/**
 * Matches the statement that closes an embedded-language block.
 */
const embeddedLanguageEnd = /^endsubmit\s*;/i
const embeddedLanguageEndSearch = /endsubmit/i

const test = (value: string, config?: LintConfig): Diagnostic[] => {
  const severity = config?.severityLevel[name] || Severity.Warning
  const diagnostics: Diagnostic[] = []
  const length = value.length

  let index = 0
  let lineNumber = 1
  let columnNumber = 1
  let atStatementStart = true
  let embeddedProc = false

  /**
   * Advances the cursor to `target`, keeping the line and column counters in
   * step. Every branch that consumes a non-code region moves through here.
   */
  const advanceTo = (target: number) => {
    const limit = Math.min(target, length)
    while (index < limit) {
      if (value[index] === '\n') {
        lineNumber++
        columnNumber = 1
      } else {
        columnNumber++
      }
      index++
    }
  }

  while (index < length) {
    const char = value[index]

    if (char === '\n') {
      lineNumber++
      columnNumber = 1
      index++
      continue
    }

    if (char === '\r' || char === ' ' || char === '\t') {
      columnNumber++
      index++
      continue
    }

    if (char === ';') {
      atStatementStart = true
      columnNumber++
      index++
      continue
    }

    // Block comment - /* ... */
    if (char === '/' && value[index + 1] === '*') {
      let end = index + 2
      while (end < length && !(value[end] === '*' && value[end + 1] === '/')) {
        end++
      }
      advanceTo(Math.min(end + 2, length))
      continue
    }

    // Macro comment - %* ... ;
    if (char === '%' && value[index + 1] === '*') {
      let end = index + 2
      while (end < length && value[end] !== ';') end++
      advanceTo(Math.min(end + 1, length))
      continue
    }

    // Masking functions - the argument is data, not code. `%(` and `%)` are
    // the escapes for literal parentheses inside the argument, so they do not
    // affect the nesting depth.
    const maskingFunction = maskingFunctionStart.exec(value.slice(index))
    if (maskingFunction) {
      let depth = 0
      let end = index + maskingFunction[0].length - 1
      while (end < length) {
        if (
          value[end] === '%' &&
          (value[end + 1] === '(' || value[end + 1] === ')')
        ) {
          end += 2
          continue
        }
        if (value[end] === '(') depth++
        else if (value[end] === ')') {
          depth--
          if (depth === 0) {
            end++
            break
          }
        }
        end++
      }
      advanceTo(end)
      continue
    }

    // Quoted string literal - '' and "" are escaped quote characters.
    if (char === "'" || char === '"') {
      let end = index + 1
      while (end < length) {
        if (value[end] === char) {
          if (value[end + 1] === char) {
            end += 2
            continue
          }
          end++
          break
        }
        if (value[end] === '\n') break
        end++
      }
      advanceTo(end)
      continue
    }

    if (atStatementStart) {
      // Inside a proc lua / proc groovy submit block - the code is another
      // language, so SAS statement rules do not apply to it.
      if (embeddedProc) {
        const endSubmit = embeddedLanguageEnd.exec(value.slice(index))
        if (endSubmit) {
          embeddedProc = false
          advanceTo(index + endSubmit[0].length)
          atStatementStart = true
          continue
        }
        advanceTo(index + value.slice(index).search(embeddedLanguageEndSearch))
        atStatementStart = true
        continue
      }

      // proc lua / proc groovy opens an embedded-language block. Only enter
      // the block when it is closed, so a stray `proc lua;` cannot swallow
      // the rest of the file.
      const embeddedProcStart = embeddedLanguageProc.exec(value.slice(index))
      if (
        embeddedProcStart &&
        embeddedLanguageEndSearch.test(value.slice(index))
      ) {
        embeddedProc = true
        advanceTo(index + embeddedProcStart[0].length)
        atStatementStart = false
        continue
      }

      // A data section - everything up to its terminating line is data, not
      // code. The terminator is a line containing only the `;` or `;;;;`.
      const dataSection = dataSectionStart.exec(value.slice(index))
      if (dataSection) {
        const terminator = /4/.test(dataSection[1]) ? ';;;;' : ';'
        let lineStart = index + dataSection[0].length
        let end = length
        while (lineStart <= length) {
          const lineEnd = value.indexOf('\n', lineStart)
          const actualEnd = lineEnd === -1 ? length : lineEnd
          if (value.slice(lineStart, actualEnd).trim() === terminator) {
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
        diagnostics.push({
          message,
          lineNumber,
          startColumnNumber: columnNumber,
          endColumnNumber: columnNumber + 1,
          severity
        })
        let end = index + 1
        while (end < length && value[end] !== ';') end++
        advanceTo(end + 1)
        atStatementStart = true
        continue
      }
    }

    atStatementStart = false
    columnNumber++
    index++
  }

  return diagnostics
}

/**
 * Lint rule that checks for SAS comment statements that begin with a single
 * asterisk, such as `* some text;`. These are easy to mistype and should be
 * written as block comments instead.
 */
export const noSingleAsteriskComments: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
