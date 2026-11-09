import { Diagnostic, LintConfig } from '../../types'
import { LineEndings } from '../../types/LineEndings'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { DefaultLintConfiguration } from '../../utils/getLintConfig'
import { getPosition } from '../../utils/getPosition'
import { getSeverity } from '../../utils/getSeverity'

const name = 'hasDoxygenHeader'
const description =
  'Enforce a Doxygen header at the start of each file, in the /** ... **/ form.'
const message = 'File missing Doxygen header'
const messageForSingleAsterisk =
  'File not following Doxygen header style, use double asterisks'
const messageForSingleAsteriskClose =
  'File not following Doxygen header style, close with double asterisks'
const messageForCloseNotOnOwnLine =
  'File not following Doxygen header style, close with the marker on a line of its own'
const messageForUnclosedHeader =
  'File not following Doxygen header style, header is never closed'

const CLOSE = '*/'

/**
 * The close of a Doxygen header block, as found in the text.
 *
 * `own-line` is the form the rules and `sasjs compile` read: a line holding
 * nothing but the marker. `single` is a close written with one asterisk, which
 * the fix widens. `inline` is a close that shares its line with the header's
 * content - a one-line header, or a body line ending in the marker. `none`
 * means the block opens and never closes, so the rest of the file is inside it.
 */
type HeaderClose =
  | { kind: 'own-line'; index: number }
  | { kind: 'single'; index: number }
  | { kind: 'inline'; index: number }
  | { kind: 'none' }

/**
 * A diagnosis, plus the index of the close marker it points at.
 *
 * The fix and the test read the same diagnosis, so the marker the message names
 * and the marker the fix moves cannot drift apart. `close` is `null` for the
 * diagnoses that do not point at one.
 */
interface HeaderDiagnosis extends Diagnostic {
  close: number | null
}

/**
 * Locates the close of a header that opens at `start`.
 *
 * A header that holds a comment opener of its own is left alone: the first
 * close marker may belong to that comment rather than to the header, and that
 * ambiguity belongs to the author, not to a formatter. That is the only case
 * that answers `null`.
 */
const findHeaderClose = (value: string, start: number): HeaderClose | null => {
  const close = value.indexOf(CLOSE, start + 2)

  if (close === -1) return { kind: 'none' }

  // A comment opener before the close makes the extent ambiguous.
  if (value.slice(start + 2, close).includes('/*')) return null

  // A close written with one asterisk, which the fix widens.
  if (value[close - 1] !== '*') return { kind: 'single', index: close }

  // `close` points at the second asterisk of the marker. The line holds nothing
  // but the marker when the text before its first asterisk and after its slash
  // is whitespace only.
  const lineStart = value.lastIndexOf('\n', close - 1) + 1
  const lineEnd = value.indexOf('\n', close)
  const before = value.slice(lineStart, close - 1)
  const after = value.slice(close + 2, lineEnd === -1 ? value.length : lineEnd)

  return before.trim() === '' && after.trim() === ''
    ? { kind: 'own-line', index: close }
    : { kind: 'inline', index: close }
}

const diagnose = (
  value: string,
  config?: LintConfig
): HeaderDiagnosis | null => {
  const severity = getSeverity(config, name, Severity.Warning)

  try {
    const start = value.search(/\S/)

    if (value.trimStart().startsWith('/**')) {
      const close = findHeaderClose(value, start)

      // The block's extent is ambiguous - leave it to the author.
      if (close === null || close.kind === 'own-line') return null

      if (close.kind === 'none') {
        const { lineNumber, columnNumber } = getPosition(value, start)

        return {
          message: messageForUnclosedHeader,
          lineNumber,
          startColumnNumber: columnNumber,
          endColumnNumber: columnNumber + 3,
          severity,
          close: null
        }
      }

      const { lineNumber, columnNumber } = getPosition(value, close.index)
      const inline = close.kind === 'inline'

      return {
        message: inline
          ? messageForCloseNotOnOwnLine
          : messageForSingleAsteriskClose,
        lineNumber,
        startColumnNumber: columnNumber,
        endColumnNumber: columnNumber + (inline ? 2 : 1),
        severity,
        close: close.index
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
        close: null
      }

    return {
      message,
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity,
      close: null
    }
  } catch (e) {
    return {
      message,
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity,
      close: null
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

/**
 * Puts a close marker on a line of its own, moving any text that followed the
 * marker onto the next line. A close that overlaps the opener - an empty
 * comment - has no body to keep, so the whole block is rewritten.
 *
 * `close` is the index of the second asterisk of the marker, as `indexOf` finds
 * it, so the marker itself starts one character earlier.
 */
const expandClose = (value: string, close: number, start: number): string => {
  const lineEnding = value.includes('\r\n') ? '\r\n' : '\n'

  if (close <= start + 2) {
    return `${value.slice(0, start)}/**${lineEnding}**/${value.slice(close + 2)}`
  }

  const markerStart = close - 1
  const head = value.slice(0, markerStart).replace(/[ \t]+$/, '')
  const lineEnd = value.indexOf('\n', close)
  const after = value.slice(close + 2, lineEnd === -1 ? value.length : lineEnd)

  if (after.trim() === '')
    return `${head}${lineEnding}${value.slice(markerStart)}`

  const rest = value.slice(lineEnd === -1 ? value.length : lineEnd)

  return `${head}${lineEnding}${value.slice(markerStart, close + 2)}${lineEnding}${after.trimStart()}${rest}`
}

/**
 * Applies the repair a diagnosis calls for, or returns the text unchanged when
 * it has none. `hasDoxygenHeader` repairs one defect per call so that the
 * diagnosis and the repair cannot drift apart; `fix` below keeps calling it
 * until the header is clean.
 */
const repair = (
  value: string,
  diagnosis: HeaderDiagnosis,
  config?: LintConfig
): string => {
  if (diagnosis.message == messageForSingleAsterisk)
    return value.replace('/*', '/**')

  if (diagnosis.message == messageForSingleAsteriskClose)
    return `${value.slice(0, diagnosis.close as number)}*${value.slice(
      diagnosis.close as number
    )}`

  if (diagnosis.message == messageForCloseNotOnOwnLine)
    return expandClose(value, diagnosis.close as number, value.search(/\S/))

  // An unclosed header has no safe repair: closing it at the end of the file
  // would swallow whatever the author meant to keep outside it. The warning
  // stays for the author to resolve.
  if (diagnosis.message == messageForUnclosedHeader) return value

  const cfg = config || new LintConfig(DefaultLintConfiguration)
  const lineEndingConfig = cfg?.lineEndings || LineEndings.LF
  const lineEnding = lineEndingConfig === LineEndings.LF ? '\n' : '\r\n'

  return `${cfg?.defaultHeader.replace(
    /{lineEnding}/g,
    lineEnding
  )}${lineEnding}${value}`
}

/**
 * Repairs a header until it is clean, or until a repair stops changing the
 * text.
 *
 * One header can hold more than one defect, and the formatter calls a rule's
 * `fix` once per pass - a single-line comment in the single-asterisk form needs
 * the opener widened, the close widened, and then the close moved onto a line
 * of its own. Repairing a single defect leaves the file warning again after the
 * pass, and leaves `noUndeclaredMacros` switched off for it, so the remaining
 * repairs are taken here. Each repair moves the header strictly closer to the
 * target shape, and the bound stops a repair that somehow does not.
 */
const fix = (value: string, config?: LintConfig): string => {
  let repaired = value

  for (let step = 0; step < 3; step++) {
    const diagnosis = diagnose(repaired, config)

    if (!diagnosis) return repaired

    const next = repair(repaired, diagnosis, config)
    if (next === repaired) return repaired

    repaired = next
  }

  return repaired
}

// Lint rule that checks for a Doxygen header in the double-asterisk form at the
// start of a given file: the opening check, the closing checks (one asterisk,
// a close that shares its line, and a block that never closes), and the fixes
// that widen a single-asterisk close or move a close onto a line of its own.
export const hasDoxygenHeader: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test,
  fix
}
