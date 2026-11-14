import { LintConfig } from '../types'

/** A macro declaration, which the macro rules read as one statement. */
export const macroDeclaration = /^\s*%(?:macro|mend)\b/i

/**
 * A macro comment statement - `%* text ;` - which is prose that happens to start
 * with a trigger. Breaking it would put the terminator on a line of its own, and
 * like a block comment it belongs to its author.
 */
export const macroComment = /^\s*%\*/

/**
 * A statement whose line breaks SAS reads as output lines rather than as space
 * between tokens: the DATA step's `put` and `putlog`, and the macro and window
 * statements that write text a reader sees. A break inside one of these adds a
 * line to the log or to the file being written, so the passes leave them alone -
 * including a line that only carries the continuation of such a statement.
 */
export const breakAwareStatement =
  /^\s*%?(?:&?[\w.]*\.)?(?:put|putlog|window|display)\b|\b(?:then|else)\s+%?put\b/i

/**
 * The index where the text of a `put`-family statement begins, so a break is
 * never taken before the keyword that names it.
 *
 * A continuation line carries no keyword of its own, and its whole content is
 * text, so there the text begins at the first non-whitespace character.
 *
 * @param {string} line - the line to read.
 * @returns {number} the index of the first character of the statement's text.
 */
export const putTextStart = (line: string): number => {
  const match = breakAwareStatement.exec(line)

  return match ? match.index + match[0].length : firstNonSpace(line, 0)
}

/** The index of the first non-whitespace character at or after `from`. */
export const firstNonSpace = (line: string, from: number): number => {
  const rest = line.slice(from)

  return from + rest.length - rest.trimStart().length
}

/**
 * The indentation a continuation line takes: the next multiple of
 * `indentationMultiple` after the line's own, so a break can never introduce an
 * `indentationMultiple` diagnostic of its own.
 */
export const continuationIndentFor = (
  indent: string,
  multiple: number
): string => indent + ' '.repeat(multiple - (indent.length % multiple))

/** The indentation multiple in force, with the rule's documented default. */
export const indentationMultipleOf = (configuration: LintConfig): number =>
  configuration.indentationMultiple > 0 ? configuration.indentationMultiple : 2

/**
 * Reads whether one line opens, or carries the continuation of, a statement
 * whose line breaks SAS reads as output lines.
 *
 * Splitting the code view on `;` gives one entry per statement on the line, the
 * last entry being the part that has not reached its own terminator.
 *
 * @param {string} code - the line with literals and comments blanked.
 * @param {boolean} open - whether the previous line left such a statement open.
 * @returns {{ line: boolean, open: boolean }} whether this line belongs to one,
 *   and whether the next line still does.
 */
export const breakAwareState = (
  code: string,
  open: boolean
): { line: boolean; open: boolean } => {
  const statements = code.split(';')
  const at = statements.findIndex((statement) =>
    breakAwareStatement.test(statement)
  )

  return {
    line: open || at > -1,
    open: open
      ? statements.length === 1
      : at > -1 && at === statements.length - 1
  }
}
