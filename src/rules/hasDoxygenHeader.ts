import { FileLintRule } from '../types/LintRule'
import { LintRuleType } from '../types/LintRuleType'

const name = 'hasDoxygenHeader'
const description =
  'Enforce the presence of a Doxygen header at the start of each file.'
const warning = 'File missing Doxygen header'
const test = (value: string) => {
  try {
    const hasFileHeader = value.split('/**')[0] !== value
    if (hasFileHeader) return []
    return [{ warning, lineNumber: 1, columnNumber: 1 }]
  } catch (e) {
    return [{ warning, lineNumber: 1, columnNumber: 1 }]
  }
}

export const hasDoxygenHeader: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  warning,
  test
}
