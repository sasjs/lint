import { Diagnostic, LintConfig } from '../../types'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import {
  getHeaderMacros,
  HeaderMacro,
  removeMacrosFromHeader
} from '../../utils/headerMacros'
import { parseMacroCalls } from '../../utils/parseMacroCalls'

const name = 'noUnusedMacros'
const description =
  'Report macros declared in the <h4> SAS Macros </h4> section that the file does not use.'
const message = `Macro '{macro}' is declared in the <h4> SAS Macros </h4> section but not used in the file`

/**
 * Collects the macros declared in the `<h4> SAS Macros </h4>` section that the
 * file itself never invokes. A macro that appears more than once is reported
 * once, at its first entry.
 */
const getUnusedMacros = (value: string, config: LintConfig): HeaderMacro[] => {
  if (!value) return []

  const used = new Set(
    parseMacroCalls(value, config).map((call) => call.name.toLowerCase())
  )

  const unused: HeaderMacro[] = []
  const reported = new Set<string>()

  getHeaderMacros(value, config)
    .filter((macro) => macro.section === 'sasMacros')
    .forEach((macro) => {
      const key = macro.name.toLowerCase()
      if (reported.has(key)) return
      reported.add(key)
      if (used.has(key)) return

      unused.push(macro)
    })

  return unused
}

const test = (value: string, config?: LintConfig): Diagnostic[] => {
  const cfg = config || new LintConfig()
  const severity = cfg.severityLevel[name] || Severity.Warning

  return getUnusedMacros(value, cfg).map((macro) => ({
    message: message.replace('{macro}', macro.name),
    lineNumber: macro.lineNumber,
    startColumnNumber: macro.startColumnNumber,
    endColumnNumber: macro.endColumnNumber,
    severity
  }))
}

const fix = (value: string, config?: LintConfig): string => {
  const cfg = config || new LintConfig()
  const macros = getUnusedMacros(value, cfg).map((macro) => macro.name)

  if (!macros.length) return value

  return removeMacrosFromHeader(value, cfg, macros)
}

/**
 * Lint rule that reports macros declared in the `<h4> SAS Macros </h4>` section
 * of a file header that the file itself never invokes. The formatter removes
 * them from the header.
 */
export const noUnusedMacros: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test,
  fix
}
