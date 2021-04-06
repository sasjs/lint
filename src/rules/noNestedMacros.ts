import { Diagnostic } from '../types/Diagnostic'
import { FileLintRule } from '../types/LintRule'
import { LintRuleType } from '../types/LintRuleType'
import { Severity } from '../types/Severity'
import { trimComments } from '../utils/trimComments'
import { getLineNumber } from '../utils/getLineNumber'
import { getColNumber } from '../utils/getColNumber'

const name = 'noNestedMacros'
const description = 'Defining nested macro is not good practice'
const message = 'Macro definition present inside another macro'
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
      if (stack.length) {
        const parentMacro = stack.slice(-1).pop()
        diagnostics.push({
          message: `${message} '${parentMacro}'`,
          lineNumber: getLineNumber(statements, index + 1),
          startColumnNumber: getColNumber(statement, '%macro'),
          endColumnNumber:
            getColNumber(statement, '%macro') + trimmedStatement.length,
          severity: Severity.Warning
        })
      }
      stack.push(macroName)
    } else if (trimmedStatement.startsWith('%mend')) {
      stack.pop()
    }
  })
  return diagnostics
}

/**
 * Lint rule that checks for the presence of macro name in %mend statement.
 */
export const noNestedMacros: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
