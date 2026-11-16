import { LintConfig } from '../types'
import { getHeaderLinesCount } from '../utils/getHeaderLinesCount'
import { indentationMultipleOf } from './longLines'
import { splitWithTerminators } from './rewrapText'

/** The line that closes a doxygen header, however the printer or the author left it. */
const closingMarker = /^\s*\*+\/\s*$/

/** The opening line of a doxygen header, and the only one this pass owns. */
const openingMarker = /^\s*\/\*\*/

/** Measure leading indentation, counting a tab as one indentation unit. */
const indentWidth = (line: string, unit: number): number => {
  let width = 0
  for (const character of line) {
    if (character === ' ') width += 1
    else if (character === '\t') width += unit
    else break
  }
  return width
}

/**
 * Gives a file header back the shape a reader expects.
 *
 * The language printer positions a comment by the line that carries `/**` and
 * hands the body over with its own indentation intact, so a header written the
 * way `.sasjslint`'s `defaultHeader` template writes one - every body line
 * indented by `indentationMultiple` - is already correct here, and its closing
 * marker may still come back as ` **\/`, one space in. SAS ignores both, but a
 * header is documentation and its shape is part of it.
 *
 * So this pass, over the header region only:
 *
 * - moves the body to `indentationMultiple` when it sits closer to the margin
 *   than that, read through `indentationMultipleOf` so the setting behaves here
 *   as it does in every sibling pass (0 means "the default", not "no indent");
 * - puts the closing marker back at column 0 as `**\/`;
 * - trims trailing whitespace from nonblank body lines while preserving their
 *   leading indentation;
 * - leaves blank lines blank rather than filling them with spaces, and the
 *   opening line untouched.
 *
 * The body is moved as a block: every line keeps its indentation relative to the
 * others, so a hanging `@param` continuation, the entries under a
 * `<h4>`, and the indented code samples a doxygen reader renders as code all
 * survive. Indenting each line by the unit instead - what this pass used to do -
 * flattens exactly that structure, and a code sample that loses its relative
 * indent stops being a code sample.
 *
 * A header written in the star style - `/**\n * @file\n *\/` - is converted to the
 * template's shape: the star is replaced by the indentation it stood in for, and
 * the body is then moved like any other. The star style is not kept: the rules
 * that read the `<h4> SAS Macros </h4>` list do not recognise a starred `@li`
 * entry as a declaration, so every pass would append another copy of every macro
 * the file uses. One shape is also what lets a second run change nothing.
 *
 * Whether a body is in the star style is read from its tag lines: every one of
 * them carrying a star means the header was written that way, and then the
 * marker comes off every line. That is what lets the macros rule read the `@li`
 * entries, and what keeps a code sample at the offset it was written at instead
 * of two columns further from the tag it belongs under. In a body carrying only
 * a stray star, that star is a marker in front of a tag - a mistyped `@li` - and
 * a `*` anywhere else is punctuation: a bullet, a prose line, or the opening
 * star of an emphasis, including on the body's first line. The body is then
 * moved as a block, measured from its least-indented tag, so every tag reaches
 * the unit or beyond and everything else keeps its offset from them.
 * Without tags, starred prose is indistinguishable from a bullet list, so no
 * stars are removed. The first body line determines the block shift; trailing
 * whitespace and the closing marker are handled as for tagged headers.
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

  const unit = indentationMultipleOf(configuration)

  const bodyLines = entries
    .slice(0, headerLinesCount)
    .map((entry) => entry.line)
    .filter(
      (line) =>
        line.trim() && !openingMarker.test(line) && !closingMarker.test(line)
    )

  const originalTags = bodyLines.filter((line) => /^\s*(?:\*+\s*)?@/.test(line))
  const starred =
    originalTags.length > 0 &&
    originalTags.every((line) => /^\s*\*+\s*@/.test(line))
  /**
   * Tagged star-style bodies lose each line's marker; other tagged bodies only
   * lose markers before tags. Tagless bodies retain their stars.
   */
  const marker = starred ? /^(\s*)\*+(?=\s|@|$)\s?/ : /^(\s*)\*+(?=\s*@)\s?/

  /**
   * A body line with its marker removed. The line's own leading whitespace
   * stays, so the body keeps its interior offsets; the block is moved afterwards
   * so that its least-indented tag reaches the unit, which means a tag can end
   * up one column left of where it was written (the space that followed the star
   * is gone with it).
   */
  const bodyOf = (line: string) => line.replace(marker, '$1')

  // Ignore non-tag outdents such as blockquotes, but ensure a later tag written
  // further left than the first still reaches the unit in the same pass.
  const converted = bodyLines.map(bodyOf)
  const tagLines = converted.filter((line) => /^\s*@/.test(line))
  const bodyIndent = tagLines.length
    ? Math.min(...tagLines.map((line) => indentWidth(line, unit)))
    : indentWidth(converted.length ? converted[0] : '', unit)

  // Move only when a tag (or the first line of a tagless body) is below the
  // unit; all body lines retain their relative offsets.
  const shift = ' '.repeat(Math.max(0, unit - bodyIndent))

  const laidOut = entries.map((entry, index) => {
    if (index >= headerLinesCount) return entry.line + entry.ending

    const line = entry.line

    if (!line.trim() || openingMarker.test(line)) return line + entry.ending

    if (closingMarker.test(line)) return '**/' + entry.ending

    const body = bodyOf(line).trimEnd()

    // A star that stood alone becomes a blank line rather than one with trailing
    // space.
    return (body.trim() ? shift + body : '') + entry.ending
  })

  return laidOut.join('')
}
