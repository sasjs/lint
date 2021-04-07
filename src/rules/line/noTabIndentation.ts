import { LineLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'

const name = 'noTabs'
const description = 'Disallow indenting with tabs.'
const message = 'Line is indented with a tab'
const test = (value: string, lineNumber: number) => {
  if (!value.startsWith('\t')) return []
  return [
    {
      message,
      lineNumber,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    }
  ]
}

/**
 * Lint rule that checks if a given line of text is indented with a tab.
 */
export const noTabIndentation: LineLintRule = {
  type: LintRuleType.Line,
  name,
  description,
  message,
  test
}
