import { Diagnostic } from '../types/Diagnostic'
import { FileLintRule } from '../types/LintRule'
import { LintRuleType } from '../types/LintRuleType'
import { Severity } from '../types/Severity'
import { trimComments } from '../utils/trimComments'
import { getLineNumber } from '../utils/getLineNumber'
import { getColumnNumber } from '../utils/getColumnNumber'

const name = 'hasMacroNameInMend'
const description =
  'Enforces the presence of the macro name in each %mend statement.'
const message = '%mend statement has missing or incorrect macro name'
const test = (value: string) => {
  const diagnostics: Diagnostic[] = []

  const statements: string[] = value ? value.split(';') : []

  const declaredMacros: { name: string; lineNumber: number }[] = []
  let isCommentStarted = false
  statements.forEach((statement, index) => {
    const { statement: trimmedStatement, commentStarted } = trimComments(
      statement,
      isCommentStarted
    )
    isCommentStarted = commentStarted

    if (trimmedStatement.startsWith('%macro ')) {
      const macroName = trimmedStatement
        .slice(7, trimmedStatement.length)
        .trim()
        .split('(')[0]
      declaredMacros.push({
        name: macroName,
        lineNumber: getLineNumber(statements, index + 1)
      })
    } else if (trimmedStatement.startsWith('%mend')) {
      const declaredMacro = declaredMacros.pop()
      const macroName = trimmedStatement
        .split(' ')
        .filter((s: string) => !!s)[1]

      if (!macroName) {
        diagnostics.push({
          message: '%mend statement is missing macro name',
          lineNumber: getLineNumber(statements, index + 1),
          startColumnNumber: getColumnNumber(statement, '%mend'),
          endColumnNumber: getColumnNumber(statement, '%mend') + 6,
          severity: Severity.Warning
        })
      } else if (macroName !== declaredMacro!.name) {
        diagnostics.push({
          message: '%mend statement has mismatched macro name',
          lineNumber: getLineNumber(statements, index + 1),
          startColumnNumber: getColumnNumber(statement, macroName),
          endColumnNumber:
            getColumnNumber(statement, macroName) + macroName.length - 1,
          severity: Severity.Warning
        })
      }
    }
  })

  declaredMacros.forEach((declaredMacro) => {
    diagnostics.push({
      message: `Missing %mend statement for macro - ${declaredMacro.name}`,
      lineNumber: declaredMacro.lineNumber,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    })
  })

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
