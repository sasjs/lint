import { Diagnostic } from '../../types/Diagnostic'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { trimComments } from '../../utils/trimComments'
import { getColumnNumber } from '../../utils/getColumnNumber'

const name = 'noNestedMacros'
const description = 'Enfoces the absence of nested macro definitions.'
const message = `Macro definition for '{macro}' present in macro '{parent}'`
const test = (value: string) => {
  const diagnostics: Diagnostic[] = []
  const declaredMacros: string[] = []

  const lines: string[] = value ? value.split('\n') : []
  let isCommentStarted = false
  lines.forEach((line, lineIndex) => {
    const { statement: trimmedLine, commentStarted } = trimComments(
      line,
      isCommentStarted
    )
    isCommentStarted = commentStarted
    const statements: string[] = trimmedLine ? trimmedLine.split(';') : []

    statements.forEach((statement) => {
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
            lineNumber: lineIndex + 1,
            startColumnNumber: getColumnNumber(line, '%macro'),
            endColumnNumber:
              getColumnNumber(line, '%macro') + trimmedStatement.length - 1,
            severity: Severity.Warning
          })
        }
        declaredMacros.push(macroName)
      } else if (trimmedStatement.startsWith('%mend')) {
        declaredMacros.pop()
      }
    })
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
