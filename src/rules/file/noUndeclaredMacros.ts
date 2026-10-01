import { Diagnostic, LintConfig } from '../../types'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { addMacrosToHeader, getHeaderMacros } from '../../utils/headerMacros'
import { MacroCall, parseMacroCalls } from '../../utils/parseMacroCalls'
import { parseMacros } from '../../utils/parseMacros'
import { isSasMacro } from '../../utils/sasMacros'

const name = 'noUndeclaredMacros'
const description = 'Enforce that every macro used in a file is declared.'
const message = `Macro '{macro}' is not declared - add it to the <h4> SAS Macros </h4> or <h4> Other Macros </h4> section of the header`

/**
 * Collects the first invocation of each macro that the file uses but does not
 * declare. A macro is declared when it is defined in the file, or listed in the
 * `<h4> SAS Macros </h4>` or `<h4> Other Macros </h4>` section of its header.
 * Macros that ship with SAS are always considered declared.
 */
const getUndeclaredCalls = (value: string, config: LintConfig): MacroCall[] => {
  if (!value) return []

  const declared = new Set<string>()

  parseMacros(value, config).forEach((macro) => {
    if (macro.name) declared.add(macro.name.toLowerCase())
  })

  getHeaderMacros(value, config).forEach((macro) => {
    declared.add(macro.name.toLowerCase())
  })

  const undeclared: MacroCall[] = []
  const seen = new Set<string>()

  parseMacroCalls(value, config).forEach((call) => {
    const key = call.name.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)

    if (isSasMacro(call.name)) return
    if (declared.has(key)) return

    undeclared.push(call)
  })

  return undeclared
}

const test = (value: string, config?: LintConfig): Diagnostic[] => {
  const cfg = config || new LintConfig()
  const severity = cfg.severityLevel[name] || Severity.Warning

  return getUndeclaredCalls(value, cfg).map((call) => ({
    message: message.replace('{macro}', call.name),
    lineNumber: call.lineNumber,
    startColumnNumber: call.startColumnNumber,
    endColumnNumber: call.endColumnNumber,
    severity
  }))
}

const fix = (value: string, config?: LintConfig): string => {
  const cfg = config || new LintConfig()
  const macros = getUndeclaredCalls(value, cfg).map((call) => call.name)

  if (!macros.length) return value

  return addMacrosToHeader(value, cfg, macros)
}

/**
 * Lint rule that reports each macro a file uses without declaring it in the
 * header. The formatter resolves the warning by adding the macro names to the
 * `<h4> SAS Macros </h4>` section.
 */
export const noUndeclaredMacros: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test,
  fix
}
