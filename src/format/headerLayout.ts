import { LintConfig } from '../types'
import { getHeaderLinesCount } from '../utils/getHeaderLinesCount'
import { indentationMultipleOf } from './longLines'
import { splitWithTerminators } from './rewrapText'

/** The line that closes a doxygen header, however the printer or the author left it. */
const closingMarker = /^\s*\*+\/\s*$/

/** The opening line of a doxygen header, and the only one this pass owns. */
const openingMarker = /^\s*\/\*\*/

/** A leading star, which is how the star style marks every body line. */
const leadingStar = /^\*\s?/

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
 * - indents every body line by `indentationMultiple`, read through
 *   `indentationMultipleOf` so the setting behaves here as it does in every
 *   sibling pass (0 means "the default", not "no indent");
 * - puts the closing marker back at column 0 as `**\/`;
 * - leaves blank lines blank rather than filling them with spaces, and the
 *   opening line untouched.
 *
 * A header written in the star style - `/**\n * @file\n *\/` - is converted to the
 * template's shape: the star is stripped and the body is indented by the unit.
 * The star style is not kept: the rules that read the `<h4> SAS Macros </h4>`
 * list do not recognise a starred `@li` entry as a declaration, so every pass
 * would append another copy of every macro the file uses. One shape is also what
 * lets a second run change nothing.
 *
 * A `@example` / `@code` / `@verbatim` body gets the same treatment as any other
 * line. By the time this pass runs the printer has already flattened the body's
 * *inner* indentation, so the nesting an author wrote is gone before this code sees
 * it and trimming what is left loses nothing further - which is why there is no
 * special case for a code body here. The relative structure of a code sample
 * therefore does not survive a format: that is a limitation of the printer, not a
 * choice made in this file.
 *
 * A file that does not open with a doxygen comment is returned unchanged. The
 * header region is found by `getHeaderLinesCount`, which accepts any `/*`, and an
 * ordinary block comment is not this pass's to lay out - least of all to have its
 * ` *\/` rewritten to `**\/`.
 *
 * Idempotent: a header already in this shape comes back unchanged, which the caller
 * relies on because its passes run until the text stops changing.
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

  // `getHeaderLinesCount` takes any `/*`, so the first line decides whether this
  // is a doxygen header at all.
  if (!openingMarker.test(entries[0].line)) return text

  const indent = ' '.repeat(indentationMultipleOf(configuration))

  const laidOut = entries.map((entry, index) => {
    if (index >= headerLinesCount) return entry.line + entry.ending

    const line = entry.line

    if (!line.trim() || openingMarker.test(line)) return line + entry.ending

    if (closingMarker.test(line)) return '**/' + entry.ending

    // A star-style line loses its star, and a star that stood alone becomes a blank
    // line rather than one with trailing space.
    const content = line.trim().replace(leadingStar, '')

    return (content ? indent + content : '') + entry.ending
  })

  return laidOut.join('')
}
