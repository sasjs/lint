import { Diagnostic } from '../types/Diagnostic'
import { FileLintRule } from '../types/LintRule'
import { LintRuleType } from '../types/LintRuleType'
import { Severity } from '../types/Severity'
import { trimComments } from '../utils/trimComments'
import { getLineNumber } from '../utils/getLineNumber'
import { getColumnNumber } from '../utils/getColumnNumber'

const name = 'hasMacroParentheses'
const description = 'Enforces the presence of parantheses in macro definitions.'
const message = 'Macro definition missing parentheses'
const test = (value: string) => {
  const diagnostics: Diagnostic[] = []

  const statements: string[] = value ? value.split(';') : []

  let isCommentStarted = false
  statements.forEach((statement, index) => {
    const { statement: trimmedStatement, commentStarted } = trimComments(
      statement,
      isCommentStarted
    )
    isCommentStarted = commentStarted

    if (trimmedStatement.startsWith('%macro')) {
      const macroNameDefinition = trimmedStatement
        .slice(7, trimmedStatement.length)
        .trim()

      const macroNameDefinitionParts = macroNameDefinition.split('(')
      const macroName = macroNameDefinitionParts[0]

      if (!macroName)
        diagnostics.push({
          message: 'Macro definition missing name',
          lineNumber: getLineNumber(statements, index + 1),
          startColumnNumber: getColumnNumber(statement, '%macro'),
          endColumnNumber: statement.length,
          severity: Severity.Warning
        })
      else if (macroNameDefinitionParts.length === 1)
        diagnostics.push({
          message,
          lineNumber: getLineNumber(statements, index + 1),
          startColumnNumber: getColumnNumber(statement, macroNameDefinition),
          endColumnNumber:
            getColumnNumber(statement, macroNameDefinition) +
            macroNameDefinition.length -
            1,
          severity: Severity.Warning
        })
      else if (macroName !== macroName.trim())
        diagnostics.push({
          message: 'Macro definition contains space(s)',
          lineNumber: getLineNumber(statements, index + 1),
          startColumnNumber: getColumnNumber(statement, macroNameDefinition),
          endColumnNumber:
            getColumnNumber(statement, macroNameDefinition) +
            macroNameDefinition.length -
            1,
          severity: Severity.Warning
        })
    }
  })
  return diagnostics
}

/**
 * Lint rule that enforces the presence of parantheses in macro definitions..
 */
export const hasMacroParentheses: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
