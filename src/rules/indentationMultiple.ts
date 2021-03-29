import { LintConfig } from '../types'
import { LineLintRule } from '../types/LintRule'
import { LintRuleType } from '../types/LintRuleType'
import { Severity } from '../types/Severity'

const name = 'indentationMultiple'
const description = 'Ensure indentation by a multiple of the configured number.'
const message = 'Line has incorrect indentation'
const test = (value: string, lineNumber: number, config?: LintConfig) => {
  if (!value.startsWith(' ')) return []

  const indentationMultiple = config?.indentationMultiple || 2
  const numberOfSpaces = value.search(/\S|$/)
  if (numberOfSpaces % indentationMultiple === 0) return []
  return [
    {
      message: `${message} - ${numberOfSpaces} ${
        numberOfSpaces === 1 ? 'space' : 'spaces'
      }`,
      lineNumber,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    }
  ]
}

/**
 * Lint rule that checks if a line is indented by a multiple of the configured indentation multiple.
 */
export const indentationMultiple: LineLintRule = {
  type: LintRuleType.Line,
  name,
  description,
  message,
  test
}
