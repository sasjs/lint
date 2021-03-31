import { getProjectRoot } from '../utils'
import { lintFolder } from './lintFolder'

/**
 * Analyses and produces a set of diagnostics for the current project.
 * @returns {Diagnostic[]} array of diagnostic objects, each containing a warning, line number and column number.
 */
export const lintProject = async () => {
  const projectRoot =
    (await getProjectRoot()) || process.projectDir || process.currentDir
  return await lintFolder(projectRoot)
}
