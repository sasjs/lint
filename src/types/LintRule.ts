import { Diagnostic } from './Diagnostic'
import { LintConfig } from './LintConfig'
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
}

/**
 * A LineLintRule is run once per line of text.
 */
export interface LineLintRule extends LintRule {
  type: LintRuleType.Line
  test: (value: string, lineNumber: number, config?: LintConfig) => Diagnostic[]
}

/**
 * A FileLintRule is run once per file.
 */
export interface FileLintRule extends LintRule {
  type: LintRuleType.File
  test: (value: string) => Diagnostic[]
}

/**
 * A PathLintRule is run once per file.
 */
export interface PathLintRule extends LintRule {
  type: LintRuleType.Path
  test: (value: string) => Diagnostic[]
}
