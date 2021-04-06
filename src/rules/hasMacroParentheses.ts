import { Diagnostic } from '../types/Diagnostic'
import { FileLintRule } from '../types/LintRule'
import { LintRuleType } from '../types/LintRuleType'
import { Severity } from '../types/Severity'
import { trimComments } from '../utils/trimComments'
import { getLineNumber } from '../utils/getLineNumber'
import { getColNumber } from '../utils/getColNumber'

const name = 'hasMacroParentheses'
const description = 'Macros are always defined with parentheses'
const message = 'Macro definition missing parentheses'
const test = (value: string) => {
  const diagnostics: Diagnostic[] = []

  const statements: string[] = value ? value.split(';') : []

  let trimmedStatement = '',
    commentStarted = false
  statements.forEach((statement, index) => {
    ;({ statement: trimmedStatement, commentStarted } = trimComments(
      statement,
      commentStarted
    ))

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
          startColumnNumber: getColNumber(statement, '%macro'),
          endColumnNumber: statement.length,
          severity: Severity.Warning
        })
      else if (macroNameDefinitionParts.length === 1)
        diagnostics.push({
          message,
          lineNumber: getLineNumber(statements, index + 1),
          startColumnNumber: getColNumber(statement, macroNameDefinition),
          endColumnNumber:
            getColNumber(statement, macroNameDefinition) +
            macroNameDefinition.length -
            1,
          severity: Severity.Warning
        })
      else if (macroName !== macroName.trim())
        diagnostics.push({
          message: 'Macro definition cannot have space',
          lineNumber: getLineNumber(statements, index + 1),
          startColumnNumber: getColNumber(statement, macroNameDefinition),
          endColumnNumber:
            getColNumber(statement, macroNameDefinition) +
            macroNameDefinition.length -
            1,
          severity: Severity.Warning
        })
    }
  })
  return diagnostics
}

/**
 * Lint rule that checks for the presence of macro name in %mend statement.
 */
export const hasMacroParentheses: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
