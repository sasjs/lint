import { LintConfig, Diagnostic } from '../types'

/**
 * Splits the given content into a list of lines, regardless of CRLF or LF line endings.
 * @param {string} text - the text content to be split into lines.
 * @returns {string[]} an array of lines from the given text
 */
export const splitText = (text: string): string[] => {
  if (!text) return []
  return text.replace(/\r\n/g, '\n').split('\n')
}

export const processText = (text: string, config: LintConfig) => {
  const lines = splitText(text)
  const diagnostics: Diagnostic[] = []
  diagnostics.push(...processContent(config, text))
  lines.forEach((line, index) => {
    diagnostics.push(...processLine(config, line, index + 1))
  })

  return diagnostics
}

export const processFile = (
  filePath: string,
  config: LintConfig
): Diagnostic[] => {
  const diagnostics: Diagnostic[] = []
  config.pathLintRules.forEach((rule) => {
    diagnostics.push(...rule.test(filePath))
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

export const processLine = (
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
