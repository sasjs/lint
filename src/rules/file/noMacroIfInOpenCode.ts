import { Diagnostic, LintConfig } from '../../types'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { parseMacroCalls } from '../../utils/parseMacroCalls'
import { parseMacros } from '../../utils/parseMacros'

const name = 'noMacroIfInOpenCode'
const description = 'Reports %if used in open code, which requires SAS 9.4M5.'
const message = `Macro %if used in open code - open-code %if requires SAS 9.4M5; move the block inside a %macro definition`

/**
 * The lines a macro definition covers, inclusive of its declaration line and
 * its `%mend` line.
 */
interface MacroSpan {
  firstLine: number
  lastLine: number
}

const getMacroSpans = (value: string, config?: LintConfig): MacroSpan[] =>
  parseMacros(value, config)
    // An orphan `%mend` carries no start line, so it declares no definition.
    .filter((macro) => macro.startLineNumbers.length > 0)
    .map((macro) => ({
      firstLine: macro.startLineNumbers[0],
      // A definition with no `%mend` keeps reading to the end of the file, so
      // nothing after its declaration is open code - SAS reads it as the macro
      // body, and reporting it as open code would point at a fix that is not
      // the one the file needs.
      lastLine: macro.endLineNumber ?? Number.POSITIVE_INFINITY
    }))

const isInMacro = (spans: MacroSpan[], lineNumber: number): boolean =>
  spans.some(
    (span) => lineNumber >= span.firstLine && lineNumber <= span.lastLine
  )

/**
 * Reports each `%if` that runs in open code - that is, outside every `%macro`
 * definition in the file.
 *
 * `%if-%then-%else` in open code is a SAS 9.4M5 feature. On an earlier
 * maintenance the statement is rejected outright - "ERROR: The %IF statement is
 * not valid in open code" - so a file that uses one cannot run on a session
 * before M5, and one that wraps the same logic in a macro can.
 *
 * The scan comes from `parseMacroCalls`, so a `%if` inside a block comment, a
 * macro comment, a comment statement, a data section, an embedded-language
 * `submit` block or a `%str` / `%nrstr` argument is not reported, and neither is
 * one inside a single-quoted string, where SAS resolves no macro trigger. A
 * double-quoted string is scanned as code, because SAS resolves triggers there -
 * a `%if` template written in one is still a statement the target session has to
 * accept.
 *
 * The rule is off by default: it encodes a release floor, so it applies to the
 * projects whose floor is earlier than 9.4M5 and is noise everywhere else.
 *
 * There is no fix. Moving a block into a macro means writing a `%macro` /
 * `%mend` pair and an invocation around code the formatter cannot reorder, and
 * a rewrite that guesses the macro name is worse than the warning.
 */
const test = (value: string, config?: LintConfig): Diagnostic[] => {
  if (!value) return []

  const cfg = config || new LintConfig()
  const severity = cfg.severityLevel[name] || Severity.Warning
  const spans = getMacroSpans(value, cfg)

  return parseMacroCalls(value, cfg)
    .filter((call) => call.name.toLowerCase() === 'if' && !call.quoted)
    .filter((call) => !isInMacro(spans, call.lineNumber))
    .map((call) => ({
      message,
      lineNumber: call.lineNumber,
      startColumnNumber: call.startColumnNumber,
      endColumnNumber: call.endColumnNumber,
      severity
    }))
}

/**
 * Lint rule that reports `%if` used in open code.
 *
 * Enable it with `"noMacroIfInOpenCode": true` where the SAS floor is earlier
 * than 9.4 Maintenance 5, which is the release that added `%if-%then-%else` in
 * open code. At M5 the `%then` / `%else` clause must be a `%do` / `%end` block,
 * so the construct this rule removes is the `%if ... %then %do; ... %end;`
 * block that cannot run below that floor.
 */
export const noMacroIfInOpenCode: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
