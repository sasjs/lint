import { LineLintRule } from '../types/LintRule'
import { LintRuleType } from '../types/LintRuleType'
import { Severity } from '../types/Severity'

const name = 'noTrailingSpaces'
const description = 'Disallow trailing spaces on lines.'
const message = 'Line contains trailing spaces'
const test = (value: string, lineNumber: number) =>
  value.trimEnd() === value
    ? []
    : [
        {
          message,
          lineNumber,
          startColumnNumber: value.trimEnd().length + 1,
          endColumnNumber: value.length,
          severity: Severity.Warning
        }
      ]

/**
 * Lint rule that checks for the presence of trailing space(s) in a given line of text.
 */
export const noTrailingSpaces: LineLintRule = {
  type: LintRuleType.Line,
  name,
  description,
  message,
  test
}
