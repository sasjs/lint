import { readFile } from '@sasjs/utils/file'
import { Diagnostic } from './types/Diagnostic'
import { LintConfig } from './types/LintConfig'
import { getLintConfig } from './utils/getLintConfig'

/**
 * Analyses and produces a set of diagnostics for the given text content.
 * @param {string} text - the text content to be linted.
 * @returns {Diagnostic[]} array of diagnostic objects, each containing a warning, line number and column number.
 */
export const lintText = async (text: string) => {
  const config = await getLintConfig()
  return processText(text, config)
}

/**
 * Analyses and produces a set of diagnostics for the file at the given path.
 * @param {string} filePath - the path to the file to be linted.
 * @returns {Diagnostic[]} array of diagnostic objects, each containing a warning, line number and column number.
 */
export const lintFile = async (filePath: string) => {
  const config = await getLintConfig()
  const text = await readFile(filePath)

  const fileDiagnostics = processFile(filePath, config)
  const textDiagnostics = processText(text, config)

  return [...fileDiagnostics, ...textDiagnostics]
}

/**
 * Splits the given content into a list of lines, regardless of CRLF or LF line endings.
 * @param {string} text - the text content to be split into lines.
 * @returns {string[]} an array of lines from the given text
 */
export const splitText = (text: string): string[] => {
  if (!text) return []
  return text.replace(/\r\n/g, '\n').split('\n')
}

const processText = (text: string, config: LintConfig) => {
  const lines = splitText(text)
  const diagnostics: Diagnostic[] = []
  diagnostics.push(...processContent(config, text))
  lines.forEach((line, index) => {
    diagnostics.push(...processLine(config, line, index + 1))
  })

  return diagnostics
}

const processContent = (config: LintConfig, content: string): Diagnostic[] => {
  const diagnostics: Diagnostic[] = []
  config.fileLintRules.forEach((rule) => {
    diagnostics.push(...rule.test(content))
  })

  return diagnostics
}

const processLine = (
  config: LintConfig,
  line: string,
  lineNumber: number
): Diagnostic[] => {
  const diagnostics: Diagnostic[] = []
  config.lineLintRules.forEach((rule) => {
    diagnostics.push(...rule.test(line, lineNumber, config))
  })

  return diagnostics
}

const processFile = (filePath: string, config: LintConfig): Diagnostic[] => {
  const diagnostics: Diagnostic[] = []
  config.pathLintRules.forEach((rule) => {
    diagnostics.push(...rule.test(filePath))
  })

  return diagnostics
}
