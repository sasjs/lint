import { Diagnostic } from './Diagnostic'
import { LintRuleType } from './LintRuleType'

/**
 * A lint rule is defined by a type, name, description, message text and a test function.
 * The test function produces a set of diagnostics when executed.
 */
export interface LintRule {
  type: LintRuleType
  name: string
  description: string
  message: string
  test: (value: string, lineNumber: number) => Diagnostic[]
}

/**
 * A LineLintRule is run once per line of text.
 */
export interface LineLintRule extends LintRule {
  type: LintRuleType.Line
}

/**
 * A FileLintRule is run once per file.
 */
export interface FileLintRule extends LintRule {
  type: LintRuleType.File
  test: (value: string) => Diagnostic[]
}
