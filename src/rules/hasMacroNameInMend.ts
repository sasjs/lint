import { Diagnostic } from '../types/Diagnostic'
import { FileLintRule } from '../types/LintRule'
import { LintRuleType } from '../types/LintRuleType'
import { Severity } from '../types/Severity'

const name = 'hasMacroNameInMend'
const description = 'The %mend statement should contain the macro name'
const message = '$mend statement missing or incorrect'
const test = (value: string) => {
  const diagnostics: Diagnostic[] = []

  const statements: string[] = value ? value.split(';') : []

  const stack: string[] = []
  statements.forEach((statement, index) => {
    const trimmedStatement = trimComments(statement).trim()
    if (trimmedStatement.startsWith('%macro ')) {
      const macroName = trimmedStatement
        .split(' ')
        .filter((s: string) => !!s)[1]
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
            getColNumber(statement, macroName) + macroName.length,
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

const trimComments = (statement: string): string => {
  let trimmed = statement.trim()

  if (trimmed.startsWith('/*'))
    trimmed = (trimmed.split('*/').pop() as string).trim()

  return trimmed
}

const getLineNumber = (statements: string[], index: number): number => {
  const combinedCode = statements.slice(0, index).join(';')
  const lines = (combinedCode.match(/\n/g) || []).length + 1
  return lines
}

const getColNumber = (statement: string, text: string): number => {
  return (statement.split('\n').pop() as string).indexOf(text) + 1
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
