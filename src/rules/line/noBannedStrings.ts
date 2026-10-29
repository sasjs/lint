import { Diagnostic, LintConfig } from '../../types'
import { LineLintRule, LineLintRuleOptions } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { defaultBannedStrings } from '../../utils'

const name = 'noBannedStrings'
const description =
  'Disallow configured strings, such as words that look like log messages'
const message = 'Line contains a banned string'

/**
 * Escapes a configured string so that it is matched literally. The list is
 * user supplied, so `{sas001}`, `(c)` and `[x]` have to survive the trip
 * through the RegExp constructor.
 */
const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The line that carries a per-file override is configuration rather than prose.
 * A file that adds a banned string writes that string in the override, so
 * without this the rule reports its own configuration.
 */
const overrideLine = /^[^\w]*@sasjslint\s*\{/

const test = (
  value: string,
  lineNumber: number,
  config?: LintConfig,
  options?: LineLintRuleOptions
) => {
  const diagnostics: Diagnostic[] = []

  // Source data is data, not code: a `datalines` payload may legitimately hold
  // the text `error ` in a value, and it is not something a developer can edit
  // away without changing the data.
  if (options?.isDataLine) return diagnostics
  if (overrideLine.test(value)) return diagnostics

  const severity = config?.severityLevel[name] || Severity.Warning
  const bannedStrings = config?.bannedStrings || defaultBannedStrings

  if (!bannedStrings.length) return diagnostics

  // Longest first, so a project that lists both `error:` and `error` reports the
  // more specific match rather than only the prefix of it.
  const patterns = [...bannedStrings].sort((a, b) => b.length - a.length)

  const claimed: boolean[] = new Array(value.length).fill(false)

  for (const bannedString of patterns) {
    // `g` to find every occurrence, `i` so that `Error`, `ERROR` and `error` are
    // the same banned string - case sensitivity is opt out, not opt in.
    const regex = new RegExp(escapeRegExp(bannedString), 'gi')

    let match
    while ((match = regex.exec(value))) {
      const start = match.index
      const end = start + match[0].length

      // A span already reported by a longer banned string is not reported again.
      if (claimed.slice(start, end).some(Boolean)) continue
      for (let index = start; index < end; index++) claimed[index] = true

      diagnostics.push({
        message: `${message}: "${match[0]}"`,
        lineNumber,
        startColumnNumber: start + 1,
        endColumnNumber: end,
        severity
      })
    }
  }

  return diagnostics.sort((a, b) => a.startColumnNumber - b.startColumnNumber)
}

/**
 * Lint rule that checks a given line of text for strings configured in
 * `bannedStrings`.
 */
export const noBannedStrings: LineLintRule = {
  type: LintRuleType.Line,
  name,
  description,
  message,
  test
}
