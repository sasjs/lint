import { Diagnostic, LintConfig } from '../../types'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { checkIsDataLine, getDataSectionsDetail } from '../../utils'
import { getColumnNumber } from '../../utils/getColumnNumber'
import { parseMacros } from '../../utils/parseMacros'
import { splitLines } from '../../utils/splitLines'

const name = 'minMacroNameLength'
const description =
  'Ensure a macro name is long enough not to collide with another language.'
const message = `Macro name '{macro}' is shorter than {length} characters`

/** Escapes a macro name so it can be interpolated into a RegExp literally. */
const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The block-comment spans on a line. A `/*` inside a single-quoted string opens
 * nothing - `%put '/*';` writes those characters - so the scan tracks quotes.
 */
const commentSpans = (line: string) => {
  const spans: [number, number][] = []
  let inString = false
  let start = -1

  for (let index = 0; index < line.length; index++) {
    const char = line[index]

    if (char === "'") {
      inString = !inString
    } else if (!inString && char === '/' && line[index + 1] === '*') {
      start = index
      index++
    } else if (
      !inString &&
      char === '*' &&
      line[index + 1] === '/' &&
      start > -1
    ) {
      spans.push([start, index + 2])
      start = -1
      index++
    }
  }

  if (start > -1) spans.push([start, line.length])

  return spans
}

/**
 * True when the offset sits inside a block comment on this line. A comment can
 * carry a declaration that is not the one being reported - `/* %macro a(); *\/`
 * before the real `%macro s();` - and that text takes no position.
 */
const inComment = (line: string, index: number) => {
  const spans = commentSpans(line)

  return spans.some(([start, end]) => index > start && index < end)
}

const test = (value: string, config?: LintConfig): Diagnostic[] => {
  const severity = config?.severityLevel[name] || Severity.Warning
  const minimum = config?.minMacroNameLength ?? 3

  // A floor below two characters switches the rule off, the way a zero
  // `maxLineLength` switches its rule off.
  if (minimum < 2) return []

  const lines = splitLines(value)
  const cfg = config || new LintConfig()

  // A data section - `cards` / `parmcards` / `datalines` - holds text that is
  // written somewhere, so a `%macro x();` in it is payload rather than a
  // definition. The macro parser reads the block as code, so the extent comes
  // from the same helper the line rules use, which keeps one definition of a
  // data section in the package.
  const dataSections = getDataSectionsDetail(value, cfg)

  // A name can appear more than once on a line, so each declaration takes the
  // match at its own position rather than the first one.
  const seen = new Map<string, number>()

  return (
    parseMacros(value, cfg)
      // An orphan `%mend` yields an entry with no name and no start line, which
      // has no definition to measure and no line to report on.
      .filter((macro) => macro.name && macro.startLineNumbers?.length)
      .filter((macro) => macro.name.length < minimum)
      .filter(
        (macro) =>
          !checkIsDataLine(
            dataSections,
            (macro.startLineNumbers![0] as number) - 1
          )
      )
      .map((macro) => {
        const lineNumber = macro.startLineNumbers![0] as number
        const line = lines[lineNumber - 1] || ''

        // The diagnostic covers `%macro <name>`. The column comes from the
        // declaration itself rather than the first `%macro` on the line, so a
        // comment that mentions one - `/* %macro a(); */ %macro s();` - does not
        // take the position. The name has to match, which is what tells this
        // declaration apart from an earlier one on the same line.
        const key = `${lineNumber}:${macro.name.toLowerCase()}`
        const occurrence = seen.get(key) ?? 0
        seen.set(key, occurrence + 1)

        const matches = [
          ...line.matchAll(
            new RegExp(`%macro\\s+${escapeRegExp(macro.name)}\\b`, 'gi')
          )
        ].filter((match) => !inComment(line, match.index as number))
        const declaration = matches[occurrence]
        const startColumnNumber = declaration
          ? declaration.index + 1
          : getColumnNumber(line, '%macro')

        return {
          message: message
            .replace('{macro}', macro.name)
            .replace('{length}', String(minimum)),
          lineNumber,
          startColumnNumber,
          // When the name is on a later line than `%macro`, the diagnostic
          // covers the keyword itself rather than the rest of the line.
          endColumnNumber: declaration
            ? startColumnNumber + declaration[0].length - 1
            : startColumnNumber + '%macro'.length - 1,
          severity
        }
      })
  )
}

/**
 * Reports a macro definition whose name is shorter than the configured floor.
 *
 * The floor exists because other languages write a percentage specifier that
 * reads as a macro call, and the default of three is the width of the ones a
 * format string actually contains: a conversion is one character (`%s(`,
 * `%d(`), a length modifier makes it two (`%ld(`, `%lu(`, `%Lf(`), and a name
 * anyone documents is longer than either. `noUndeclaredMacros` reads
 * invocations through the same floor, so a definition the scanner could not
 * see is reported here instead of being silently ignored.
 */
export const minMacroNameLength: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
