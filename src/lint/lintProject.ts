import { getProjectRoot } from '../utils'
import { lintFolder } from './lintFolder'

/**
 * Analyses and produces a set of diagnostics for the current project.
 * @returns {Promise<Map<string, Diagnostic[]>>} Resolves with a map with array of diagnostic objects, each containing a warning, line number and column number, and grouped by file path.
 */
export const lintProject = async () => {
  const projectRoot =
    (await getProjectRoot()) || process.projectDir || process.currentDir

  if (!projectRoot) {
    throw new Error('SASjs Project Root was not found.')
  }
  return await lintFolder(projectRoot)
}
