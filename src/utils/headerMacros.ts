import { LintConfig } from '../types'
import { LineEndings } from '../types/LineEndings'
import { getHeaderLinesCount } from './getHeaderLinesCount'
import { splitText } from './splitText'

/**
 * A macro that is declared in the header of a file, along with the position of
 * its `@li` entry.
 */
export interface HeaderMacro {
  name: string
  lineNumber: number
  startColumnNumber: number
  endColumnNumber: number
  section: 'sasMacros' | 'otherMacros'
}

/** One `@li` entry, as found in a header. */
interface HeaderEntry {
  name: string
  line: string
  lineNumber: number
  /** 1-based column at which the macro name starts. */
  column: number
}

const sasMacrosHeader = /<h4>\s*SAS Macros\s*<\/h4>/i
const otherMacrosHeader = /<h4>\s*Other Macros\s*<\/h4>/i
const anyHeader = /<h4>/i
const headerTag = '</h4>'
const listItem = /^(\s*@li\s+)(.+?)(\s*)$/

/**
 * Reads an `@li` entry, returning the macro name and the column at which it
 * starts. The column is derived from the entry text rather than from a search
 * for the name, so an entry such as `@li li.sas` reports the `li` after the
 * tag, not the `li` inside it.
 *
 * @param {string} text - the line, or the tail of a line, to read.
 * @param {number} offset - the 0-based column at which `text` starts in the
 * line, so a trailing entry on a `<h4>` line still reports its real position.
 */
const parseListItem = (
  text: string,
  offset = 0
): { name: string; column: number } | null => {
  const match = listItem.exec(text)
  if (!match) return null

  const entry = match[2]
  const firstToken = entry.trim().split(/\s+/)[0] || ''

  const normalised = firstToken.replace(/\\/g, '/')
  const fileName = normalised.split('/').pop() || ''
  const name = fileName.replace(/\.sas$/i, '')
  if (!name) return null

  const tokenOffset = entry.indexOf(firstToken)
  const fileOffset = normalised.lastIndexOf('/') + 1
  const column = offset + match[1].length + tokenOffset + fileOffset + 1

  return { name, column }
}

/**
 * Reads the `@li` entries of a section that starts at `sectionIndex`.
 *
 * A blank line ends the list unless the next non-blank line is another entry,
 * so a list broken up by a stray blank line is still read in full - the
 * formatter rewrites exactly the lines it read, and an entry it did not read
 * would be left behind and duplicated.
 *
 * @returns the entries, and the index of the first line after the last one.
 */
const readSectionList = (
  lines: string[],
  sectionIndex: number,
  limit: number
): { entries: HeaderEntry[]; end: number } => {
  const entries: HeaderEntry[] = []
  let end = sectionIndex + 1
  let index = sectionIndex + 1

  while (index < limit && index < lines.length) {
    const line = lines[index]

    if (line.trim() === '') {
      let next = index
      while (next < limit && next < lines.length && lines[next].trim() === '') {
        next++
      }
      if (next < limit && next < lines.length && listItem.test(lines[next])) {
        index = next
        continue
      }
      break
    }

    const parsed = parseListItem(line)
    if (!parsed) break

    entries.push({
      name: parsed.name,
      line,
      lineNumber: index + 1,
      column: parsed.column
    })
    index++
    end = index
  }

  return { entries, end }
}

/**
 * Reads the macros declared in the header of a file - both the
 * `<h4> SAS Macros </h4>` and the `<h4> Other Macros </h4>` sections.
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

    const section: HeaderMacro['section'] | null = sasMacrosHeader.test(line)
      ? 'sasMacros'
      : otherMacrosHeader.test(line)
        ? 'otherMacros'
        : null

    if (!section) continue

    // An entry can share the line with the section tag.
    const tagEnd = line.indexOf(headerTag) + headerTag.length
    const trailing = parseListItem(line.slice(tagEnd), tagEnd)
    if (trailing) {
      macros.push({
        name: trailing.name,
        lineNumber: index + 1,
        startColumnNumber: trailing.column,
        endColumnNumber: trailing.column + trailing.name.length,
        section
      })
    }

    readSectionList(lines, index, headerLinesCount).entries.forEach((entry) => {
      macros.push({
        name: entry.name,
        lineNumber: entry.lineNumber,
        startColumnNumber: entry.column,
        endColumnNumber: entry.column + entry.name.length,
        section
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
 * line with the header's closing `**`, or when an `@li` entry shares the line
 * with the section tag. In those cases the caller leaves the file alone, so a
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

  const { entries, end } = readSectionList(
    lines,
    sectionIndex,
    headerLinesCount
  )

  return { sectionIndex, entries, end }
}

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

  const byName = new Map<string, { name: string; line: string }>()
  entries.forEach((entry) => {
    const key = entry.name.toLowerCase()
    if (!byName.has(key))
      byName.set(key, { name: entry.name, line: entry.line })
  })
  macros.forEach((macro) => {
    const key = macro.toLowerCase()
    if (byName.has(key)) return
    byName.set(key, { name: macro, line: `${indent}@li ${macro}.sas` })
  })

  const sortedLines = [...byName.values()]
    .sort((a, b) => compareMacroNames(a.name, b.name))
    .map((entry) => entry.line)

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
 * Removes macro names from the `<h4> SAS Macros </h4>` section of a file
 * header. The section header itself is kept, so an empty list remains a valid
 * place for the formatter to add entries. The blank line before the section and
 * after the list is preserved.
 *
 * The file is returned unchanged when it has no Doxygen header, when the header
 * has no `SAS Macros` section, when the section cannot be rewritten safely, or
 * when none of the named macros are listed.
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
    kept.push(entry.line)
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
