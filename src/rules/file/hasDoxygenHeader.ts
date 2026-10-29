import { Diagnostic, LintConfig } from '../../types'
import { LineEndings } from '../../types/LineEndings'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { DefaultLintConfiguration } from '../../utils/getLintConfig'
import { getPosition } from '../../utils/getPosition'

const name = 'hasDoxygenHeader'
const description =
  'Enforce a Doxygen header at the start of each file, in the /** ... **/ form.'
const message = 'File missing Doxygen header'
const messageForSingleAsterisk =
  'File not following Doxygen header style, use double asterisks'
const messageForSingleAsteriskClose =
  'File not following Doxygen header style, close with double asterisks'

const CLOSE = '*/'

/**
 * A diagnosis, plus the index of the close marker it points at.
 *
 * The fix and the test read the same diagnosis, so the marker the message names
 * and the marker the fix widens cannot drift apart. `close` is -1 for the
 * diagnoses that do not point at one.
 */
interface HeaderDiagnosis extends Diagnostic {
  close: number
}

/**
 * Finds a header that opens in the Doxygen form but closes with a single
 * asterisk, which is the closer half of the same style the opening check
 * enforces.
 *
 * A header that holds a comment opener of its own is left alone: the first
 * close marker may belong to that comment rather than to the header, and that
 * ambiguity belongs to the author, not to a formatter.
 *
 * @returns the index of the close marker to widen, or `null`.
 */
const singleAsteriskClose = (value: string, start: number) => {
  const close = value.indexOf(CLOSE, start + 2)

  if (close === -1) return null

  // Already closed in the Doxygen form.
  if (value[close - 1] === '*') return null

  // A comment opener before the close makes the extent ambiguous.
  if (value.slice(start + 2, close).includes('/*')) return null

  return close
}

const diagnose = (
  value: string,
  config?: LintConfig
): HeaderDiagnosis | null => {
  const severity = config?.severityLevel[name] || Severity.Warning

  try {
    const start = value.search(/\S/)

    if (value.trimStart().startsWith('/**')) {
      const close = singleAsteriskClose(value, start)

      if (close === null) return null

      const { lineNumber, columnNumber } = getPosition(value, close)

      return {
        message: messageForSingleAsteriskClose,
        lineNumber,
        startColumnNumber: columnNumber,
        endColumnNumber: columnNumber + 1,
        severity,
        close
      }
    }

    const hasFileHeaderWithSingleAsterisk = value.trimStart().startsWith('/*')
    if (hasFileHeaderWithSingleAsterisk)
      return {
        message: messageForSingleAsterisk,
        lineNumber: (value.split('/*')![0]!.match(/\r\n|\n/g) ?? []).length + 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity,
        close: -1
      }

    return {
      message,
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity,
      close: -1
    }
  } catch (e) {
    return {
      message,
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity,
      close: -1
    }
  }
}

const test = (value: string, config?: LintConfig) => {
  const diagnosis = diagnose(value, config)

  if (!diagnosis) return []

  return [
    {
      message: diagnosis.message,
      lineNumber: diagnosis.lineNumber,
      startColumnNumber: diagnosis.startColumnNumber,
      endColumnNumber: diagnosis.endColumnNumber,
      severity: diagnosis.severity
    }
  ]
}

const fix = (value: string, config?: LintConfig): string => {
  const diagnosis = diagnose(value, config)

  if (!diagnosis) return value

  if (diagnosis.message == messageForSingleAsterisk)
    return value.replace('/*', '/**')

  if (diagnosis.message == messageForSingleAsteriskClose)
    return `${value.slice(0, diagnosis.close)}*${value.slice(diagnosis.close)}`

  config = config || new LintConfig(DefaultLintConfiguration)
  const lineEndingConfig = config?.lineEndings || LineEndings.LF
  const lineEnding = lineEndingConfig === LineEndings.LF ? '\n' : '\r\n'

  return `${config?.defaultHeader.replace(
    /{lineEnding}/g,
    lineEnding
  )}${lineEnding}${value}`
}

// Lint rule that checks for a Doxygen header in the double-asterisk form at the
// start of a given file: the opening check, the closing check, and the fix that
// widens a single-asterisk close so the truncation rule can locate the header's
// end.
export const hasDoxygenHeader: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test,
  fix
}
