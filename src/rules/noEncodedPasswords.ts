import { LineLintRule } from '../types/LintRule'
import { LintRuleType } from '../types/LintRuleType'

const name = 'noEncodedPasswords'
const description = 'Disallow encoded passwords in SAS code.'
const warning = 'Line contains encoded password'
const test = (value: string, lineNumber: number) => {
  const regex = new RegExp(/{sas\d{2,4}}[^;"'\s]*/, 'gi')
  const matches = value.match(regex)
  if (!matches || !matches.length) return []
  return matches.map((match) => ({
    warning,
    lineNumber,
    columnNumber: value.indexOf(match) + 1
  }))
}

export const noEncodedPasswords: LineLintRule = {
  type: LintRuleType.Line,
  name,
  description,
  warning,
  test
}
