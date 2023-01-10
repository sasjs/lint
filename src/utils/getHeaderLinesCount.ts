import { LintConfig } from '../types'
import { splitText } from './splitText'

/**
 * This funtion returns the number of lines header spans upon.
 */
export const getHeaderLinesCount = (text: string, config: LintConfig) => {
  let count = 0

  if (text.trimStart().startsWith('/*')) {
    const lines = splitText(text, config)

    for (const line of lines) {
      count++
      if (line.match(/\*\//)) {
        break
      }
    }
  }

  return count
}
