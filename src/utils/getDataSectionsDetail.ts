import { LintConfig } from '../types'
import { splitText } from './splitText'

interface DataSectionsDetail {
  start: number
  end: number
}

export const getDataSectionsDetail = (text: string, config: LintConfig) => {
  const dataSections: DataSectionsDetail[] = []
  const lines = splitText(text, config)

  // A data section opens at the start of a statement, which is the start of a
  // line or the terminator of the statement before it - `input a b; cards;` on
  // one line opens one - in any capitalisation, with any leading whitespace.
  // Anchoring on the line alone would read such a record as code, and the
  // formatter's rewrap pass would then break it into more records; anchoring on
  // the keyword alone would fire on prose such as `/* see cards; below */`.
  const dataSectionStartRegex1 = new RegExp(
    '(?:^|;)\\s*(datalines|cards|parmcards);',
    'i'
  )
  const dataSectionEndRegex1 = new RegExp(';')
  const dataSectionStartRegex2 = new RegExp(
    '(?:^|;)\\s*(datalines4|cards4|parmcards4);',
    'i'
  )
  const dataSectionEndRegex2 = new RegExp(';;;;')

  let dataSectionStarted = false
  let dataSectionStartIndex = -1
  let dataSectionEndRegex = dataSectionEndRegex1

  lines.forEach((line, index) => {
    if (dataSectionStarted) {
      if (dataSectionEndRegex.test(line)) {
        dataSections.push({ start: dataSectionStartIndex, end: index })
        dataSectionStarted = false
      }
    } else {
      if (dataSectionStartRegex1.test(line)) {
        dataSectionStarted = true
        dataSectionStartIndex = index
        dataSectionEndRegex = dataSectionEndRegex1
      } else if (dataSectionStartRegex2.test(line)) {
        dataSectionStarted = true
        dataSectionStartIndex = index
        dataSectionEndRegex = dataSectionEndRegex2
      }
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
