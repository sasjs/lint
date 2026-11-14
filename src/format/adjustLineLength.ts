import { LintConfig } from '../types'
import { LineEndings } from '../types/LineEndings'
import {
  checkIsDataLine,
  getDataSectionsDetail
} from '../utils/getDataSectionsDetail'
import { getHeaderLinesCount } from '../utils/getHeaderLinesCount'
import { getLintOverride } from '../utils/parseLintOverride'
import {
  breakAwareState,
  cleanState,
  macroComment,
  macroDeclaration,
  scanLine
} from './longLines'
import { splitWithTerminators } from './rewrapText'

/** The line that carries a file's own lint configuration. */
const overrideTag = /^(\s*)@sasjslint\s*(\{.*\})\s*$/

/** The three limits a long line can be excused by, and the key each one lives in. */
type LengthKey = 'maxLineLength' | 'maxHeaderLineLength' | 'maxDataLineLength'

/**
 * Raises the file's own `@sasjslint` exception so that the lines the passes
 * could not shorten stop being reported.
 *
 * The formatter can break most long lines, and `reflowComments` can reflow
 * prose, but a single token wider than the limit - a URL in a header, a long
 * quoted literal that generates code - cannot be shortened at all, and a data
 * record is not code. The documented way to accept those is the per-file
 * override, and projects do it by hand today (sasjs/core carries
 * `{"maxLineLength": 123}` for one documentation URL). This writes it for them,
 * at the exact length the longest such line needs and no more:
 *
 * - a header line raises `maxHeaderLineLength`, which affects header lines only
 * - a data record raises `maxDataLineLength`, which affects records only
 * - a body line raises `maxLineLength`, which affects the whole file
 *
 * Lines the wrapper declines on purpose - `put`-family statements, where a
 * break is an extra line of output, and `%macro` / `%mend` declarations - do NOT
 * raise the limit: they are fixable by hand, and excusing them would hide the
 * finding for good.
 *
 * The value is never lowered, an existing exception keeps every key it had, and
 * no header means nowhere to write, in which case the text is returned
 * untouched.
 *
 * @param {string} text - the text to adjust.
 * @param {LintConfig} configuration - the effective configuration, the file's
 *   own override included.
 * @returns {string} the text, with its exception raised when one is needed.
 */
export const adjustLineLength = (
  text: string,
  configuration: LintConfig
): string => {
  if (!text) return text

  if (
    !configuration.lineLintRules.some((rule) => rule.name === 'maxLineLength')
  )
    return text

  const headerLinesCount = getHeaderLinesCount(text, configuration)
  if (!headerLinesCount) return text

  const entries = splitWithTerminators(text)
  const lines = entries.map((entry) => entry.line)
  const dataSections = getDataSectionsDetail(text, configuration)
  const headerLimit = Math.max(
    configuration.maxLineLength,
    configuration.maxHeaderLineLength
  )
  const dataLimit = Math.max(
    configuration.maxLineLength,
    configuration.maxDataLineLength
  )
  const needed: { [key in LengthKey]: number } = {
    maxLineLength: 0,
    maxHeaderLineLength: 0,
    maxDataLineLength: 0
  }
  let state = cleanState()
  let breakAwareOpen = false

  lines.forEach((line, index) => {
    const scanned = scanLine(line, state)
    state = scanned.endState

    const breakAware = breakAwareState(scanned.code, breakAwareOpen)
    breakAwareOpen = breakAware.open

    const isHeader = index < headerLinesCount
    const isData = checkIsDataLine(dataSections, index)
    const limit = isData
      ? dataLimit
      : isHeader
        ? headerLimit
        : configuration.maxLineLength

    if (line.length <= limit) return
    if (
      breakAware.line ||
      macroComment.test(line) ||
      macroDeclaration.test(line)
    )
      return

    const key: LengthKey = isData
      ? 'maxDataLineLength'
      : isHeader
        ? 'maxHeaderLineLength'
        : 'maxLineLength'

    needed[key] = Math.max(needed[key], line.length)
  })

  const raised = (Object.keys(needed) as LengthKey[]).filter(
    (key) => needed[key] > configuration[key]
  )

  if (!raised.length) return text

  const override = getLintOverride(text, configuration)
  const existing = lines
    .slice(0, headerLinesCount)
    .find((line) => overrideTag.test(line))

  // A tag that does not parse is reported by the linter and belongs to its
  // author: rewriting it would discard whatever they were trying to say.
  if (existing && !override) return text

  const merged = { ...(override ?? {}) }
  raised.forEach((key) => {
    merged[key] = Math.max(merged[key] ?? 0, needed[key])
  })
  const json =
    '{' +
    Object.keys(merged)
      .map((key) => `"${key}": ${JSON.stringify(merged[key])}`)
      .join(', ') +
    '}'

  if (existing) {
    const match = overrideTag.exec(existing)!
    if (match[2] === json) return text

    const at = lines.indexOf(existing)
    const rewritten = [...lines]
    rewritten[at] = `${match[1]}@sasjslint ${json}`

    return rewritten.map((line, index) => line + entries[index].ending).join('')
  }

  // No exception yet: write one as the last content line of the header, which
  // is where sasjs/core keeps them, so the header's own layout is untouched.
  const closingIndex = headerLinesCount - 1
  const closing = lines[closingIndex]

  if (!/^\s*[*]{2}\/\s*$/.test(closing)) return text

  const previous = lines[closingIndex - 1]
  const indent = /^\s*/.exec(previous)![0] || '  '
  const ending = entries[closingIndex].ending || lineEndingOf(configuration)
  const separator = previous.trim() === '' ? [] : ['']
  const inserted = [...separator, `${indent}@sasjslint ${json}`]

  const out: string[] = lines
    .slice(0, closingIndex)
    .map((line, index) => line + entries[index].ending)

  inserted.forEach((line) => out.push(line + ending))

  lines.slice(closingIndex).forEach((line, index) => {
    out.push(line + entries[closingIndex + index].ending)
  })

  return out.join('')
}

/** The configured line ending, for the rare case a terminator has to be invented. */
export const lineEndingOf = (configuration: LintConfig): string =>
  configuration.lineEndings === LineEndings.CRLF ? '\r\n' : '\n'
