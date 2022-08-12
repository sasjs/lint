import { fileExists, readFile } from '@sasjs/utils'
import path from 'path'
import ignore from 'ignore'
import { getLintConfig, getProjectRoot } from '.'
import { LintConfig } from '../types'

/**
 * A function to check if file/folder path matches any pattern from .gitignore or ignoreList (.sasjsLint)
 *
 * @param fPath absolute path of file or folder
 * @returns {Promise<boolean>} true if path matches the patterns from .gitignore file otherwise false
 */
export const isIgnored = async (
  fPath: string,
  configuration?: LintConfig
): Promise<boolean> => {
  const config = configuration || (await getLintConfig())
  const projectRoot = await getProjectRoot()
  const gitIgnoreFilePath = path.join(projectRoot, '.gitignore')
  const rootPath = projectRoot + path.sep
  const relativePath = fPath.replace(rootPath, '')

  if (fPath === projectRoot) return false

  let gitIgnoreFileContent = ''

  if (await fileExists(gitIgnoreFilePath))
    gitIgnoreFileContent = await readFile(gitIgnoreFilePath)

  return ignore()
    .add(gitIgnoreFileContent)
    .add(config.ignoreList)
    .ignores(relativePath)
}
