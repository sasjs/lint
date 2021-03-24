import { LineLintRule } from '../types/LintRule'
import { LintRuleType } from '../types/LintRuleType'
import { Severity } from '../types/Severity'

const name = 'noEncodedPasswords'
const description = 'Disallow encoded passwords in SAS code.'
const message = 'Line contains encoded password'
const test = (value: string, lineNumber: number) => {
  const regex = new RegExp(/{sas(\d{2,4}|enc)}[^;"'\s]*/, 'gi')
  const matches = value.match(regex)
  if (!matches || !matches.length) return []
  return matches.map((match) => ({
    message,
    lineNumber,
    startColumnNumber: value.indexOf(match) + 1,
    endColumnNumber: value.indexOf(match) + match.length + 1,
    severity: Severity.Error
  }))
}

/**
 * Lint rule that checks for the presence of encoded password(s) in a given line of text.
 */
export const noEncodedPasswords: LineLintRule = {
  type: LintRuleType.Line,
  name,
  description,
  message,
  test
}
