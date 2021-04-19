import { LintConfig } from '../types/LintConfig'
import { LineEndings } from '../types/LineEndings'

/**
 * Splits the given content into a list of lines, regardless of CRLF or LF line endings.
 * @param {string} text - the text content to be split into lines.
 * @returns {string[]} an array of lines from the given text
 */
export const splitText = (text: string, config: LintConfig): string[] => {
  if (!text) return []
  const expectedLineEndings =
    config.lineEndings === LineEndings.LF ? '\n' : '\r\n'
  const incorrectLineEndings = expectedLineEndings === '\n' ? '\r\n' : '\n'
  return text
    .replace(new RegExp(incorrectLineEndings, 'g'), expectedLineEndings)
    .split(expectedLineEndings)
}
