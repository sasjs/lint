import { getProjectRoot } from '../utils/getProjectRoot'
import { formatFolder } from './formatFolder'

/**
 * Automatically formats all SAS files in the current project.
 * @returns {Promise<void>} Resolves successfully when all SAS files in the current project have been formatted.
 */
export const formatProject = async () => {
  const projectRoot =
    (await getProjectRoot()) || process.projectDir || process.currentDir
  if (!projectRoot) {
    throw new Error('SASjs Project Root was not found.')
  }
  return await formatFolder(projectRoot)
}
