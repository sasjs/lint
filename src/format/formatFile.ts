import { createFile, readFile } from '@sasjs/utils/file'
import { LintConfig } from '../types/LintConfig'
import { getLintConfig } from '../utils/getLintConfig'
import { processText } from './shared'

/**
 * Applies automatic formatting to the file at the given path.
 * @param {string} filePath - the path to the file to be formatted.
 * @param {LintConfig} configuration - an optional configuration. When not passed in, this is read from the .sasjslint file.
 * @returns {Promise<void>} Resolves successfully when the file has been formatted.
 */
export const formatFile = async (
  filePath: string,
  configuration?: LintConfig
) => {
  const config = configuration || (await getLintConfig())
  const text = await readFile(filePath)

  const formattedText = processText(text, config)

  await createFile(filePath, formattedText)
}
