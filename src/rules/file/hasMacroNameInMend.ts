import { Diagnostic } from '../../types/Diagnostic'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { getColumnNumber } from '../../utils/getColumnNumber'
import { LintConfig } from '../../types'
import { LineEndings } from '../../types/LineEndings'
import { parseMacros } from '../../utils/parseMacros'

const name = 'hasMacroNameInMend'
const description =
  'Enforces the presence of the macro name in each %mend statement.'
const message = '%mend statement has missing or incorrect macro name'
const test = (value: string, config?: LintConfig) => {
  const lineEnding = config?.lineEndings === LineEndings.CRLF ? '\r\n' : '\n'
  const lines: string[] = value ? value.split(lineEnding) : []
  const macros = parseMacros(value, config)
  const diagnostics: Diagnostic[] = []
  macros.forEach((macro) => {
    if (macro.startLineNumber === null && macro.endLineNumber !== null) {
      diagnostics.push({
        message: `%mend statement is redundant`,
        lineNumber: macro.endLineNumber,
        startColumnNumber: getColumnNumber(
          lines[macro.endLineNumber - 1],
          '%mend'
        ),
        endColumnNumber:
          getColumnNumber(lines[macro.endLineNumber - 1], '%mend') +
          lines[macro.endLineNumber - 1].trim().length -
          1,
        severity: Severity.Warning
      })
    } else if (macro.endLineNumber === null && macro.startLineNumber !== null) {
      diagnostics.push({
        message: `Missing %mend statement for macro - ${macro.name}`,
        lineNumber: macro.startLineNumber,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      })
    } else if (macro.mismatchedMendMacroName) {
      diagnostics.push({
        message: `%mend statement has mismatched macro name, it should be '${
          macro!.name
        }'`,
        lineNumber: macro.endLineNumber as number,
        startColumnNumber: getColumnNumber(
          lines[(macro.endLineNumber as number) - 1],
          macro.mismatchedMendMacroName
        ),
        endColumnNumber:
          getColumnNumber(
            lines[(macro.endLineNumber as number) - 1],
            macro.mismatchedMendMacroName
          ) +
          macro.mismatchedMendMacroName.length -
          1,
        severity: Severity.Warning
      })
    } else if (!macro.hasMacroNameInMend) {
      diagnostics.push({
        message: `%mend statement is missing macro name - ${macro.name}`,
        lineNumber: macro.endLineNumber as number,
        startColumnNumber: getColumnNumber(
          lines[(macro.endLineNumber as number) - 1],
          '%mend'
        ),
        endColumnNumber:
          getColumnNumber(lines[(macro.endLineNumber as number) - 1], '%mend') +
          6,
        severity: Severity.Warning
      })
    }
  })

  return diagnostics
}

const fix = (value: string, config?: LintConfig): string => {
  const lineEnding = config?.lineEndings === LineEndings.CRLF ? '\r\n' : '\n'
  let formattedText = value
  const macros = parseMacros(value, config)
  macros
    .filter((macro) => !macro.hasMacroNameInMend)
    .forEach((macro) => {
      formattedText = formattedText.replace(
        macro.termination,
        `%mend ${macro.name};${lineEnding}`
      )
    })

  return formattedText
}

/**
 * Lint rule that checks for the presence of macro name in %mend statement.
 */
export const hasMacroNameInMend: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test,
  fix
}
