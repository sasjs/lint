import { Diagnostic, LintConfig } from '../../types'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { getIndex } from '../../utils/getIndex'
import { getPosition } from '../../utils/getPosition'
import { getSeverity } from '../../utils/getSeverity'
import { isSasMacro } from '../../utils/sasMacros'
import {
  hasMaskedName,
  parseMacroCallArguments
} from '../../utils/parseMacroCallArguments'
import { parseMacroCalls } from '../../utils/parseMacroCalls'

const name = 'noMalformedMacroCalls'
const message = 'Macro call arguments: {reason}'
const description =
  'Reports macro calls whose argument list does not parse as written: a call that never closes, or text spilled after a keyword parameter.'

/** The words for each way a call can fail, and what the author can do about it. */
const reasons = {
  quote:
    'unclosed quote - the rest of the file is read as part of the value; quote it with %str()',
  parenthesis:
    'unclosed parenthesis - the call never closes; quote the value with %str()',
  comment: 'unterminated comment - the rest of the call is read as a comment',
  spill:
    '"%s" is not a name=value parameter and follows one - a comma inside a value? quote it with %str()',
  empty:
    'an empty parameter follows a comma - remove it; the engine reads it as a positional parameter',
  quotedName:
    'a parameter name cannot be quoted - the engine answers "Invalid macro parameter name"; drop the quotes',
  maskedName:
    'a parameter name cannot be masked - the engine reads it as a positional parameter; drop the %str() and name the parameter directly'
}

/** A parameter that opens with a quoted name, `"b"=2`. */
const quotedParameterName = /^\s*(['"])[^'"]*\1\s*=/

/**
 * Lint rule that reports a macro call the macro tokenizer cannot read as the
 * author wrote it.
 *
 * The two shapes it reports are the ones an engine confirmed (SAS 9.4,
 * `sas.4gl.io`, 2026-11-11):
 *
 * - the argument region does not close - an unclosed quote, parenthesis or
 *   comment - which either swallows the rest of the file, or raises
 *   `Macro parameter contains syntax error` somewhere further down;
 * - a parameter after the first `name=` one that carries no `name=`, which is
 *   text spilled at a comma or a stray argument. The engine answers
 *   `All positional parameters must precede keyword parameters`.
 *
 * A call that closes early (`%foo(a=1), b=2)`) is NOT reported: the closing
 * parenthesis belongs to the call, the leftover text is an ordinary statement
 * error, and a nested call used as a value (`%foo(a=%bar(x, y), b=2)`) has the
 * same shape, so the check cannot tell them apart.
 */
const test = (value: string, config?: LintConfig) => {
  const diagnostics: Diagnostic[] = []

  const severity = getSeverity(config, name, Severity.Warning)

  const at = (start: number, end: number, reason: string): Diagnostic => {
    const from = getPosition(value, start)
    const to = getPosition(value, end)

    return {
      message: message.replace('{reason}', reason),
      lineNumber: from.lineNumber,
      startColumnNumber: from.columnNumber,
      endColumnNumber: to.columnNumber,
      severity
    }
  }

  parseMacroCalls(value, config)
    // A name inside a single-quoted string is data that a caller may submit
    // later, and a SAS-shipped name is a function or a statement rather than a
    // call this rule can reason about.
    .filter((call) => !call.quoted && !isSasMacro(call.name))
    .forEach((call) => {
      const args = parseMacroCallArguments(value, call)
      if (!args) return

      // The call starts at its `%`, which the scan reported as a position:
      // measuring from the parenthesis would be wrong whenever the call puts
      // whitespace between the name and the argument list.
      const callStart = getIndex(value, call.lineNumber, call.startColumnNumber)

      if (args.unclosed) {
        diagnostics.push(
          at(
            callStart,
            callStart + call.name.length + 1,
            reasons[args.unclosed]
          )
        )

        return
      }

      const firstKeyword = args.parameters.findIndex(
        (parameter) => parameter.isKeyword
      )
      if (firstKeyword === -1) return

      const stray = args.parameters
        .slice(firstKeyword + 1)
        .find((parameter) => !parameter.isKeyword)

      if (stray) {
        // A parameter holding nothing but whitespace or a comment is an empty
        // one: the engine reads `%foo(a=1, b=2,)` and `%foo(a=1, b=2, /*x*/)`
        // as a positional parameter and refuses both.
        const visible = stray.text
          .replace(/\/\*[\s\S]*?\*\//g, ' ')
          .trim()
          .replace(/\s+/g, ' ')

        // Every span here stays within the parameter's own text, trimmed of the
        // whitespace around it: a parameter may run past a newline, and a range
        // measured to `stray.end` would then name a line it does not cover.
        const textStart =
          stray.start + (stray.text.length - stray.text.trimStart().length)
        const textEnd =
          stray.end - (stray.text.length - stray.text.trimEnd().length)

        if (hasMaskedName(stray.text)) {
          diagnostics.push(at(textStart, textEnd, reasons.maskedName))

          return
        }

        if (quotedParameterName.test(stray.text)) {
          diagnostics.push(at(textStart, textEnd, reasons.quotedName))

          return
        }

        if (!visible) {
          // Point at the comma that introduced the parameter - one character,
          // so the range cannot straddle a line break.
          diagnostics.push(
            at(Math.max(stray.start - 1, 0), stray.start, reasons.empty)
          )

          return
        }

        diagnostics.push(
          at(textStart, textEnd, reasons.spill.replace('%s', visible))
        )
      }
    })

  return diagnostics
}

/**
 * Lint rule that reports a macro call whose argument list does not parse as
 * written. Off by default: the checks model the macro tokenizer, so a project
 * turns them on once it has read the corpus.
 */
export const noMalformedMacroCalls: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
