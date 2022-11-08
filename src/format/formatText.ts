import { LintConfig } from '../types'
import { getLintConfig } from '../utils'
import { processText } from './shared'

export const formatText = async (text: string, configuration?: LintConfig) => {
  const config = configuration || (await getLintConfig())
  return processText(text, config)
}
