import { Diagnostic, LintConfig } from '../../types'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { getUnusedLibnames, LibnameAssignment } from '../../utils/parseLibnames'

const name = 'noUnusedLibnames'
const description =
  'Report librefs that a file assigns and never uses in that file.'
const message = `Libref '{libref}' is assigned but never used in this file - remove the LIBNAME statement, or list the libref in 'ignoredLibnames'`

/**
 * Collects the librefs the file assigns and never mentions, leaving out the
 * ones the configuration lists in `ignoredLibnames`.
 *
 * A libref can be used by a file the linter never sees - an autoexec, an
 * `%include`d program, or another file in the same job - which is why the rule
 * is off by default and why the ignore list exists.
 */
const getUnused = (value: string, config: LintConfig): LibnameAssignment[] => {
  if (!value) return []

  const ignored = new Set(
    config.ignoredLibnames.map((libref) => libref.toLowerCase())
  )

  return getUnusedLibnames(value, config).filter(
    ({ libref }) => !ignored.has(libref.toLowerCase())
  )
}

const test = (value: string, config?: LintConfig): Diagnostic[] => {
  const cfg = config || new LintConfig()
  const severity = cfg.severityLevel[name] || Severity.Warning

  return getUnused(value, cfg).map((assignment) => ({
    message: message.replace('{libref}', assignment.libref),
    lineNumber: assignment.lineNumber,
    startColumnNumber: assignment.startColumnNumber,
    endColumnNumber: assignment.endColumnNumber,
    severity
  }))
}

/**
 * Lint rule that reports each libref a file assigns and never uses.
 *
 * The rule is off by default. A file is not a complete job, so a libref it
 * assigns can be used by an autoexec, by `%include`d code, or by another file
 * in the same SASjs flow - in the framework, by a secondary artefact. Enable it
 * per project with `noUnusedLibnames`, and list the librefs it should leave
 * alone in `ignoredLibnames`, or in the `@sasjslint` block of one file.
 *
 * There is no fix. The formatter cannot see the rest of the job, so the safe
 * correction is not knowable, and silencing every warning into the ignore list
 * would make the rule pointless.
 */
export const noUnusedLibnames: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
