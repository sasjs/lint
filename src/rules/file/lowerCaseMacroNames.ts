import { Diagnostic, LintConfig } from '../../types'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { LineEndings } from '../../types/LineEndings'
import { getHeaderMacros } from '../../utils/headerMacros'
import { parseMacros } from '../../utils/parseMacros'
import { splitText } from '../../utils/splitText'

const name = 'lowerCaseMacroNames'
const description =
  'Enforce lower case macro names, in the <h4> SAS Macros </h4> header and in the %macro definition.'
const message = `Macro name '{macro}' contains uppercase characters`

const headerMessage = (macro: string) =>
  `Macro '${macro}.sas' is declared with uppercase characters in the <h4> SAS Macros </h4> header - the declaration and the file name have to match, and only a lower case pair resolves on a case-sensitive filesystem`

const definitionMessage = (macro: string) =>
  `Macro '${macro}' is defined with uppercase characters - rename it in the %macro statement`

const mendMessage = (macro: string) =>
  `Macro '${macro}' is named with uppercase characters in the %mend statement`

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Reports the macro names that carry uppercase characters, in the two places a
 * project writes one down: the `@li` entries of the `<h4> SAS Macros </h4>`
 * header, which `sasjs compile` reads to find the files, and the `%macro` /
 * `%mend` statements in the code.
 *
 * Both are read with the parsers the rest of the linter uses, so the rule
 * agrees with the compiler about which entries exist and with
 * `hasMacroNameInMend` about which name a `%mend` carries - and each diagnostic
 * lands on the exact entry or name, not on line 1.
 *
 * `lowerCaseFileNames` covers the file itself. The pair is what removes the
 * cross-platform trap: a file named `mf_GetUser.sas` resolves on Windows
 * whatever the header says, and fails on any case-sensitive filesystem.
 */
const test = (value: string, config?: LintConfig): Diagnostic[] => {
  if (!value) return []

  const cfg = config || new LintConfig()
  const severity = cfg.severityLevel[name] || Severity.Warning
  const diagnostics: Diagnostic[] = []

  getHeaderMacros(value, cfg).forEach((macro) => {
    if (macro.name === macro.name.toLowerCase()) return

    diagnostics.push({
      message: headerMessage(macro.name),
      lineNumber: macro.lineNumber,
      startColumnNumber: macro.startColumnNumber,
      endColumnNumber: macro.endColumnNumber,
      severity
    })
  })

  const lines = splitText(value, cfg)

  parseMacros(value, cfg).forEach((macro) => {
    const definition = findName(lines[macro.startLineNumbers[0] - 1], '%macro')

    if (definition && definition.macro !== definition.macro.toLowerCase()) {
      diagnostics.push({
        message: definitionMessage(definition.macro),
        lineNumber: macro.startLineNumbers[0],
        startColumnNumber: definition.column,
        endColumnNumber: definition.column + definition.macro.length,
        severity
      })
    }

    if (macro.endLineNumber === null) return

    const mend = findName(lines[macro.endLineNumber - 1], '%mend')

    if (mend && mend.macro !== mend.macro.toLowerCase()) {
      diagnostics.push({
        message: mendMessage(mend.macro),
        lineNumber: macro.endLineNumber,
        startColumnNumber: mend.column,
        endColumnNumber: mend.column + mend.macro.length,
        severity
      })
    }
  })

  return diagnostics
}

/**
 * Lower cases the name in both places: every `@li` entry of the
 * `<h4> SAS Macros </h4>` header, and the name in each `%macro` and `%mend`
 * statement.
 *
 * Only the name is rewritten. Indentation, ordering, descriptions on an entry
 * and the rest of each line come back unchanged, and no line is added or
 * removed - which is what keeps the fix composable with the other formatting
 * passes.
 *
 * The header edit changes which file `sasjs compile` looks for, so a project
 * whose file is still `mf_GetUser.sas` reports a missing dependency after the
 * fix until the file is renamed. That pairing is the point of the rule and of
 * `lowerCaseFileNames`, and stating it here is cheaper than a fix that silently
 * half-applies.
 */
const fix = (value: string, config?: LintConfig): string => {
  if (!value) return value

  const cfg = config || new LintConfig()
  const lineEnding = cfg.lineEndings === LineEndings.CRLF ? '\r\n' : '\n'

  return lowerCaseDefinitions(lowerCaseHeaderEntries(value, cfg), cfg).join(
    lineEnding
  )
}

/** The lines of the file, with the declared macro names lower cased. */
const lowerCaseHeaderEntries = (
  value: string,
  config: LintConfig
): string[] => {
  const lines = splitText(value, config)

  getHeaderMacros(value, config).forEach((macro) => {
    if (macro.name === macro.name.toLowerCase()) return

    const index = macro.lineNumber - 1
    const line = lines[index]

    // The span was measured on this line by getHeaderMacros, from the same
    // splitText read, so it always lands on the name.
    const start = macro.startColumnNumber - 1
    const end = start + macro.name.length

    lines[index] =
      line.slice(0, start) +
      line.slice(start, end).toLowerCase() +
      line.slice(end)
  })

  return lines
}

/** The lines of the file, with the %macro and %mend names lower cased. */
const lowerCaseDefinitions = (
  lines: string[],
  config: LintConfig
): string[] => {
  parseMacros(lines.join('\n'), config).forEach((macro) => {
    const definitionLine = macro.startLineNumbers[0]
    if (definitionLine) lowerCaseNameInLine(lines, definitionLine, '%macro')

    if (macro.endLineNumber)
      lowerCaseNameInLine(lines, macro.endLineNumber, '%mend')
  })

  return lines
}

const lowerCaseNameInLine = (
  lines: string[],
  lineNumber: number,
  tag: string
) => {
  const index = lineNumber - 1
  const line = lines[index]

  const found = findName(line, tag)
  if (!found || found.macro === found.macro.toLowerCase()) return

  const start = found.column - 1
  lines[index] =
    line.slice(0, start) +
    line.slice(start, start + found.macro.length).toLowerCase() +
    line.slice(start + found.macro.length)
}

/**
 * Locates the name a statement carries: the token after `%macro` or `%mend`,
 * excluding the parenthesis that opens a macro's own argument list.
 */
const findName = (
  line: string,
  tag: string
): { macro: string; column: number } | null => {
  const match = new RegExp(`${escape(tag)}\\s+([\\w]+)`, 'i').exec(line)
  if (!match) return null

  const column = match.index + match[0].length - match[1].length + 1

  return { macro: match[1], column }
}

/**
 * Lint rule that checks macro names are lower case, in the header's
 * `<h4> SAS Macros </h4>` list and in the `%macro` / `%mend` statements, and
 * rewrites the name in both places.
 */
export const lowerCaseMacroNames: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test,
  fix
}
