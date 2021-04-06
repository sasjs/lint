import { Diagnostic } from '../types/Diagnostic'
import { FileLintRule } from '../types/LintRule'
import { LintRuleType } from '../types/LintRuleType'
import { Severity } from '../types/Severity'
import { trimComments } from '../utils/trimComments'
import { getLineNumber } from '../utils/getLineNumber'
import { getColNumber } from '../utils/getColNumber'

const name = 'hasMacroNameInMend'
const description = 'The %mend statement should contain the macro name'
const message = '$mend statement missing or incorrect'
const test = (value: string) => {
  const diagnostics: Diagnostic[] = []

  const statements: string[] = value ? value.split(';') : []

  const stack: string[] = []
  let trimmedStatement = '',
    commentStarted = false
  statements.forEach((statement, index) => {
    ;({ statement: trimmedStatement, commentStarted } = trimComments(
      statement,
      commentStarted
    ))

    if (trimmedStatement.startsWith('%macro ')) {
      const macroName = trimmedStatement
        .slice(7, trimmedStatement.length)
        .trim()
        .split('(')[0]
      stack.push(macroName)
    } else if (trimmedStatement.startsWith('%mend')) {
      const macroStarted = stack.pop()
      const macroName = trimmedStatement
        .split(' ')
        .filter((s: string) => !!s)[1]

      if (!macroName) {
        diagnostics.push({
          message: '%mend missing macro name',
          lineNumber: getLineNumber(statements, index + 1),
          startColumnNumber: getColNumber(statement, '%mend'),
          endColumnNumber: getColNumber(statement, '%mend') + 6,
          severity: Severity.Warning
        })
      } else if (macroName !== macroStarted) {
        diagnostics.push({
          message: 'mismatch macro name in %mend statement',
          lineNumber: getLineNumber(statements, index + 1),
          startColumnNumber: getColNumber(statement, macroName),
          endColumnNumber:
            getColNumber(statement, macroName) + macroName.length - 1,
          severity: Severity.Warning
        })
      }
    }
  })
  if (stack.length) {
    diagnostics.push({
      message: 'missing %mend statement for macro(s)',
      lineNumber: statements.length + 1,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    })
  }
  return diagnostics
}

/**
 * Lint rule that checks for the presence of macro name in %mend statement.
 */
export const hasMacroNameInMend: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
