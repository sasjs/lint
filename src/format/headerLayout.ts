import { LintConfig } from '../types'
import { getHeaderLinesCount } from '../utils/getHeaderLinesCount'
import { splitWithTerminators } from './rewrapText'

/** The line that closes a doxygen header, however the printer or the author left it. */
const closingMarker = /^\s*\*+\/\s*$/

/** The opening line of a doxygen header. */
const openingMarker = /^\s*\/\*\*/

/** A tag whose body is code rather than prose, so its lines are left as written. */
const codeTag = /^\s*@(?:example|code|verbatim)\b/i

/** Any other tag, which is where a code body ends. */
const otherTag = /^\s*@(?!example|code|verbatim)\w/i

/**
 * Gives a file header back the shape a reader expects.
 *
 * The language printer aligns comment bodies with the `/**` itself, so a header
 * written the way `.sasjslint`'s `defaultHeader` template writes one - every body
 * line indented by `indentationMultiple` - comes back flush left, and its closing
 * marker comes back as ` **\/`, one space in. SAS ignores both, but a header is
 * documentation and its shape is part of it, and neither is the shape the
 * template, the schema or a doxygen reader expects.
 *
 * So this pass, over the header region only:
 *
 * - indents every body line by `indentationMultiple`, which is the template's own
 *   indentation and a setting the project already has for nesting;
 * - leaves a `@example` / `@code` / `@verbatim` body exactly as written, because
 *   indentation there is part of what is being illustrated;
 * - puts the closing marker back at column 0 as `**\/`;
 * - leaves blank lines blank rather than filling them with spaces, and the
 *   opening line untouched.
 *
 * Idempotent: a header already in this shape comes back unchanged, which the
 * caller relies on because its passes run until the text stops changing.
 *
 * @param text - the text to lay out
 * @param configuration - provides `indentationMultiple` and the header boundary
 * @returns the text, with its header laid out
 */
export const headerLayout = (
  text: string,
  configuration: LintConfig
): string => {
  if (!text) return text

  const headerLinesCount = getHeaderLinesCount(text, configuration)

  if (!headerLinesCount) return text

  const entries = splitWithTerminators(text)
  const indent = ' '.repeat(configuration.indentationMultiple)
  let inCode = false

  const laidOut = entries.map((entry, index) => {
    if (index >= headerLinesCount) return entry.line + entry.ending

    const line = entry.line

    if (!line.trim() || openingMarker.test(line)) return line + entry.ending

    if (closingMarker.test(line)) return '**/' + entry.ending

    if (codeTag.test(line)) {
      inCode = true

      return indent + line.trim() + entry.ending
    }

    if (inCode) {
      if (otherTag.test(line)) inCode = false
      // The printer has already flattened the body's inner indentation, so what
      // is left to do is give its lines the header's unit indent rather than
      // leave them at column 0 - the relative structure a reader had is gone
      // before this pass sees the text.
      else return indent + line.trim() + entry.ending
    }

    return indent + line.trim() + entry.ending
  })

  return laidOut.join('')
}
