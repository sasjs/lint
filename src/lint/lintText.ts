import { getLintConfig } from '../utils/getLintConfig'
import { processText } from './shared'

/**
 * Analyses and produces a set of diagnostics for the given text content.
 * @param {string} text - the text content to be linted.
 * @returns {Diagnostic[]} array of diagnostic objects, each containing a warning, line number and column number.
 */
export const lintText = async (text: string) => {
  const config = await getLintConfig()
  return processText(text, config)
}
