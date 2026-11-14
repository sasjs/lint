import { LintConfig } from '../types'

/**
 * The state a scan carries from one physical line to the next.
 *
 * A SAS quoted literal and a block comment both continue onto the next line, so
 * a break is only safe where none of these is open. The text before a break is
 * not rewritten, so the state at the end of a line survives wrapping.
 */
export interface ScanState {
  /** The quote character a literal is still open with, or `''`. */
  quote: string
  /** Whether a block comment is still open. */
  inComment: boolean
  /** Depth of the masking call the scan is inside. */
  maskedDepth: number
}

export const cleanState = (): ScanState => ({
  quote: '',
  inComment: false,
  maskedDepth: 0
})

/**
 * The macros whose argument text is carried as DATA rather than as tokens:
 * `%str(`, `%nrstr(`, `%bquote(`, `%nrbquote(`, `%superq(`, `%nrsuperq(`,
 * `%quote(`, `%nrquote(` and `%unquote(`. A newline inserted inside one of
 * these becomes part of the value the macro returns, so their spaces are never
 * break points.
 */
const maskStart = /%n?r?(?:str|bquote|superq|quote|unquote)\s*\(/iy

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
const breakAwareStatement =
  /^\s*%?(?:&?[\w.]*\.)?(?:put|putlog|window|display)\b|\b(?:then|else)\s+%?put\b/i

/** A block comment's span on one line, as absolute column indices. */
export interface CommentSpan {
  /** The column at which the comment opens. */
  start: number
  /** The column of the closing marker's asterisk, or the line length. */
  end: number
}

/** A physical line, as the scanner reads it. */
export interface ScannedLine {
  /**
   * The columns at which a newline may be inserted: every space that is not
   * inside a quoted literal, inside a masking macro's parentheses, or inside a
   * block comment.
   */
  positions: number[]
  /** The line with every literal and comment character blanked to a space. */
  code: string
  /** Whether the line carries any block comment, open or closed. */
  hasComment: boolean
  /** Each block comment the line opens, with the span it covers. */
  comments: CommentSpan[]
  endState: ScanState
}

/**
 * Reads one line, starting from the state the previous line ended in.
 *
 * A break is never taken inside a literal, because a SAS literal really does
 * continue onto the next line (`"ab` / `cd"` is one value) and an inserted
 * newline would become part of the string.
 */
export const scanLine = (line: string, state: ScanState): ScannedLine => {
  const positions: number[] = []
  const code: string[] = new Array(line.length).fill(' ')
  const comments: CommentSpan[] = []
  let { quote, inComment, maskedDepth } = state
  let hasComment = inComment
  let commentStart = inComment ? 0 : -1

  for (let index = 0; index < line.length; index++) {
    const character = line[index]

    if (inComment) {
      if (character === '*' && line[index + 1] === '/') {
        inComment = false
        comments.push({ start: commentStart, end: index })
        index++
        continue
      }
      if (character === ' ') positions.push(index)
      continue
    }

    if (quote) {
      if (character === quote) quote = ''
      continue
    }

    if (character === "'" || character === '"') {
      quote = character
      continue
    }

    if (character === '/' && line[index + 1] === '*') {
      inComment = true
      hasComment = true
      commentStart = index
      index++
      continue
    }

    if (maskedDepth) {
      if (character === '(') maskedDepth++
      else if (character === ')') maskedDepth--
      continue
    }

    maskStart.lastIndex = index
    if (maskStart.test(line)) {
      maskedDepth = 1
      index = maskStart.lastIndex - 1
      continue
    }

    if (character === ' ') positions.push(index)
    code[index] = character
  }

  if (inComment) comments.push({ start: commentStart, end: line.length })

  return {
    positions,
    code: code.join(''),
    hasComment,
    comments,
    endState: { quote, inComment, maskedDepth }
  }
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
