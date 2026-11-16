import { LintConfig } from '../types'
import { getHeaderLinesCount } from '../utils/getHeaderLinesCount'
import { indentationMultipleOf } from './longLines'
import { splitWithTerminators } from './rewrapText'

/** The line that closes a doxygen header, however the printer or the author left it. */
const closingMarker = /^\s*\*+\/\s*$/

/** The opening line of a doxygen header, and the only one this pass owns. */
const openingMarker = /^\s*\/\*\*/

/**
 * Whether the body uses star-style markers. All tag lines must be marked;
 * without tags, require multiple consistently marked lines left of the unit.
 * The latter is ambiguous, so a tagless list at the template margin is kept.
 * A continuation without a marker does not stop a tagged body being starred.
 */
const isStarredBody = (bodyLines: string[], unit: number): boolean => {
  const tagLines = bodyLines.filter((line) => /^\s*(?:\*+\s*)?@/.test(line))

  if (!tagLines.length) {
    // Without tags, only consistently marked lines left of the unit can signal
    // star style; a template-indented bullet list must remain punctuation.
    return (
      bodyLines.length > 1 &&
      bodyLines.every((line) => {
        const match = /^( *)\*(?:\s|$)/.exec(line)
        return match !== null && match[1].length < unit
      })
    )
  }

  return tagLines.every((line) => /^\s*\*+\s*@/.test(line))
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
 * Without tags, consistently space-marked nonblank lines before the unit are
 * treated as star style; tab-prefixed markers or an unmarked continuation do not
 * trigger conversion. An indented tagless bullet list is preserved. Such
 * prose-only cases are inherently ambiguous.
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

  /**
   * The width of a line's leading whitespace, counting a tab as one indentation
   * unit. Measured in characters a tab is a single column, so a tab-indented
   * body reads as narrower than the unit and the shift padded a space in front
   * of the tab - leaving the header at neither indentationMultiple nor the
   * indentation its author wrote.
   */
  const indentWidth = (line: string): number => {
    let width = 0

    for (const character of line) {
      if (character === ' ') {
        width += 1
      } else if (character === '\t') {
        width += unit
      } else {
        break
      }
    }

    return width
  }

  const bodyLines = entries
    .slice(0, headerLinesCount)
    .map((entry) => entry.line)
    .filter(
      (line) =>
        line.trim() && !openingMarker.test(line) && !closingMarker.test(line)
    )

  // The star style is read from the body's tags: a header written that way marks
  // its tags with a star, and a starred `@li` is not an entry the macros rule
  // reads - which is the state this conversion exists to prevent.
  const starred = isStarredBody(bodyLines, unit)

  /**
   * The marker as it is written on a line: the star, and the space after it.
   *
   * In a starred body every line is marked, so that pattern is removed from all
   * of them - a sample or a paragraph keeps the offset it was written at, and
   * nothing is left starred. In a body that only carries a stray star, the star
   * is a marker only in front of a tag; anywhere else it is punctuation, a
   * bullet or the opening star of an emphasis, and it stays.
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
    ? Math.min(...tagLines.map(indentWidth))
    : indentWidth(converted.length ? converted[0] : '')

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
