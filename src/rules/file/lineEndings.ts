import { Diagnostic, LintConfig } from '../../types'
import { LineEndings } from '../../types/LineEndings'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'

const name = 'lineEndings'
const description =
  'Ensures every line, including the last, ends with the configured line ending.'
const message = 'Incorrect line ending - {actual} instead of {expected}'
const missingMessage = 'File does not end with a {expected} line ending'

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
  const severity = config?.severityLevel[name] || Severity.Warning

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
        severity
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
            severity
          })
        }
      })
    }
  })

  // The end of the file is a line boundary too, so a last line with no
  // terminator at all is a violation of this rule, not a separate concern.
  // Gate on ANY terminator being present: a wrong-style terminator at the end
  // is already reported by the loop above, and reporting it here as well would
  // give one byte two diagnostics, at a line past the end of the file.
  if (value.length > 0 && !value.endsWith('\n')) {
    const lastLines = value.split(/\r\n|\n/)
    const lastLine = lastLines[lastLines.length - 1]

    diagnostics.push({
      message: missingMessage.replace(
        '{expected}',
        expectedLineEnding === '{lf}' ? 'LF' : 'CRLF'
      ),
      lineNumber: lastLines.length,
      startColumnNumber: lastLine.length + 1,
      endColumnNumber: lastLine.length + 2,
      severity
    })
  }

  return diagnostics
}

const fix = (value: string, config?: LintConfig): string => {
  const lineEndingConfig = config?.lineEndings || LineEndings.LF

  const converted = value
    .replace(/\r\n/g, '{crlf}')
    .replace(/\n/g, '{lf}')
    .replace(/{crlf}/g, lineEndingConfig === LineEndings.LF ? '\n' : '\r\n')
    .replace(/{lf}/g, lineEndingConfig === LineEndings.LF ? '\n' : '\r\n')

  const expectedCharacter = lineEndingConfig === LineEndings.LF ? '\n' : '\r\n'

  if (converted.length === 0 || converted.endsWith(expectedCharacter)) {
    return converted
  }

  return converted + expectedCharacter
}

/**
 * Lint rule that checks if line endings in a file match the configured type,
 * including the line ending at the end of the file.
 */
export const lineEndings: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test,
  fix
}
