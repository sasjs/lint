import { PathLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import path from 'path'
import { LintConfig } from '../../types'

const name = 'noSpacesInFileNames'
const description = 'Enforce the absence of spaces within file names.'
const message = 'File name contains spaces'

const test = (value: string, config?: LintConfig) => {
  const severity = config?.severityLevel[name] || Severity.Warning
  const fileName = path.basename(value)

  if (fileName.includes(' ')) {
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
  return []
}

/**
 * Lint rule that checks for the absence of spaces in a given file name.
 */
export const noSpacesInFileNames: PathLintRule = {
  type: LintRuleType.Path,
  name,
  description,
  message,
  test
}
