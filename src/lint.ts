import { Diagnostic } from './types/Diagnostic'
import { LintConfig } from './types/LintConfig'
import { getLintConfig } from './utils/getLintConfig'

export const lint = async (text: string) => {
  const config = await getLintConfig()
  return processText(text, config)
}

export const splitText = (text: string): string[] => {
  if (!text) return []
  return text.replace(/\r\n/g, '\n').split('\n')
}

const processText = (text: string, config: LintConfig) => {
  const lines = splitText(text)
  const diagnostics: Diagnostic[] = []
  diagnostics.push(...processFile(config, text))
  lines.forEach((line, index) => {
    diagnostics.push(...processLine(config, line, index + 1))
  })

  return diagnostics
}

const processFile = (config: LintConfig, fileContent: string): Diagnostic[] => {
  const diagnostics: Diagnostic[] = []
  config.fileLintRules.forEach((rule) => {
    diagnostics.push(...rule.test(fileContent))
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
    diagnostics.push(...rule.test(line, lineNumber))
  })

  return diagnostics
}
