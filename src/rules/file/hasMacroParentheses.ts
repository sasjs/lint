import { Diagnostic } from '../../types/Diagnostic'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { getColumnNumber } from '../../utils/getColumnNumber'
import { parseMacros } from '../../utils/parseMacros'
import { LintConfig } from '../../types'

const name = 'hasMacroParentheses'
const description = 'Enforces the presence of parentheses in macro definitions.'
const message = 'Macro definition missing parentheses'
const test = (value: string, config?: LintConfig) => {
  const diagnostics: Diagnostic[] = []
  const macros = parseMacros(value, config)
  macros.forEach((macro) => {
    if (!macro.name) {
      diagnostics.push({
        message: 'Macro definition missing name',
        lineNumber: macro.startLineNumbers![0],
        startColumnNumber: getColumnNumber(
          macro.declarationLines![0],
          '%macro'
        ),
        endColumnNumber:
          getColumnNumber(macro.declarationLines![0], '%macro') +
          macro.declaration.length,
        severity: Severity.Warning
      })
    } else if (!macro.declarationLines.find((dl) => dl.includes('('))) {
      const macroNameLineIndex = macro.declarationLines.findIndex((dl) =>
        dl.includes(macro.name)
      )
      diagnostics.push({
        message,
        lineNumber: macro.startLineNumbers![macroNameLineIndex],
        startColumnNumber: getColumnNumber(
          macro.declarationLines[macroNameLineIndex],
          macro.name
        ),
        endColumnNumber:
          getColumnNumber(
            macro.declarationLines[macroNameLineIndex],
            macro.name
          ) +
          macro.name.length -
          1,
        severity: Severity.Warning
      })
      // } else if (macro.name !== macro.name.trim()) {
      //   diagnostics.push({
      //     message: 'Macro definition contains space(s)',
      //     lineNumber: macro.startLineNumber!,
      //     startColumnNumber: getColumnNumber(macro.declarationLine, macro.name),
      //     endColumnNumber:
      //       getColumnNumber(macro.declarationLine, macro.name) +
      //       macro.name.length -
      //       1 +
      //       `()`.length,
      //     severity: Severity.Warning
      //   })
    }
  })

  return diagnostics
}

/**
 * Lint rule that enforces the presence of parentheses in macro definitions..
 */
export const hasMacroParentheses: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
