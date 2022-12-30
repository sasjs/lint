import { LintConfig } from '../types'
import { LineEndings } from '../types/LineEndings'
import { splitText } from '../utils/splitText'

export const processText = (text: string, config: LintConfig) => {
  const processedText = processContent(config, text)
  const lines = splitText(processedText, config)
  const formattedLines = lines.map((line) => {
    return processLine(config, line)
  })

  const configuredLineEnding =
    config.lineEndings === LineEndings.LF ? '\n' : '\r\n'
  return formattedLines.join(configuredLineEnding)
}

const processContent = (config: LintConfig, content: string): string => {
  let processedContent = content
  config.fileLintRules
    .filter((r) => !!r.fix)
    .forEach((rule) => {
      processedContent = rule.fix!(processedContent, config)
    })

  return processedContent
}

export const processLine = (config: LintConfig, line: string): string => {
  let processedLine = line
  config.lineLintRules
    .filter((r) => !!r.fix)
    .forEach((rule) => {
      processedLine = rule.fix!(processedLine, config)
    })

  return processedLine
}
