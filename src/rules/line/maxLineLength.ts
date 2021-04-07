import { LintConfig } from '../../types'
import { LineLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'

const name = 'maxLineLength'
const description = 'Restrict lines to the specified length.'
const message = 'Line exceeds maximum length'
const test = (value: string, lineNumber: number, config?: LintConfig) => {
  const maxLineLength = config?.maxLineLength || 80
  if (value.length <= maxLineLength) return []
  return [
    {
      message: `${message} by ${value.length - maxLineLength} characters`,
      lineNumber,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
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
