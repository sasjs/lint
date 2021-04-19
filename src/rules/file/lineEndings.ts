import { Diagnostic, LintConfig } from '../../types'
import { LineEndings } from '../../types/LineEndings'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'

const name = 'lineEndings'
const description = 'Ensures line endings conform to the configured type.'
const message = 'Incorrect line ending - {actual} instead of {expected}'
const test = (value: string, config?: LintConfig) => {
  const lineEndingConfig = config?.lineEndings || LineEndings.LF
  const expectedLineEnding =
    lineEndingConfig === LineEndings.LF ? '{lf}' : '{crlf}'
  const incorrectLineEnding = expectedLineEnding === '{lf}' ? '{crlf}' : '{lf}'

  const lines = value
    .replace(/\r\n/g, '{crlf}')
    .replace(/\n/g, '{lf}')
    .split(new RegExp(`(?<=${expectedLineEnding})`))
  const diagnostics: Diagnostic[] = []

  let indexOffset = 0
  lines.forEach((line, index) => {
    if (line.endsWith(incorrectLineEnding)) {
      diagnostics.push({
        message: message
          .replace('{expected}', expectedLineEnding === '{lf}' ? 'LF' : 'CRLF')
          .replace('{actual}', incorrectLineEnding === '{lf}' ? 'LF' : 'CRLF'),
        lineNumber: index + 1 + indexOffset,
        startColumnNumber: line.indexOf(incorrectLineEnding),
        endColumnNumber: line.indexOf(incorrectLineEnding) + 1,
        severity: Severity.Warning
      })
    } else {
      const splitLine = line.split(new RegExp(`(?<=${incorrectLineEnding})`))
      if (splitLine.length > 1) {
        indexOffset += splitLine.length - 1
      }
      splitLine.forEach((l, i) => {
        if (l.endsWith(incorrectLineEnding)) {
          diagnostics.push({
            message: message
              .replace(
                '{expected}',
                expectedLineEnding === '{lf}' ? 'LF' : 'CRLF'
              )
              .replace(
                '{actual}',
                incorrectLineEnding === '{lf}' ? 'LF' : 'CRLF'
              ),
            lineNumber: index + i + 1,
            startColumnNumber: l.indexOf(incorrectLineEnding),
            endColumnNumber: l.indexOf(incorrectLineEnding) + 1,
            severity: Severity.Warning
          })
        }
      })
    }
  })
  return diagnostics
}

const fix = (value: string, config?: LintConfig): string => {
  const lineEndingConfig = config?.lineEndings || LineEndings.LF

  return value
    .replace(/\r\n/g, '{crlf}')
    .replace(/\n/g, '{lf}')
    .replace(/{crlf}/g, lineEndingConfig === LineEndings.LF ? '\n' : '\r\n')
    .replace(/{lf}/g, lineEndingConfig === LineEndings.LF ? '\n' : '\r\n')
}

/**
 * Lint rule that checks if line endings in a file match the configured type.
 */
export const lineEndings: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test,
  fix
}
