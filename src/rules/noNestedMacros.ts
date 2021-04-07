import { Diagnostic } from '../types/Diagnostic'
import { FileLintRule } from '../types/LintRule'
import { LintRuleType } from '../types/LintRuleType'
import { Severity } from '../types/Severity'
import { trimComments } from '../utils/trimComments'
import { getLineNumber } from '../utils/getLineNumber'
import { getColumnNumber } from '../utils/getColumnNumber'

const name = 'noNestedMacros'
const description = 'Enfoces the absence of nested macro definitions.'
const message = `Macro definition for '{macro}' present in macro '{parent}'`
const test = (value: string) => {
  const diagnostics: Diagnostic[] = []

  const statements: string[] = value ? value.split(';') : []

  const declaredMacros: string[] = []
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
      if (declaredMacros.length) {
        const parentMacro = declaredMacros.slice(-1).pop()
        diagnostics.push({
          message: message
            .replace('{macro}', macroName)
            .replace('{parent}', parentMacro!),
          lineNumber: getLineNumber(statements, index + 1),
          startColumnNumber: getColumnNumber(statement, '%macro'),
          endColumnNumber:
            getColumnNumber(statement, '%macro') + trimmedStatement.length - 1,
          severity: Severity.Warning
        })
      }
      declaredMacros.push(macroName)
    } else if (trimmedStatement.startsWith('%mend')) {
      declaredMacros.pop()
    }
  })
  return diagnostics
}

/**
 * Lint rule that checks for the absence of nested macro definitions.
 */
export const noNestedMacros: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
