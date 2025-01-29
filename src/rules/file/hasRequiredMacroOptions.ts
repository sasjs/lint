import { Diagnostic, LintConfig, Macro, Severity } from '../../types'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { parseMacros } from '../../utils/parseMacros'

const name = 'hasRequiredMacroOptions'
const description = 'Enforce required macro options'
const message = 'Macro defined without required options'

const processOptions = (
  macro: Macro,
  diagnostics: Diagnostic[],
  config?: LintConfig
): void => {
  const optionsPresent = macro.declaration.split('/')?.[1]?.trim() ?? ''
  const severity = config?.severityLevel[name] || Severity.Warning

  config?.requiredMacroOptions.forEach((option) => {
    if (!optionsPresent.includes(option)) {
      diagnostics.push({
        message: `Macro '${macro.name}' does not contain the required option '${option}'`,
        lineNumber: macro.startLineNumbers[0],
        startColumnNumber: 0,
        endColumnNumber: 0,
        severity
      })
    }
  })
}

const test = (value: string, config?: LintConfig) => {
  const diagnostics: Diagnostic[] = []

  const macros = parseMacros(value, config)

  macros.forEach((macro) => {
    processOptions(macro, diagnostics, config)
  })

  return diagnostics
}

/**
 * Lint rule that checks if a macro has the required options
 */
export const hasRequiredMacroOptions: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
