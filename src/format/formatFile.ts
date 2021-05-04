import { createFile, readFile } from '@sasjs/utils/file'
import { lintFile } from '../lint'
import { FormatResult } from '../types'
import { LintConfig } from '../types/LintConfig'
import { getLintConfig } from '../utils/getLintConfig'
import { processText } from './shared'

/**
 * Applies automatic formatting to the file at the given path.
 * @param {string} filePath - the path to the file to be formatted.
 * @param {LintConfig} configuration - an optional configuration. When not passed in, this is read from the .sasjslint file.
 * @returns {Promise<FormatResult>} Resolves successfully when the file has been formatted.
 */
export const formatFile = async (
  filePath: string,
  configuration?: LintConfig
): Promise<FormatResult> => {
  const config = configuration || (await getLintConfig())
  const diagnosticsBeforeFormat = await lintFile(filePath)
  const diagnosticsCountBeforeFormat = diagnosticsBeforeFormat.length

  const text = await readFile(filePath)

  const formattedText = processText(text, config)

  await createFile(filePath, formattedText)

  const diagnosticsAfterFormat = await lintFile(filePath)
  const diagnosticsCountAfterFormat = diagnosticsAfterFormat.length

  const fixedDiagnosticsCount =
    diagnosticsCountBeforeFormat - diagnosticsCountAfterFormat

  const updatedFilePaths: string[] = []

  if (fixedDiagnosticsCount) {
    updatedFilePaths.push(filePath)
  }

  return {
    updatedFilePaths,
    fixedDiagnosticsCount,
    unfixedDiagnostics: diagnosticsAfterFormat
  }
}
