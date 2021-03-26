import { PathLintRule } from '../types/LintRule'
import { LintRuleType } from '../types/LintRuleType'
import { Severity } from '../types/Severity'
import path from 'path'

const name = 'lowerCaseFileNames'
const description = 'Enforce the use of lower case file names.'
const message = 'File name contains uppercase characters'
const test = (value: string) => {
  const fileName = path.basename(value)
  if (fileName.toLocaleLowerCase() === fileName) return []
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

/**
 * Lint rule that checks for the absence of uppercase characters in a given file name.
 */
export const lowerCaseFileNames: PathLintRule = {
  type: LintRuleType.Path,
  name,
  description,
  message,
  test
}
