import { LintConfig } from '../types'
import { splitText } from './splitText'

interface DataSectionsDetail {
  start: number
  end: number
}

export const getDataSectionsDetail = (text: string, config: LintConfig) => {
  const dataSections: DataSectionsDetail[] = []
  const lines = splitText(text, config)

  const dataSectionStartRegex1 = new RegExp(
    '^(datalines;)|(cards;)|(cards4;)|(parmcards;)'
  )
  const dataSectionEndRegex1 = new RegExp(';')
  const dataSectionStartRegex2 = new RegExp('^(datalines4)|(parmcards4);')
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
