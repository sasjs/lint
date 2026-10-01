import type { LintConfig } from '../types/LintConfig'
import { getHeaderLinesCount } from './getHeaderLinesCount'
import { splitText } from './splitText'

/** The tag that introduces a per-file override, matching `.sasjslint`. */
const marker = '@sasjslint'

/**
 * Reads a balanced JSON object from `start`, honouring strings and escapes so
 * a brace inside a value does not end the scan early.
 */
const readObject = (text: string, start: number): string | null => {
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index++) {
    const char = text[index]

    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }

    if (char === '"') {
      inString = true
    } else if (char === '{') {
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0) return text.slice(start, index + 1)
    }
  }

  return null
}

/**
 * Reads the per-file override from the header of a file.
 *
 * The override is a `@sasjslint` tag followed by a JSON object, anywhere in the
 * Doxygen header:
 *
 * ```
 * /**
 *   @file
 *   @brief Calls the settlement API
 *
 *   @sasjslint {"maxHeaderLineLength": 200, "noUndeclaredMacros": false}
 * **\/
 * ```
 *
 * Only the header is read, so an override cannot be buried in the body of a
 * file. A tag that is missing, unterminated, malformed or not an object is
 * ignored rather than raised: the linter must not fail on bad input.
 *
 * @param {string} text - the text content of the file.
 * @param {LintConfig} config - the resolved configuration, used to find the
 * header and its line endings.
 * @returns {object | null} the override, or null when there is none.
 */
export const getLintOverride = (
  text: string,
  config: LintConfig
): any | null => {
  if (!text) return null

  const headerLinesCount = getHeaderLinesCount(text, config)
  if (!headerLinesCount) return null

  const header = splitText(text, config).slice(0, headerLinesCount).join('\n')

  const at = header.indexOf(marker)
  if (at === -1) return null

  const brace = header.indexOf('{', at + marker.length)
  if (brace === -1) return null

  const body = readObject(header, brace)
  if (!body) return null

  try {
    // The body always starts with `{`, so a successful parse is an object.
    return JSON.parse(body)
  } catch {
    return null
  }
}

/**
 * Returns the configuration to lint a file with: the given configuration, with
 * the file's own `@sasjslint` override merged over it. The header wins, since
 * it is the more specific statement.
 *
 * @param {string} text - the text content of the file.
 * @param {LintConfig} config - the resolved configuration.
 * @returns {LintConfig} the effective configuration.
 */
export const applyLintOverride = (
  text: string,
  config: LintConfig
): LintConfig => {
  const override = getLintOverride(text, config)
  return override ? config.override(override) : config
}
