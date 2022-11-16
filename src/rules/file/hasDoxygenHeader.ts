import { LintConfig } from '../../types'
import { LineEndings } from '../../types/LineEndings'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { DefaultLintConfiguration } from '../../utils/getLintConfig'

const name = 'hasDoxygenHeader'
const description =
  'Enforce the presence of a Doxygen header at the start of each file.'
const message = 'File missing Doxygen header'
const messageForSingleAsterisk =
  'File not following Doxygen header style, use double asterisks'

const test = (value: string, config?: LintConfig) => {
  const lineEnding = config?.lineEndings === LineEndings.CRLF ? '\r\n' : '\n'
  const severity = config?.severityLevel[name] || Severity.Warning

  try {
    const hasFileHeader = value.trimStart().startsWith('/**')
    if (hasFileHeader) return []

    const hasFileHeaderWithSingleAsterisk = value.trimStart().startsWith('/*')
    if (hasFileHeaderWithSingleAsterisk)
      return [
        {
          message: messageForSingleAsterisk,
          lineNumber:
            (value.split('/*')![0]!.match(new RegExp(lineEnding, 'g')) ?? [])
              .length + 1,
          startColumnNumber: 1,
          endColumnNumber: 1,
          severity
        }
      ]

    return [
      {
        message,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity
      }
    ]
  } catch (e) {
    return [
      {
        message,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity
      }
    ]
  }
}

const fix = (value: string, config?: LintConfig): string => {
  const result = test(value, config)
  if (result.length === 0) {
    return value
  } else if (result[0].message == messageForSingleAsterisk)
    return value.replace('/*', '/**')

  config = config || new LintConfig(DefaultLintConfiguration)
  const lineEndingConfig = config?.lineEndings || LineEndings.LF
  const lineEnding = lineEndingConfig === LineEndings.LF ? '\n' : '\r\n'

  return `${config?.defaultHeader.replace(
    /{lineEnding}/g,
    lineEnding
  )}${lineEnding}${value}`
}

/**
 * Lint rule that checks for the presence of a Doxygen header in a given file.
 */
export const hasDoxygenHeader: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test,
  fix
}
