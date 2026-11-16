import { LintConfig } from '../types'
import { LineEndings } from '../types/LineEndings'
import {
  checkIsDataLine,
  getDataSectionsDetail
} from '../utils/getDataSectionsDetail'
import { getHeaderLinesCount } from '../utils/getHeaderLinesCount'
import { getLintOverride, startsDirective } from '../utils/parseLintOverride'
import { cleanState, noScan, scanLine } from '../utils/scanLine'
import { breakAwareState, macroComment, macroDeclaration } from './longLines'
import { splitWithTerminators } from './rewrapText'

/** The three limits a long line can be excused by, and the key each one lives in. */
type LengthKey = 'maxLineLength' | 'maxHeaderLineLength' | 'maxDataLineLength'

/**
 * The header lines a `@sasjslint` directive occupies.
 *
 * The object may span lines - `getLintOverride` reads a balanced one - so matching
 * the tag line alone misses it, and appending the exception as a second directive
 * leaves the file carrying two: `getLintOverride` reads the first, so the one this
 * pass wrote is dead and the long line it excused stays reported.
 *
 * @param lines - the file's lines, without their terminators
 * @param headerLinesCount - how many of them the header holds
 * @returns the first and last line of the directive, or null when there is none
 */
const directiveRange = (
  lines: string[],
  headerLinesCount: number
): { start: number; end: number } | null => {
  for (let start = 0; start < headerLinesCount; start++) {
    // The reader's own predicate: the tag starts the line and the object opens
    // straight after it. A prose line that merely mentions the tag is not a
    // directive, and treating one as the start of the range scans to the *real*
    // directive's closing brace - deleting every header line in between.
    if (!startsDirective(lines[start])) continue

    let depth = 0
    let opened = false
    let inString = false
    let escaped = false

    for (let index = start; index < headerLinesCount; index++) {
      for (const char of lines[index]) {
        if (inString) {
          if (escaped) escaped = false
          else if (char === '\\') escaped = true
          else if (char === '"') inString = false
          continue
        }

        if (char === '"') inString = true
        else if (char === '{') {
          depth++
          opened = true
        } else if (char === '}' && opened && --depth === 0)
          return { start, end: index }
      }
    }

    return { start, end: start }
  }

  return null
}

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
    const isHeader = index < headerLinesCount
    const isData = checkIsDataLine(dataSections, index)

    // A data record is data, so it is not scanned: a comment marker or an
    // apostrophe in one would otherwise stay open for the rest of the file, and
    // every later line would read as a comment that no pass may touch.
    const scanned = isData ? noScan() : scanLine(line, state)
    state = scanned.endState

    const breakAware = isData
      ? { line: false, open: false }
      : breakAwareState(scanned.code, breakAwareOpen)
    breakAwareOpen = breakAware.open
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

    // A comment carries no key of its own, so excusing one would raise the
    // limit for every line of code in the file: `reflowComments` has already
    // reflowed the prose, and a paragraph holding a word it cannot fit - a URL -
    // is left to its author. A header line is the exception, because
    // `maxHeaderLineLength` scopes the relaxation to the header.
    //
    // The guard turns on what makes the line long, not on the comment being
    // there: a line of code that overruns the limit on its own, with a comment
    // after it, is excused like any other, because no pass may break it either.
    const codeEnd = scanned.code.trimEnd().length
    if (!isHeader && !isData && scanned.hasComment && codeEnd <= limit) return

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
  const range = directiveRange(lines, headerLinesCount)

  // A tag that does not parse is reported by the linter and belongs to its
  // author: rewriting it would discard whatever they were trying to say.
  if (range && !override) return text

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

  if (range) {
    // The whole directive becomes one line holding everything that has to be
    // raised: one directive is all `getLintOverride` reads.
    const indent = /^\s*/.exec(lines[range.start])![0] || '  '
    const out: string[] = lines
      .slice(0, range.start)
      .map((line, index) => line + entries[index].ending)

    out.push(`${indent}@sasjslint ${json}${entries[range.start].ending}`)

    lines.slice(range.end + 1).forEach((line, index) => {
      out.push(line + entries[range.end + 1 + index].ending)
    })

    return out.join('')
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
