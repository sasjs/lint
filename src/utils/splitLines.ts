/**
 * Splits text into lines on either terminator, so a reader works whatever the
 * file's own endings are.
 *
 * Readers must NOT split on the line ending configured in `lineEndings`. That
 * value describes what the project wants, not what the file contains, and the
 * lint path has no normalisation step - unlike the formatter, where
 * `lineEndings.fix` converts every terminator before the later rules run. A
 * configured-ending split over a file of the other style yields one string
 * holding the whole file, so `lines[n - 1]` is not line n and column lookups
 * throw.
 *
 * @param {string} text - the text to split into lines.
 * @returns {string[]} the lines, without their terminators.
 */
export const splitLines = (text: string): string[] =>
  text ? text.split(/\r\n|\n/) : []
