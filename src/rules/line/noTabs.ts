import { LintConfig } from '../../types'
import { LineLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { getIndicesOf } from '../../utils'

const name = 'noTabs'
const alias = 'noTabIndentation'
const description = 'Disallow indenting with tabs.'
const message = 'Line contains tab indentation'

const test = (value: string, lineNumber: number, config?: LintConfig) => {
  const severity =
    config?.severityLevel[name] ||
    config?.severityLevel[alias] ||
    Severity.Warning

  const indices = getIndicesOf('\t', value)

  return indices.map((index) => ({
    message,
    lineNumber,
    startColumnNumber: index + 1,
    endColumnNumber: index + 2,
    severity
  }))
}

/**
 * Lint rule that checks if a given line of text is indented with a tab.
 */
export const noTabs: LineLintRule = {
  type: LintRuleType.Line,
  name,
  description,
  message,
  test
}
