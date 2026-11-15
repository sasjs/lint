import { maskedArgumentEnd, maskingFunctionStart } from './maskingFunction'

/**
 * Removes the block comments from a statement, or from one line of a statement.
 *
 * The scan tracks three states the previous implementation did not:
 *
 * - a quoted value, because SAS accepts both quote characters, so an opening
 *   comment marker inside a string is data rather than the start of a comment;
 * - a comment that is still open at the end of the text, which is reported back
 *   as `commentStarted` so the caller carries it into the next line. The old
 *   implementation lost that state when the opening marker had no closing
 *   delimiter on the same line, and returned the comment's content as code
 *   (sasjs/lint#274);
 * - the argument of a masking function (`%str` / `%nrstr`), which is skipped
 *   whole. SAS resolves a macro trigger inside a double-quoted string, and
 *   `%str(%")` masks the quote so that it does not end the string. Read as a
 *   delimiter it flipped the quote state, and every line after it was taken for
 *   string content - so the comments in a macro declaration that follows were
 *   not removed, and its documented parameters were read as names with spaces.
 *   A `%` inside a single-quoted string is text, so the skipped region only
 *   starts where the macro processor would act on it.
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

    if (character === '%' && quote !== "'") {
      const maskingFunction = maskingFunctionStart.exec(text.slice(index))

      if (maskingFunction) {
        // The masked text keeps its place in the statement and leaves the quote
        // and comment state alone.
        const end = maskedArgumentEnd(text, index + maskingFunction[0].length)

        result += text.slice(index, end)
        index = end - 1
        continue
      }
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
