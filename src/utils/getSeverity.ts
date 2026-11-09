import { LintConfig } from '../types/LintConfig'
import { Severity } from '../types/Severity'

/**
 * Resolves the severity a rule reports a violation at.
 *
 * The precedence is the rule's own `severityLevel` entry, then the `default`
 * entry in that object, then the severity built into the rule. The `default`
 * entry exists so that a project can raise (or lower) every rule - including
 * the rules that do not exist yet - with a single line, instead of listing
 * each rule name and revisiting the list whenever a rule is added.
 *
 * @param {LintConfig} config - the configuration in force, if any
 * @param {string} rule - the name of the rule
 * @param {Severity} fallback - the severity the rule uses when nothing is configured
 * @returns {Severity} the severity to report at
 */
export const getSeverity = (
  config: LintConfig | undefined,
  rule: string,
  fallback: Severity
): Severity =>
  config?.severityLevel[rule] ?? config?.defaultSeverity ?? fallback
