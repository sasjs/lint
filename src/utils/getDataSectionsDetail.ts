import { LintConfig } from '../types'
import { splitText } from './splitText'

interface DataSectionsDetail {
  start: number
  end: number
}

export const getDataSectionsDetail = (text: string, config: LintConfig) => {
  const dataSections: DataSectionsDetail[] = []
  const lines = splitText(text, config)

  // SAS accepts a statement's leading whitespace and any capitalisation, so an
  // indented or upper-case `DATALINES;` opens a data section exactly like the
  // column-0 lower-case form. Readers that locate data records with this
  // helper - the length rules and the formatter's rewrap pass - would otherwise
  // treat those records as code.
  const dataSectionStartRegex1 = new RegExp(
    '^\\s*(datalines;|cards;|parmcards;)',
    'i'
  )
  const dataSectionEndRegex1 = new RegExp(';')
  const dataSectionStartRegex2 = new RegExp(
    '^\\s*(datalines4;|cards4;|parmcards4;)',
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
