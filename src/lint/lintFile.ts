import { readFile } from '@sasjs/utils/file'
import { Diagnostic, LintConfig } from '../types'
import { getLintConfig, isIgnored } from '../utils'
import { processFile, processText } from './shared'

/**
 * Analyses and produces a set of diagnostics for the file at the given path.
 * @param {string} filePath - the path to the file to be linted.
 * @param {LintConfig} configuration - an optional configuration. When not passed in, this is read from the .sasjslint file.
 * @returns {Promise<Diagnostic[]>} array of diagnostic objects, each containing a warning, line number and column number.
 */
export const lintFile = async (
  filePath: string,
  configuration?: LintConfig
): Promise<Diagnostic[]> => {
  if (await isIgnored(filePath)) return []

  const config = configuration || (await getLintConfig())
  const text = await readFile(filePath)

  const fileDiagnostics = processFile(filePath, config)
  const textDiagnostics = processText(text, config)

  return [...fileDiagnostics, ...textDiagnostics]
}
