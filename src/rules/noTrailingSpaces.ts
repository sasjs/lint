import { LineLintRule } from '../types/LintRule'
import { LintRuleType } from '../types/LintRuleType'

const name = 'noTrailingSpaces'
const description = 'Disallow trailing spaces on lines.'
const warning = 'Line contains trailing spaces'
const test = (value: string, lineNumber: number) =>
  value.trimEnd() === value
    ? []
    : [{ warning, lineNumber, columnNumber: value.trimEnd().length + 1 }]

export const noTrailingSpaces: LineLintRule = {
  type: LintRuleType.Line,
  name,
  description,
  warning,
  test
}
