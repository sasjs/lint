import { LintConfig } from '../types'
import { cleanState, scanLine } from './scanLine'
import { splitText } from './splitText'

interface DataSectionsDetail {
  start: number
  end: number
}

/**
 * A data section: the statement that opens it, and the record list it holds.
 *
 * The opener is matched against the line's CODE, with literals and comments
 * blanked, so a `;cards;` inside a quoted string or a comment opens nothing -
 * and against statement boundaries rather than the line start, so
 * `input a b; cards;` on one line still opens one. The records themselves are
 * not code: a quote in a record is data, so the scan state is reset at the
 * opener and the records are matched as plain lines.
 *
 * @param {string} text - the text to read.
 * @param {LintConfig} config - the configuration in force.
 * @returns {DataSectionsDetail[]} the line ranges each section covers.
 */
export const getDataSectionsDetail = (text: string, config: LintConfig) => {
  const dataSections: DataSectionsDetail[] = []
  const lines = splitText(text, config)

  const opener = /(?:^|;)\s*(datalines|cards|parmcards)(4?);/i
  const dataSectionEndRegex1 = new RegExp(';')
  const dataSectionEndRegex2 = new RegExp(';;;;')

  let state = cleanState()
  let dataSectionStarted = false
  let dataSectionStartIndex = -1
  let dataSectionEndRegex = dataSectionEndRegex1

  lines.forEach((line, index) => {
    if (dataSectionStarted) {
      if (dataSectionEndRegex.test(line)) {
        dataSections.push({ start: dataSectionStartIndex, end: index })
        dataSectionStarted = false
        state = cleanState()
      }
      return
    }

    const scanned = scanLine(line, state)
    state = scanned.endState

    const match = opener.exec(scanned.code)

    if (match) {
      dataSectionStarted = true
      dataSectionStartIndex = index
      dataSectionEndRegex = match[2]
        ? dataSectionEndRegex2
        : dataSectionEndRegex1
      state = cleanState()
    }
  })

  return dataSections
}

export const checkIsDataLine = (
  dataSections: DataSectionsDetail[],
  lineIndex: number
) => {
  for (const dataSection of dataSections) {
    if (lineIndex >= dataSection.start && lineIndex <= dataSection.end)
      return true
  }

  return false
}
