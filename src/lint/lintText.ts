import { Diagnostic, LintConfig } from '../types'
import { applyLintOverride, getLintConfig } from '../utils'
import { processText } from './shared'

/**
 * Analyses and produces a set of diagnostics for the given text content.
 * @param {string} text - the text content to be linted.
 * @param {LintConfig} configuration - an optional lint configuration. The
 * nearest `.sasjslint` file provides the configuration when it is omitted.
 * @returns {Diagnostic[]} array of diagnostic objects, each containing a
 * warning, line number and column number.
 */
export const lintText = async (
  text: string,
  configuration?: LintConfig
): Promise<Diagnostic[]> => {
  const config = configuration || (await getLintConfig())
  return processText(text, applyLintOverride(text, config))
}
