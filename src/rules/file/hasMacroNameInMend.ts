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
      const endLine = lines[macro.endLineNumber - 1]
      diagnostics.push({
        message: `%mend statement is redundant`,
        lineNumber: macro.endLineNumber,
        startColumnNumber: getColumnNumber(endLine, '%mend'),
        endColumnNumber:
          getColumnNumber(endLine, '%mend') +
          macro.terminationTrimmedStatement.length,
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
      const endLine = lines[(macro.endLineNumber as number) - 1]
      diagnostics.push({
        message: `%mend statement has mismatched macro name, it should be '${
          macro!.name
        }'`,
        lineNumber: macro.endLineNumber as number,
        startColumnNumber: getColumnNumber(
          endLine,
          macro.mismatchedMendMacroName
        ),
        endColumnNumber:
          getColumnNumber(endLine, macro.mismatchedMendMacroName) +
          macro.mismatchedMendMacroName.length -
          1,
        severity: Severity.Warning
      })
    } else if (!macro.hasMacroNameInMend) {
      const endLine = lines[(macro.endLineNumber as number) - 1]
      diagnostics.push({
        message: `%mend statement is missing macro name - ${macro.name}`,
        lineNumber: macro.endLineNumber as number,
        startColumnNumber: getColumnNumber(endLine, '%mend'),
        endColumnNumber: getColumnNumber(endLine, '%mend') + 6,
        severity: Severity.Warning
      })
    }
  })

  return diagnostics
}

const fix = (value: string, config?: LintConfig): string => {
  const lineEnding = config?.lineEndings === LineEndings.CRLF ? '\r\n' : '\n'
  const lines: string[] = value ? value.split(lineEnding) : []
  const macros = parseMacros(value, config)

  macros.forEach((macro) => {
    if (macro.startLineNumber === null && macro.endLineNumber !== null) {
      // %mend statement is redundant
      const endLine = lines[macro.endLineNumber - 1]
      const startColumnNumber = getColumnNumber(endLine, '%mend')
      const endColumnNumber =
        getColumnNumber(endLine, '%mend') +
        macro.terminationTrimmedStatement.length

      const beforeStatement = endLine.slice(0, startColumnNumber - 1)
      const afterStatement = endLine.slice(endColumnNumber)
      lines[macro.endLineNumber - 1] = beforeStatement + afterStatement
    } else if (macro.endLineNumber === null && macro.startLineNumber !== null) {
      // missing %mend statement
    } else if (macro.mismatchedMendMacroName) {
      // mismatched macro name
      const endLine = lines[(macro.endLineNumber as number) - 1]
      const startColumnNumber = getColumnNumber(
        endLine,
        macro.mismatchedMendMacroName
      )
      const endColumnNumber =
        getColumnNumber(endLine, macro.mismatchedMendMacroName) +
        macro.mismatchedMendMacroName.length -
        1

      const beforeMacroName = endLine.slice(0, startColumnNumber - 1)
      const afterMacroName = endLine.slice(endColumnNumber)

      lines[(macro.endLineNumber as number) - 1] =
        beforeMacroName + macro.name + afterMacroName
    } else if (!macro.hasMacroNameInMend) {
      // %mend statement is missing macro name
      const endLine = lines[(macro.endLineNumber as number) - 1]
      const startColumnNumber = getColumnNumber(endLine, '%mend')
      const endColumnNumber = getColumnNumber(endLine, '%mend') + 4

      const beforeStatement = endLine.slice(0, startColumnNumber - 1)
      const afterStatement = endLine.slice(endColumnNumber)
      lines[(macro.endLineNumber as number) - 1] =
        beforeStatement + `%mend ${macro.name}` + afterStatement
    }
  })
  const formattedText = lines.join(lineEnding)

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
