import { LintConfig } from '../../types'
import { LineLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { getIndicesOf } from '../../utils'

const name = 'noTabs'
const alias = 'noTabIndentation'
const description = 'Disallow indenting with tabs.'
const message = 'Line contains a tab character (09x)'

const test = (value: string, lineNumber: number, config?: LintConfig) => {
  // The deprecated alias `noTabIndentation` is honoured per file, so it is
  // checked before the `default` fallback, which applies to every rule.
  const severity =
    config?.severityLevel[name] ??
    config?.severityLevel[alias] ??
    config?.defaultSeverity ??
    Severity.Warning

  const indices = getIndicesOf('\t', value)

  return indices.map((index) => ({
    message,
    lineNumber,
    startColumnNumber: index + 1,
    endColumnNumber: index + 1,
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
