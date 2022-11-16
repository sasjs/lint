import { LintConfig, Diagnostic } from '../types'
import { splitText } from '../utils'

export const processText = (text: string, config: LintConfig) => {
  const lines = splitText(text, config)
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
    diagnostics.push(...rule.test(filePath, config))
  })

  return diagnostics
}

const processContent = (config: LintConfig, content: string): Diagnostic[] => {
  const diagnostics: Diagnostic[] = []
  config.fileLintRules.forEach((rule) => {
    diagnostics.push(...rule.test(content, config))
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
