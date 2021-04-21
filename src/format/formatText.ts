import { getLintConfig } from '../utils'
import { processText } from './shared'

export const formatText = async (text: string) => {
  const config = await getLintConfig()
  return processText(text, config)
}
