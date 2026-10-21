import { Diagnostic } from '../../types/Diagnostic'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { getColumnNumber } from '../../utils/getColumnNumber'
import { parseMacros } from '../../utils/parseMacros'
import { splitLines } from '../../utils/splitLines'
import { LintConfig } from '../../types'

const name = 'noNestedMacros'
const description = 'Enfoces the absence of nested macro definitions.'
const message = `Macro definition for '{macro}' present in macro '{parent}'`

const test = (value: string, config?: LintConfig) => {
  const lines = splitLines(value)
  const diagnostics: Diagnostic[] = []
  const macros = parseMacros(value, config)
  const severity = config?.severityLevel[name] || Severity.Warning

  macros
    .filter((m) => !!m.parentMacro)
    .forEach((macro) => {
      diagnostics.push({
        message: message
          .replace('{macro}', macro.name)
          .replace('{parent}', macro.parentMacro),
        lineNumber: macro.startLineNumbers![0] as number,
        startColumnNumber: getColumnNumber(
          lines[(macro.startLineNumbers![0] as number) - 1],
          '%macro'
        ),
        endColumnNumber:
          getColumnNumber(
            lines[(macro.startLineNumbers![0] as number) - 1],
            '%macro'
          ) +
          lines[(macro.startLineNumbers![0] as number) - 1].trim().length -
          1,
        severity
      })
    })
  return diagnostics
}

/**
 * Lint rule that checks for the absence of nested macro definitions.
 */
export const noNestedMacros: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
