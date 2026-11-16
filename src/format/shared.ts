import { LintConfig } from '../types'
import { applyLintOverride } from '../utils/parseLintOverride'
import { splitText } from '../utils/splitText'
import { adjustLineLength, lineEndingOf } from './adjustLineLength'
import { headerLayout } from './headerLayout'
import { reflowComments } from './reflowComments'
import { rewrapText } from './rewrapText'
import { splitTrailingComments } from './splitTrailingComments'

/**
 * How many times the passes run before the result is taken as final.
 *
 * A run is not idempotent on its own: `adjustLineLength` raises the file's own
 * `maxLineLength` when it writes an exception, so a second run works to a
 * higher limit and can wrap a line the first run declined. Running the passes
 * until the text stops changing makes the output a fixed point, which is what
 * "formatting twice changes nothing" means - and the bound stops a pair of
 * states that undo each other from looping.
 */
const maxPasses = 3

export const processText = (text: string, config: LintConfig) => {
  let current = text
  // A pass that writes an exception has raised the limit the next pass works
  // to, so the override is re-read from the text each time round.
  let effective = applyLintOverride(current, config)

  for (let pass = 0; pass < maxPasses; pass++) {
    const next = processOnce(current, effective)

    if (next === current) break

    current = next
    effective = applyLintOverride(current, config)
  }

  return current
}

const processOnce = (text: string, config: LintConfig): string => {
  // The header is laid out before the rules run, so a rule that reads the macro
  // list sees the canonical shape rather than whatever the author wrote: a starred
  // `@li` entry is not a declaration to those readers, and they append a second copy
  // of every macro the file uses. A header a rule writes later is laid out on the
  // next pass, which is why `processText` runs to a fixed point.
  const laid = headerLayout(text, config)
  const rewrapped = rewrapText(
    splitTrailingComments(processContent(config, laid), config),
    config
  )
  const processedText = adjustLineLength(
    reflowComments(rewrapped, config),
    config
  )
  const lines = splitText(processedText, config)
  const formattedLines = lines.map((line) => {
    return processLine(config, line)
  })

  return formattedLines.join(lineEndingOf(config))
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
