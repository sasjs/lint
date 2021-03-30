import { FileLintRule } from '../types/LintRule'
import { LintRuleType } from '../types/LintRuleType'
import { Severity } from '../types/Severity'

const name = 'hasDoxygenHeader'
const description =
  'Enforce the presence of a Doxygen header at the start of each file.'
const message = 'File missing Doxygen header'
const test = (value: string) => {
  try {
    const hasFileHeader = value.trimStart().startsWith('/*')
    if (hasFileHeader) return []
    return [
      {
        message,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ]
  } catch (e) {
    return [
      {
        message,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ]
  }
}

/**
 * Lint rule that checks for the presence of a Doxygen header in a given file.
 */
export const hasDoxygenHeader: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
