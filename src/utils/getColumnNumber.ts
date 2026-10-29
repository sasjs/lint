import { escapeRegExp } from './escapeRegExp'

/**
 * The 1-based column at which `text` starts on the last line of `line`.
 *
 * `caseInsensitive` compares the characters without regard to case, which is
 * what a SAS keyword needs: `%MACRO` and `%macro` are the same statement. It
 * leaves the default exact, because the other callers search for a macro name or
 * a parameter exactly as it is written in the file.
 *
 * The folded comparison runs as a RegExp over the ORIGINAL line rather than over
 * a lowercased copy, because folding is not always length-preserving - `'İ'` is
 * one character and lowercases to two - and an offset measured on the copy points
 * somewhere else in the line that is returned to the caller.
 */
export const getColumnNumber = (
  line: string,
  text: string,
  caseInsensitive = false
): number => {
  const lastLine = line.split('\n').pop() as string
  const index = caseInsensitive
    ? lastLine.search(new RegExp(escapeRegExp(text), 'i'))
    : lastLine.indexOf(text)
  if (index < 0) {
    throw new Error(`String '${text}' was not found in line '${line}'`)
  }
  return index + 1
}
