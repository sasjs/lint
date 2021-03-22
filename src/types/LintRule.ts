import { Diagnostic } from './Diagnostic'
import { LintRuleType } from './LintRuleType'

export interface LintRule {
  type: LintRuleType
  name: string
  description: string
  warning: string
  test: (value: string, lineNumber: number) => Diagnostic[]
}

export interface LineLintRule extends LintRule {
  type: LintRuleType.Line
}

export interface FileLintRule extends LintRule {
  type: LintRuleType.File
  test: (value: string) => Diagnostic[]
}
