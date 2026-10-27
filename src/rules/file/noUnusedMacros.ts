import { Diagnostic, LintConfig } from '../../types'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import {
  getHeaderMacros,
  HeaderMacro,
  removeMacrosFromHeader,
  repairHeaderList
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
 *
 * The scan includes the argument of `%str` / `%nrstr`, because that text is
 * usually unquoted by its caller and the invocation runs: the guard idiom
 * `%mp_abort(iftrue=%str(%mf_existds(work.x)=1))` resolves `%mf_existds` when
 * `%mp_abort` evaluates the condition. Counting it as unused would report a
 * declaration the file depends on - and the formatter would then delete it.
 */
const getUnusedMacros = (value: string, config: LintConfig): HeaderMacro[] => {
  if (!value) return []

  // Every parsed name counts as a use, including one shorter than
  // `minMacroNameLength`: over-counting a use keeps a declaration, and
  // under-counting one has the formatter delete it.
  const used = new Set(
    parseMacroCalls(value, config, { includeMasked: true }).map((call) =>
      call.name.toLowerCase()
    )
  )

  const unused: HeaderMacro[] = []
  const reported = new Set<string>()

  getHeaderMacros(value, config).forEach((macro) => {
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

  const removed = macros.length
    ? removeMacrosFromHeader(value, cfg, macros)
    : value

  // The list is normalised even when nothing is removed: a mistyped `@li` tag
  // or a stray indentation is read as a declaration, so no diagnostic points
  // at it and no other pass would repair it.
  return repairHeaderList(removed, cfg)
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
