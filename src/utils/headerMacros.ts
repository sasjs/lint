import { LintConfig } from '../types'
import { LineEndings } from '../types/LineEndings'
import { getHeaderLinesCount } from './getHeaderLinesCount'
import { splitText } from './splitText'

/**
 * A macro that is declared in the `<h4> SAS Macros </h4>` section of a header,
 * along with the position of its `@li` entry.
 */
export interface HeaderMacro {
  name: string
  lineNumber: number
  startColumnNumber: number
  endColumnNumber: number
}

/** One `@li` entry, as found in a header. */
interface HeaderEntry {
  name: string
  /** Everything after the tag: `mf_trim.sas`, or `mf_trim.sas - description`. */
  payload: string
  lineNumber: number
  /** 1-based column at which the macro name starts. */
  column: number
}

const sasMacrosHeader = /<h4>\s*SAS Macros\s*<\/h4>/i
const anyHeader = /<h4>/i
const headerTag = '</h4>'
const listItem = /^(\s*@\s*)(\w+)(\s+)(\S+)(.*)$/
const lineTag = /^\s*@\s*(\w+)(?:\s|$)/

/**
 * The tags read as an entry: `li` itself, and the single-character slips that
 * turn it into `il`, `l1` or `1i`. A line opening with any other tag is not an
 * entry, and it is never converted into a macro declaration.
 */
const entryTags = new Set(['li', 'il', 'l1', '1i'])

/** The tag a line opens with, lowercased, or `null` for a line with none. */
const getLineTag = (line: string): string | null => {
  const match = lineTag.exec(line)
  return match ? match[1].toLowerCase() : null
}

/**
 * Reads an entry, returning the macro name, the file token after the tag, and
 * the column at which the name starts. The column is derived from the entry
 * text rather than from a search for the name, so an entry such as `@li li.sas`
 * reports the `li` after the tag, not the `li` inside it.
 *
 * The entry is the tag and one file token, and nothing after the token: the
 * section is maintained by the formatter, and reading prose as a declaration is
 * how a sentence on an `@li` line ends up rewritten or removed as an unused
 * entry.
 *
 * A tag one slip away from `li` is read the same way, so `@il mf_a.sas` - the
 * commonest way to mistype the tag - is a declaration rather than the end of
 * the list. The formatter writes such an entry back with `@li`, so the typo is
 * repaired instead of being reported forever or silently truncating the list.
 *
 * @param {string} text - the line, or the tail of a line, to read.
 * @param {number} offset - the 0-based column at which `text` starts in the
 * line, so a trailing entry on a `<h4>` line still reports its real position.
 */
const parseListItem = (
  text: string,
  offset = 0
): { name: string; payload: string; column: number } | null => {
  const match = listItem.exec(text)
  if (!match) return null

  const [, prefix, tag, gap, payload, tail] = match
  if (!entryTags.has(tag.toLowerCase())) return null
  if (tail.trim() !== '') return null

  const normalised = payload.replace(/\\/g, '/')
  const fileName = normalised.split('/').pop() || ''
  const name = fileName.replace(/\.sas$/i, '')
  if (!name) return null

  const fileOffset = normalised.lastIndexOf('/') + 1
  const column =
    offset + prefix.length + tag.length + gap.length + fileOffset + 1

  return { name, payload, column }
}

/**
 * Reads the `@li` entries of a section that starts at `sectionIndex`.
 *
 * A blank line ends the list unless the next non-blank line opens with an
 * entry tag, so a list broken up by a stray blank line is still read in full -
 * the formatter rewrites exactly the lines it read, and an entry it did not
 * read would be left behind and duplicated.
 *
 * A line that opens with an entry tag but cannot be read as one - `@li` with no
 * file, or a file followed by other words - does not end the list: the scan
 * records it and keeps reading, so one unreadable line cannot hide the
 * declarations below it. The section then cannot be rewritten safely, because
 * the rewrite would replace the span that line sits in.
 *
 * Any other line ends the list, including one that opens with an unrelated tag
 * (`@example`, `@param`). The entries above it are still readable and still
 * rewritable, so the formatter keeps maintaining the list it understands and
 * leaves the rest of the header alone.
 *
 * @param {number} limit - the last line index the header can occupy.
 * @returns the entries, the index of the first line after the last one, and
 * the indices of the entry-tagged lines the scan could not read.
 */
const readSectionList = (
  lines: string[],
  sectionIndex: number,
  limit: number
): { entries: HeaderEntry[]; end: number; malformed: number[] } => {
  const entries: HeaderEntry[] = []
  const malformed: number[] = []
  let end = sectionIndex + 1
  let index = sectionIndex + 1

  while (index < limit && index < lines.length) {
    const line = lines[index]

    if (line.trim() === '') {
      let next = index
      while (next < limit && next < lines.length && lines[next].trim() === '') {
        next++
      }
      const tag =
        next < limit && next < lines.length ? getLineTag(lines[next]) : null
      if (tag && entryTags.has(tag)) {
        index = next
        continue
      }
      break
    }

    const parsed = parseListItem(line)
    if (!parsed) {
      const tag = getLineTag(line)
      if (!tag || !entryTags.has(tag)) break
      malformed.push(index)
      index++
      continue
    }

    entries.push({
      name: parsed.name,
      payload: parsed.payload,
      lineNumber: index + 1,
      column: parsed.column
    })
    index++
    end = index
  }

  return { entries, end, malformed }
}

/**
 * Reads the macros declared in the `<h4> SAS Macros </h4>` section of a file
 * header - the compile dependencies, and the only list `sasjs compile` reads.
 * @param {string} text - the text content of the file.
 * @param {LintConfig} config - the lint configuration, used for line endings.
 * @returns {HeaderMacro[]} the declared macros, in the order they appear.
 */
export const getHeaderMacros = (
  text: string,
  config?: LintConfig
): HeaderMacro[] => {
  if (!text) return []

  const cfg = config || new LintConfig()
  const headerLinesCount = getHeaderLinesCount(text, cfg)
  if (!headerLinesCount) return []

  const lines = splitText(text, cfg)
  const macros: HeaderMacro[] = []

  for (
    let index = 0;
    index < headerLinesCount && index < lines.length;
    index++
  ) {
    const line = lines[index]

    if (!sasMacrosHeader.test(line)) continue

    // An entry can share the line with the section tag.
    const tagEnd = line.indexOf(headerTag) + headerTag.length
    const trailing = parseListItem(line.slice(tagEnd), tagEnd)
    if (trailing) {
      macros.push({
        name: trailing.name,
        lineNumber: index + 1,
        startColumnNumber: trailing.column,
        endColumnNumber: trailing.column + trailing.name.length
      })
    }

    readSectionList(lines, index, headerLinesCount).entries.forEach((entry) => {
      macros.push({
        name: entry.name,
        lineNumber: entry.lineNumber,
        startColumnNumber: entry.column,
        endColumnNumber: entry.column + entry.name.length
      })
    })
  }

  return macros
}

/**
 * Derives the indentation used by the content lines of a header. Falls back to
 * two spaces, which is the indentation of the default header.
 */
const getHeaderIndent = (lines: string[], headerLinesCount: number): string => {
  for (
    let index = 1;
    index < headerLinesCount && index < lines.length;
    index++
  ) {
    const match = /^(\s+)\S/.exec(lines[index])
    if (match) return match[1]
  }

  return '  '
}

/**
 * Ensures a blank line separates a header section from its neighbours. The
 * section header sits at `sectionIndex` and `listEnd` is the index of the first
 * line after the section's `@li` entries.
 */
const withSectionSpacing = (
  lines: string[],
  sectionIndex: number,
  listEnd: number
): string[] => {
  const result = [...lines]

  if (listEnd < result.length && result[listEnd].trim() !== '') {
    result.splice(listEnd, 0, '')
  }

  if (sectionIndex > 0 && result[sectionIndex - 1].trim() !== '') {
    result.splice(sectionIndex, 0, '')
  }

  return result
}

/**
 * Locates the `<h4> SAS Macros </h4>` section of a header.
 *
 * Returns `null` when the section is absent, and `null` when it cannot be
 * rewritten without disturbing the surrounding text: when the section shares a
 * line with the header's closing `**`, when an `@li` entry shares the line
 * with the section tag, or when the list carries a line the reader could not
 * turn into an entry. In those cases the caller leaves the file alone, so a
 * warning that cannot be resolved is preferable to a corrupted header.
 */
const findSasMacrosSection = (
  lines: string[],
  headerLinesCount: number
): { sectionIndex: number; entries: HeaderEntry[]; end: number } | null => {
  let sectionIndex = -1
  for (
    let index = 0;
    index < headerLinesCount && index < lines.length;
    index++
  ) {
    if (sasMacrosHeader.test(lines[index])) {
      sectionIndex = index
      break
    }
  }

  if (sectionIndex === -1) return null
  if (sectionIndex === headerLinesCount - 1) return null

  const tagEnd = lines[sectionIndex].indexOf(headerTag) + headerTag.length
  if (parseListItem(lines[sectionIndex].slice(tagEnd))) return null

  const { entries, end, malformed } = readSectionList(
    lines,
    sectionIndex,
    headerLinesCount
  )

  // An unreadable line sits inside the span the rewrite replaces, so rewriting
  // would delete it. Leave the section to its author instead.
  if (malformed.length) return null

  return { sectionIndex, entries, end }
}

/**
 * Writes an entry back to a header line. The tag is always `@li`, the payload
 * is the single file token the reader accepted, and the indentation is the
 * section's - so a mistyped tag (`@il`) and entries indented to a different
 * width are repaired by the same pass that rewrites the list.
 */
const formatEntry = (entry: HeaderEntry, indent: string): string =>
  `${indent}@li ${entry.payload}`

/**
 * Adds macro names to the `<h4> SAS Macros </h4>` section of a file header,
 * merging them with the entries that are already listed, de-duplicating by
 * name, and sorting the result alphabetically. A new section is added when the
 * header has none.
 *
 * A blank line separates the section from the header content before it and from
 * whatever follows the list, so the section reads as its own block.
 *
 * @param {string} text - the text content of the file.
 * @param {LintConfig} config - the lint configuration, used for line endings.
 * @param {string[]} macros - the macro names to add.
 * @returns {string} the updated text content.
 */
export const addMacrosToHeader = (
  text: string,
  config: LintConfig,
  macros: string[]
): string => {
  if (!text || !macros.length) return text

  const headerLinesCount = getHeaderLinesCount(text, config)
  if (!headerLinesCount) return text

  const lines = splitText(text, config)
  const lineEnding = config.lineEndings === LineEndings.CRLF ? '\r\n' : '\n'
  const headerEndIndex = headerLinesCount - 1

  const section = findSasMacrosSection(lines, headerLinesCount)

  if (!section) {
    // No section, or one that cannot be rewritten. Only a genuinely absent
    // section is safe to create, so check for the tag first.
    const hasSection = lines
      .slice(0, headerLinesCount)
      .some((line) => sasMacrosHeader.test(line))
    if (hasSection || headerEndIndex === 0) return text

    const indent = getHeaderIndent(lines, headerLinesCount)
    const sectionLines = [
      `${indent}<h4> SAS Macros </h4>`,
      ...macros.map((macro) => `${indent}@li ${macro}.sas`)
    ]

    const result = [
      ...lines.slice(0, headerEndIndex),
      ...sectionLines,
      ...lines.slice(headerEndIndex)
    ]

    return withSectionSpacing(
      result,
      headerEndIndex,
      headerEndIndex + sectionLines.length
    ).join(lineEnding)
  }

  const { sectionIndex, entries, end } = section
  const indent = (lines[sectionIndex].match(/^\s*/) as RegExpMatchArray)[0]

  const byName = new Map<string, { name: string; payload: string }>()
  entries.forEach((entry) => {
    const key = entry.name.toLowerCase()
    if (!byName.has(key))
      byName.set(key, { name: entry.name, payload: entry.payload })
  })
  macros.forEach((macro) => {
    const key = macro.toLowerCase()
    if (byName.has(key)) return
    byName.set(key, { name: macro, payload: `${macro}.sas` })
  })

  const sortedLines = [...byName.values()]
    .sort((a, b) => compareMacroNames(a.name, b.name))
    .map((entry) => `${indent}@li ${entry.payload}`)

  const result = [
    ...lines.slice(0, sectionIndex + 1),
    ...sortedLines,
    ...lines.slice(end)
  ]

  return withSectionSpacing(
    result,
    sectionIndex,
    sectionIndex + 1 + sortedLines.length
  ).join(lineEnding)
}

/**
 * Writes the entries of the `<h4> SAS Macros </h4>` section back in their
 * canonical shape, in place: `@li <file>` at the section's indentation.
 *
 * A mistyped tag (`@il`) and an entry indented to a different width are both
 * read as declarations, so no diagnostic points at them and no other pass
 * would touch them - this is the pass that repairs them. It edits only the
 * lines whose text differs, so it never adds or removes a line, never re-spaces
 * the section, and returns the text unchanged when there is nothing to repair
 * or when the section cannot be rewritten safely.
 *
 * @param {string} text - the text content of the file.
 * @param {LintConfig} config - the lint configuration, used for line endings.
 * @returns {string} the updated text content.
 */
export const repairHeaderList = (text: string, config: LintConfig): string => {
  if (!text) return text

  const headerLinesCount = getHeaderLinesCount(text, config)
  if (!headerLinesCount) return text

  const lines = splitText(text, config)
  const section = findSasMacrosSection(lines, headerLinesCount)
  if (!section) return text

  const { sectionIndex, entries } = section
  const indent = (lines[sectionIndex].match(/^\s*/) as RegExpMatchArray)[0]
  const lineEnding = config.lineEndings === LineEndings.CRLF ? '\r\n' : '\n'

  const repaired = [...lines]
  let changed = false

  entries.forEach((entry) => {
    const index = entry.lineNumber - 1
    const formatted = formatEntry(entry, indent)
    if (lines[index] === formatted) return
    repaired[index] = formatted
    changed = true
  })

  return changed ? repaired.join(lineEnding) : text
}

/**
 * Removes macro names from the `<h4> SAS Macros </h4>` section of a file
 * header. The section header itself is kept, so an empty list remains a valid
 * place for the formatter to add entries. The blank line before the section and
 * after the list is preserved.
 *
 * The file is returned unchanged when it has no Doxygen header, when the header
 * has no `SAS Macros` section, when the section cannot be rewritten safely, or
 * when none of the named macros are listed. Normalising the entries is the job
 * of `repairHeaderList`.
 *
 * @param {string} text - the text content of the file.
 * @param {LintConfig} config - the lint configuration, used for line endings.
 * @param {string[]} macros - the macro names to remove.
 * @returns {string} the updated text content.
 */
export const removeMacrosFromHeader = (
  text: string,
  config: LintConfig,
  macros: string[]
): string => {
  if (!text || !macros.length) return text

  const headerLinesCount = getHeaderLinesCount(text, config)
  if (!headerLinesCount) return text

  const lines = splitText(text, config)
  const lineEnding = config.lineEndings === LineEndings.CRLF ? '\r\n' : '\n'

  const section = findSasMacrosSection(lines, headerLinesCount)
  if (!section) return text

  const { sectionIndex, entries, end } = section
  const indent = (lines[sectionIndex].match(/^\s*/) as RegExpMatchArray)[0]
  const remove = new Set(macros.map((macro) => macro.toLowerCase()))
  const kept: string[] = []
  const seen = new Set<string>()
  let changed = false

  entries.forEach((entry) => {
    const key = entry.name.toLowerCase()
    if (remove.has(key)) {
      changed = true
      return
    }
    if (seen.has(key)) {
      // A duplicate entry for a macro that is kept.
      changed = true
      return
    }
    seen.add(key)
    kept.push(formatEntry(entry, indent))
  })

  if (!changed) return text

  const result = [
    ...lines.slice(0, sectionIndex + 1),
    ...kept,
    ...lines.slice(end)
  ]

  return withSectionSpacing(
    result,
    sectionIndex,
    sectionIndex + 1 + kept.length
  ).join(lineEnding)
}

const compareMacroNames = (a: string, b: string): number =>
  a.toLowerCase().localeCompare(b.toLowerCase())
