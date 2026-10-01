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

const sasMacrosHeader = /<h4>\s*SAS Macros\s*<\/h4>/i
const otherMacrosHeader = /<h4>\s*Other Macros\s*<\/h4>/i
const anyHeader = /<h4>/i
const listItem = /^\s*@li\s+(.+?)\s*$/

/**
 * Extracts the macro name from the text that follows an `@li` tag. A header
 * entry is a file reference such as `mf_myfile.sas`, optionally preceded by a
 * path, so only the file name is kept and the `.sas` extension is dropped.
 */
const toMacroName = (item: string): string => {
  const firstToken = item.trim().split(/\s+/)[0] || ''
  const fileName = firstToken.replace(/\\/g, '/').split('/').pop() || ''
  return fileName.replace(/\.sas$/i, '')
}

const compareMacroNames = (a: string, b: string): number =>
  a.toLowerCase().localeCompare(b.toLowerCase())

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
  let section: HeaderMacro['section'] | null = null

  for (
    let index = 0;
    index < headerLinesCount && index < lines.length;
    index++
  ) {
    const line = lines[index]

    if (sasMacrosHeader.test(line)) {
      section = 'sasMacros'
      continue
    }

    if (otherMacrosHeader.test(line)) {
      section = 'otherMacros'
      continue
    }

    if (anyHeader.test(line)) {
      section = null
      continue
    }

    if (!section) continue

    const match = listItem.exec(line)
    if (!match) {
      // A blank line, or any line that is not an @li entry, ends the list.
      section = null
      continue
    }

    const name = toMacroName(match[1])
    if (!name) continue

    const nameIndex = line.indexOf(name)

    macros.push({
      name,
      lineNumber: index + 1,
      startColumnNumber: nameIndex + 1,
      endColumnNumber: nameIndex + name.length + 1,
      section
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
 * Adds macro names to the `<h4> SAS Macros </h4>` section of a file header,
 * merging them with the entries that are already listed and sorting the result
 * alphabetically. A new section is added when the header has none.
 *
 * A blank line separates the section from the header content before it and from
 * whatever follows the list, so the section reads as its own block.
 *
 * The file is returned unchanged when it has no Doxygen header, or when the
 * `SAS Macros` section shares a line with the header's closing `**`, because
 * neither case can be edited without disturbing the surrounding text.
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

  if (sectionIndex === -1) {
    if (headerEndIndex === 0) return text

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

  if (sectionIndex === headerEndIndex) return text

  const indent = (lines[sectionIndex].match(/^\s*/) as RegExpMatchArray)[0]
  const entries: { name: string; line: string }[] = []

  let listEnd = sectionIndex + 1
  while (listEnd < headerLinesCount && listEnd < lines.length) {
    const match = listItem.exec(lines[listEnd])
    if (!match) break
    entries.push({ name: toMacroName(match[1]), line: lines[listEnd] })
    listEnd++
  }

  const seen = new Set(entries.map((entry) => entry.name.toLowerCase()))
  macros.forEach((macro) => {
    const key = macro.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    entries.push({ name: macro, line: `${indent}@li ${macro}.sas` })
  })

  const sortedLines = entries
    .sort((a, b) => compareMacroNames(a.name, b.name))
    .map((entry) => entry.line)

  const result = [
    ...lines.slice(0, sectionIndex + 1),
    ...sortedLines,
    ...lines.slice(listEnd)
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
 * has no `SAS Macros` section, when the section shares a line with the header's
 * closing `**`, or when none of the named macros are listed.
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
  const headerEndIndex = headerLinesCount - 1

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

  if (sectionIndex === -1 || sectionIndex === headerEndIndex) return text

  const remove = new Set(macros.map((macro) => macro.toLowerCase()))
  const kept: string[] = []
  let changed = false
  let listEnd = sectionIndex + 1

  while (listEnd < headerLinesCount && listEnd < lines.length) {
    const match = listItem.exec(lines[listEnd])
    if (!match) break
    if (remove.has(toMacroName(match[1]).toLowerCase())) changed = true
    else kept.push(lines[listEnd])
    listEnd++
  }

  if (!changed) return text

  const result = [
    ...lines.slice(0, sectionIndex + 1),
    ...kept,
    ...lines.slice(listEnd)
  ]

  return withSectionSpacing(
    result,
    sectionIndex,
    sectionIndex + 1 + kept.length
  ).join(lineEnding)
}
