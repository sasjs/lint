/**
 * Removes the block comments from a statement, or from one line of a statement.
 *
 * The scan tracks two states the previous implementation did not:
 *
 * - a quoted value, because SAS accepts both quote characters, so an opening
 *   comment marker inside a string is data rather than the start of a comment;
 * - a comment that is still open at the end of the text, which is reported back
 *   as `commentStarted` so the caller carries it into the next line. The old
 *   implementation lost that state when the opening marker had no closing
 *   delimiter on the same line, and returned the comment's content as code
 *   (sasjs/lint#274).
 *
 * A quoted value is carried across lines too (`quoteStarted`), because a SAS
 * literal really does continue onto the next physical line: measured on a live
 * engine, `x = "ab` / `cd";` is one string and `length(x)` is 4. An UNTERMINATED
 * quote is carried as far as the text goes, which is also what the engine does -
 * it consumes the rest of the file as string content.
 */
export const trimComments = (
  statement: string,
  commentStarted: boolean = false,
  trimEnd: boolean = false,
  quoteStarted: string = ''
): { statement: string; commentStarted: boolean; quoteStarted: string } => {
  const text = statement || ''
  let result = ''
  let quote = quoteStarted
  let inComment = commentStarted

  for (let index = 0; index < text.length; index++) {
    const character = text[index]

    if (inComment) {
      if (character === '*' && text[index + 1] === '/') {
        inComment = false
        index++
      }

      continue
    }

    if (quote) {
      result += character
      if (character === quote) quote = ''
      continue
    }

    if (character === "'" || character === '"') {
      quote = character
      result += character
      continue
    }

    if (character === '/' && text[index + 1] === '*') {
      inComment = true
      index++
      continue
    }

    result += character
  }

  return {
    statement: trimEnd ? result.trimEnd() : result.trim(),
    commentStarted: inComment,
    quoteStarted: quote
  }
}
