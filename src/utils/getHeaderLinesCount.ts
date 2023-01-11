import { LintConfig } from '../types'
import { splitText } from './splitText'

/**
 * This function returns the number of lines the header spans upon.
 * The file must start with "/*" and the header will finish with ⇙
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
