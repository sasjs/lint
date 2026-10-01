import { LintConfig } from '../types'

/**
 * A LIBNAME assignment found in a file, with the position of its libref.
 */
export interface LibnameAssignment {
  libref: string
  lineNumber: number
  startColumnNumber: number
  endColumnNumber: number
}

/**
 * Matches a LIBNAME statement, capturing the libref and the rest of the
 * statement. A statement starts at the start of the file or after a `;`.
 */
const libnameStatement = /(?:^|;)\s*libname\s+([a-z_][a-z0-9_]*)([^;]*)/gi

/** Matches the options that report or deassign a libref, rather than assign it. */
const nonAssigningOption = /^\s*(clear|list)\b/i

/** Matches the reporting form, which names no libref. */
const allLibrefs = /^_all_$/i

/** A half-open range of offsets. */
interface Span {
  start: number
  end: number
}

/**
 * Replaces the regions that cannot hold a libref with spaces, keeping every
 * other offset in place.
 *
 * Block comments, macro comments, comment statements and single-quoted strings
 * are opaque. The content of a double-quoted string is kept, because SAS takes a
 * libref as a string as often as a two-level name - `pathname("outData", "L")`
 * uses the libref just as much as `outData.member` does.
 */
const blankNonCode = (text: string): string => {
  const chars = text.split('')
  const length = text.length
  let index = 0
  let atStatementStart = true

  const blank = (from: number, to: number) => {
    for (let at = from; at < to && at < length; at++) {
      if (chars[at] !== '\n') chars[at] = ' '
    }
  }

  while (index < length) {
    const char = text[index]

    if (char === '\n') {
      index++
      continue
    }

    // Single-quoted string - opaque. `''` is an escaped quote character.
    if (char === "'") {
      let end = index + 1
      while (end < length) {
        if (text[end] === "'") {
          if (text[end + 1] === "'") {
            end += 2
            continue
          }
          end++
          break
        }
        if (text[end] === '\n') break
        end++
      }
      blank(index, end)
      index = end
      continue
    }

    // Double-quoted string - kept, so its content counts as a mention.
    if (char === '"') {
      let end = index + 1
      while (end < length && text[end] !== '"' && text[end] !== '\n') end++
      index = end + 1
      continue
    }

    if (char === '/' && text[index + 1] === '*') {
      const close = text.indexOf('*/', index + 2)
      const end = close === -1 ? length : close + 2
      blank(index, end)
      index = end
      continue
    }

    if (char === '%' && text[index + 1] === '*') {
      const close = text.indexOf(';', index + 2)
      const end = close === -1 ? length : close + 1
      blank(index, end)
      index = end
      continue
    }

    if (char === ';') {
      atStatementStart = true
      index++
      continue
    }

    if (/\s/.test(char)) {
      index++
      continue
    }

    // Comment statement - its body is opaque up to the terminating `;`.
    if (atStatementStart && char === '*') {
      const close = text.indexOf(';', index + 1)
      const end = close === -1 ? length : close + 1
      blank(index, end)
      index = end
      continue
    }

    atStatementStart = false
    index++
  }

  return chars.join('')
}

/** Replaces each span with spaces, keeping every other offset in place. */
const blankSpans = (code: string, spans: Span[]): string => {
  const chars = code.split('')

  spans.forEach(({ start, end }) => {
    for (let at = start; at < end && at < chars.length; at++) {
      if (chars[at] !== '\n') chars[at] = ' '
    }
  })

  return chars.join('')
}

/** The offset of the first character of each line. */
const lineStarts = (text: string): number[] => {
  const starts = [0]

  for (let index = 0; index < text.length; index++) {
    if (text[index] === '\n') starts.push(index + 1)
  }

  return starts
}

/** Converts an offset into a one-based line and column. */
const positionOf = (
  starts: number[],
  offset: number
): { lineNumber: number; columnNumber: number } => {
  let line = 0

  while (line + 1 < starts.length && starts[line + 1] <= offset) line++

  return { lineNumber: line + 1, columnNumber: offset - starts[line] + 1 }
}

/** True when the libref appears in the code outside a LIBNAME statement. */
const isMentioned = (code: string, libref: string): boolean =>
  new RegExp(`(^|[^a-z0-9_])${libref}([^a-z0-9_]|$)`, 'i').test(code)

/**
 * Finds the statements in `code` that assign a libref, with the offset of each
 * statement.
 *
 * A statement assigns when it names a libref and carries options -
 * `libname outData "&dirOut.";` assigns, while `libname outData;` deassigns,
 * `libname outData clear;` deassigns and `libname outData list;` reports. The
 * reporting form `libname _all_ list;` names no libref. A libref built at
 * runtime (`libname &lib;`) is not a literal, so there is nothing to check.
 *
 * A libref assigned more than once is reported once, at its first assignment.
 */
const findAssignments = (
  text: string,
  code: string
): { assignments: LibnameAssignment[]; spans: Span[] } => {
  const assignments: LibnameAssignment[] = []
  const spans: Span[] = []

  const starts = lineStarts(text)
  const reported = new Set<string>()

  let match: RegExpExecArray | null
  libnameStatement.lastIndex = 0

  while ((match = libnameStatement.exec(code)) !== null) {
    const libref = match[1]
    const options = match[2]

    if (allLibrefs.test(libref)) continue
    if (!options.trim() || nonAssigningOption.test(options)) continue

    // The statement runs to the `;` that closed it, or to the end of the file.
    const close = code.indexOf(';', match.index + match[0].length)
    const end = close === -1 ? code.length : close + 1
    spans.push({ start: match.index, end })

    const key = libref.toLowerCase()
    if (reported.has(key)) continue
    reported.add(key)

    const offset =
      match.index + match[0].length - options.length - libref.length
    const { lineNumber, columnNumber } = positionOf(starts, offset)

    assignments.push({
      libref,
      lineNumber,
      startColumnNumber: columnNumber,
      endColumnNumber: columnNumber + libref.length
    })
  }

  return { assignments, spans }
}

/**
 * Finds the LIBNAME statements in a file that assign a libref.
 *
 * @param {string} text - the text content of the file.
 * @param {LintConfig} config - the lint configuration. It is accepted for
 * symmetry with the other utilities and is not used by the scan.
 * @returns {LibnameAssignment[]} the assignments, in the order they appear.
 */
export const parseLibnames = (
  text: string,
  config?: LintConfig
): LibnameAssignment[] => {
  if (!text) return []

  return findAssignments(text, blankNonCode(text)).assignments
}

/**
 * Finds the librefs a file assigns and never mentions again.
 *
 * A mention is any occurrence of the libref outside a LIBNAME statement, which
 * includes the indirect forms SAS accepts: `pathname(TESTWORK)`,
 * `pathname("outData", "L")`, `library=path2`, `fmtsearch=(path1 path2)` and
 * `%mfv_getcaslib(castest)`. The test is deliberately generous, because a use
 * that is missed becomes a false positive.
 *
 * @param {string} text - the text content of the file.
 * @param {LintConfig} config - the lint configuration.
 * @returns {LibnameAssignment[]} the assignments that look unused.
 */
export const getUnusedLibnames = (
  text: string,
  config?: LintConfig
): LibnameAssignment[] => {
  if (!text) return []

  const code = blankNonCode(text)
  const { assignments, spans } = findAssignments(text, code)

  if (!assignments.length) return []

  // The assigning statements are blanked, so a libref does not count as a
  // mention of itself. A statement that deassigns or reports a libref is left
  // in place - it refers to a libref assigned somewhere else, so it is a mention.
  const withoutAssignments = blankSpans(code, spans)

  return assignments.filter(
    ({ libref }) => !isMentioned(withoutAssignments, libref)
  )
}
