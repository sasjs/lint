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
 *
 * A rejection from the engine is not caught: its message is the one that says why
 * (`@sasjs/sas-language` names the data file it could not read, for example), and
 * a formatter that swallowed it would return a buffer that looks formatted and is
 * not. `formatFolder` is the one place that catches, because there a single
 * refusal must not stop the walk - it collects them and raises them together once
 * the tree is done.
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
