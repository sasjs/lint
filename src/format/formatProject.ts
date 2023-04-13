import { lintFolder } from '../lint/lintFolder'
import { FormatResult } from '../types/FormatResult'
import { getProjectRoot } from '../utils/getProjectRoot'
import { formatFolder } from './formatFolder'

/**
 * Automatically formats all SAS files in the current project.
 * @returns {Promise<FormatResult>} Resolves successfully when all SAS files in the current project have been formatted.
 */
export const formatProject = async (): Promise<FormatResult> => {
  const projectRoot = (await getProjectRoot()) || process.currentDir
  if (!projectRoot) {
    throw new Error('SASjs Project Root was not found.')
  }

  console.info(`Formatting all .sas files under ${projectRoot}`)

  return await formatFolder(projectRoot)
}
