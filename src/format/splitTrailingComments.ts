import { LintConfig } from '../types'
import {
  checkIsDataLine,
  getDataSectionsDetail
} from '../utils/getDataSectionsDetail'
import { cleanState, noScan, scanLine } from '../utils/scanLine'
import { lineEndingOf } from './adjustLineLength'
import { splitWithTerminators } from './rewrapText'

/**
 * Lifts a trailing block comment onto a line of its own when the code it sits
 * after is what has to be shortened.
 *
 * A line like
 *
 *     , var /* variable name from which to return the format *\/
 *
 * is 63 characters whose code is 9, and no pass may break a line carrying a
 * comment - so the comment moves down and both halves become ordinary lines:
 * the code is wrapped by `rewrapText` if it is still too long, and the comment
 * is reflowed by `reflowComments` like any other prose.
 *
 * A line is split only when it exceeds the limit, so a file that already fits
 * keeps its layout. A `datalines` record is data and is never touched.
 *
 * @param {string} text - the text to read.
 * @param {LintConfig} configuration - the configuration in force.
 * @returns {string} the text, with over-long code/comment lines split.
 */
export const splitTrailingComments = (
  text: string,
  configuration: LintConfig
): string => {
  if (!text) return text

  if (
    !configuration.lineLintRules.some((rule) => rule.name === 'maxLineLength')
  )
    return text

  const entries = splitWithTerminators(text)
  const dataSections = getDataSectionsDetail(text, configuration)
  const output: string[] = []
  let state = cleanState()
  let changed = false

  entries.forEach(({ line, ending }, index) => {
    const isData = checkIsDataLine(dataSections, index)
    const scanned = isData ? noScan() : scanLine(line, state)
    state = scanned.endState

    const span = scanned.comments[0]
    const code = span ? line.slice(0, span.start) : ''

    // A line is split whenever it is over the limit and carries code before a
    // comment, including when the CODE alone overruns: the code then goes to the
    // wrapper (or to `adjustLineLength`) and the comment to the reflow, so each
    // half reaches the pass that owns it instead of the line being refused by
    // both.
    const splits =
      !isData &&
      !!span &&
      line.length > configuration.maxLineLength &&
      code.trim() !== ''

    if (!splits) {
      output.push(line + ending)
      return
    }

    changed = true
    const indent = /^\s*/.exec(line)![0]
    // The break takes the line's own terminator; the final line of a file with
    // no final newline takes the configured one instead.
    const breakEnding = ending || lineEndingOf(configuration)

    output.push(code.trimEnd() + breakEnding)
    output.push(indent + line.slice(span.start) + ending)
  })

  return changed ? output.join('') : text
}
