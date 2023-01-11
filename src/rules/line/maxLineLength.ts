import { LintConfig } from '../../types'
import { LineLintRule, LineLintRuleOptions } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { DefaultLintConfiguration } from '../../utils'

const name = 'maxLineLength'
const description = 'Restrict lines to the specified length.'
const message = 'Line exceeds maximum length'

const test = (
  value: string,
  lineNumber: number,
  config?: LintConfig,
  options?: LineLintRuleOptions
) => {
  const severity = config?.severityLevel[name] || Severity.Warning
  let maxLineLength = DefaultLintConfiguration.maxLineLength

  if (config) {
    if (options?.isHeaderLine) {
      maxLineLength = Math.max(config.maxLineLength, config.maxHeaderLineLength)
    } else if (options?.isDataLine) {
      maxLineLength = Math.max(config.maxLineLength, config.maxDataLineLength)
    } else {
      maxLineLength = config.maxLineLength
    }
  }

  if (value.length <= maxLineLength) return []
  return [
    {
      message: `${message} by ${value.length - maxLineLength} characters`,
      lineNumber,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity
    }
  ]
}

/**
 * Lint rule that checks if a line has exceeded the configured maximum length.
 */
export const maxLineLength: LineLintRule = {
  type: LintRuleType.Line,
  name,
  description,
  message,
  test
}
