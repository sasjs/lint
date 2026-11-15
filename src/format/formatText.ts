import { FormatOptions } from '../types/FormatOptions'
import { LintConfig } from '../types'
import { applyLintOverride, getLintConfig } from '../utils'
import { processText } from './shared'

/**
 * Formats SAS text: the caller's reprint pass if one was supplied, then the
 * configured rules.
 *
 * The order is deliberate. A reprint decides where lines break and how blocks are
 * indented, so the rules that wrap and trim have to run over its output - applying
 * them to the original text and reprinting afterwards would undo both. The lint
 * override comment travels with the text through the reprint (it is a comment),
 * so `keywordCase` from an `@sasjslint` line applies to the same buffer.
 */
export const formatText = async (
  text: string,
  configuration?: LintConfig,
  options: FormatOptions = {}
) => {
  const config = applyLintOverride(
    text,
    configuration || (await getLintConfig())
  )

  const formatted = options.reprint
    ? await options.reprint(text, { keywordCase: config.keywordCase })
    : text

  return processText(formatted, config)
}
