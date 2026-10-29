import { Diagnostic, LintConfig } from '../../types'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { getPosition } from '../../utils/getPosition'

const name = 'noNestedCommentsInHeader'
const description =
  'Disallow a close marker inside the Doxygen header. SAS block comments do not nest and end at the first close marker, so anything after one in the header is compiled as SAS. The header end is identified by its `**/` terminator standing alone on its line, so a project that closes headers with a plain close marker is not inspected.'
const message = 'Doxygen header contains a nested block comment'
const messageForTerminator =
  'Doxygen header contains /*/, which SAS reads as a comment terminator'
const messageForText = 'Doxygen header contains a close marker as text'

const CLOSE = '*/'
const TERMINATOR = '**/'
const LATER_HEADER = /^[ \t]*\/\*\*/m

// Finds the double-asterisk terminator that belongs to this header.
//
// It has to stand alone on its line, because the house style writes it that way
// and a terminator inside a statement ends that statement's comment. It also has
// to arrive before another header opens: one behind a later opener closes that
// header, not this one. A plain comment inside the same header does not
// disqualify a candidate - that comment is part of the text that leaked.
//
// The cost of the second bound: a truncated header whose own text holds a
// line-leading `/**` is not reported, because that opener is not
// distinguishable from a second header in the same file.
const ownTerminator = (value: string, close: number) => {
  let candidate = value.indexOf(TERMINATOR, close - 1)

  while (candidate !== -1) {
    const lineStart = value.lastIndexOf('\n', candidate - 1) + 1
    const lineLeading = !value.slice(lineStart, candidate).trim()

    // Another header opens before this candidate, so nothing beyond it can be
    // this header's end.
    if (LATER_HEADER.test(value.slice(close + 2, candidate))) return null

    if (lineLeading) return candidate

    candidate = value.indexOf(TERMINATOR, candidate + 1)
  }

  return null
}

/**
 * Finds the close marker that ends a Doxygen header early.
 *
 * A header is a SAS block comment, and SAS block comments do not nest: the
 * first close marker ends the comment, so anything after it in the header -
 * `@param` lines, code in a usage example - is compiled as SAS. The marker can
 * belong to a nested comment, come straight after its opener as text, or be
 * bare text.
 *
 * Only the header the file opens with is inspected, which is the header
 * `sasjs compile` reads: a file that opens with code has no header to truncate,
 * and `hasDoxygenHeader` is the rule for that shape.
 *
 * `@sasjs/utils` runs the same three boundaries when it strips a header at
 * compile time (sasjs/utils#288): the file's opening header only, a terminator
 * standing alone on its line, and no later opener in between. The two functions
 * are line-for-line equivalents, so a file this rule passes does not fail the
 * build on this shape and the other way round.
 */
const test = (value: string, config?: LintConfig): Diagnostic[] => {
  const severity = config?.severityLevel[name] || Severity.Warning

  if (!value) return []

  const start = value.search(/\S/)

  if (start === -1 || !value.startsWith('/**', start)) return []

  const close = value.indexOf(CLOSE, start + 2)

  if (close === -1) return []

  const terminator = ownTerminator(value, close)

  // A header that closed at its own terminator was not cut short, and one with
  // no terminator carries no evidence that it was meant to continue.
  if (terminator === null || terminator === close - 1) return []

  const nestedComment = value.indexOf('/*', start + 2)
  const nested =
    nestedComment !== -1 && nestedComment < close ? nestedComment : null
  const literalSequence = nested !== null && nested === close - 1

  const reported = nested ?? close
  const { lineNumber, columnNumber } = getPosition(value, reported)

  return [
    {
      message: literalSequence
        ? messageForTerminator
        : nested === null
          ? messageForText
          : message,
      lineNumber,
      startColumnNumber: columnNumber,
      endColumnNumber: columnNumber + 1,
      severity
    }
  ]
}

/**
 * Lint rule that flags a close marker inside the Doxygen header, which SAS
 * reads as the end of the header.
 */
export const noNestedCommentsInHeader: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
