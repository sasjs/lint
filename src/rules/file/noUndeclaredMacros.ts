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
const message = `Macro '{macro}' is not declared - add it to the <h4> SAS Macros </h4> section of the header, or list the macro in 'ignoredMacros'`

/**
 * Collects the first invocation of each macro that the file uses but does not
 * declare. A macro is declared when it is defined in the file, or listed in the
 * `<h4> SAS Macros </h4>` section of its header - the only header list that
 * `sasjs compile` reads.
 * Macros that ship with SAS are always considered declared, and so are the
 * names the configuration lists in `ignoredMacros` - a macro such as `%webout`
 * has no file to point at.
 *
 * The scan leaves out the argument of `%str` / `%nrstr`: a file that masks a
 * trigger usually does so to print it, and reporting it would be a new warning
 * on text that never runs at that point. `noUnusedMacros` counts those names,
 * which is the conservative direction - a deferred invocation satisfies a
 * declaration without ever demanding one.
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

  const ignored = new Set<string>(
    config.ignoredMacros.map((macro) => macro.trim().toLowerCase())
  )

  const undeclared: MacroCall[] = []
  const seen = new Set<string>()

  parseMacroCalls(value, config).forEach((call) => {
    const key = call.name.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)

    // A name shorter than the floor is not a macro name: Lua and printf put
    // `%s(` and friends inside strings. The `minMacroNameLength` rule reports
    // a definition that short, so the two agree about what a name is.
    if (call.name.length < (config.minMacroNameLength ?? 3)) return

    // In a string a name is a call when an opening parenthesis follows it: a
    // generated program calls a macro that way, while a SQL LIKE pattern or a
    // conversion specifier has nothing after the name. The test lives here and
    // not in the parser because noUnusedMacros counts every name - a use it
    // misses is a declaration the formatter deletes.
    if (call.quoted && !call.hasParen) return

    if (isSasMacro(call.name)) return
    if (ignored.has(key)) return
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
