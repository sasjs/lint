/**
 * Reads one line of a SAS program, carrying the state a break decision needs
 * from one physical line to the next.
 *
 * A quoted literal, a block comment and a masking macro's argument text all
 * continue onto the next line, so a caller that decides where a line may be
 * broken - or where a statement really ends - needs to know which of them is
 * open. The scan is one pass with those three states, because each affects the
 * reading of the others: `%str(%')` is an apostrophe, and a scanner that read it
 * as the start of a literal would carry a phantom string into every line below.
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

    // Masked text is data, so it is read before anything that OPENS a literal
    // or a comment: `%str(%')` is how a single quote is written, and reading
    // that apostrophe as the start of a literal would carry a phantom string
    // into every line below it.
    if (maskedDepth) {
      if (character === '(') maskedDepth++
      else if (character === ')') maskedDepth--
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
