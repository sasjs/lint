import { fileExists, readFile } from '@sasjs/utils/file'
import path from 'path'
import ignore from 'ignore'
import { getLintConfig, getProjectRoot } from '.'
import { LintConfig } from '../types'

/**
 * A function to check if file/folder path matches any pattern from .gitignore or ignoreList (.sasjsLint)
 *
 * @param {string} fPath - absolute path of file or folder
 * @returns {Promise<boolean>} true if path matches the patterns from .gitignore file otherwise false
 */
export const isIgnored = async (
  fPath: string,
  configuration?: LintConfig
): Promise<boolean> => {
  const config = configuration || (await getLintConfig())
  const projectRoot = await getProjectRoot()
  const gitIgnoreFilePath = path.join(projectRoot, '.gitignore')

  // path.relative rather than stripping `projectRoot + sep` from the string: a
  // separator or a normalisation the caller did not apply leaves the strip with
  // nothing to remove, and the `ignore` package then receives an absolute path
  // and rejects it with a RangeError. path.relative is lexical - a symlinked root
  // still yields a `..`-prefixed path, which the guard below catches.
  const relativePath = path.relative(projectRoot, fPath)

  if (relativePath === '') return false

  // On Windows, `path.relative` returns an absolute path when the two paths sit
  // on different drives, which the two guards below cannot see; passing that on
  // reaches `ignore` and throws the RangeError this function exists to avoid.
  if (path.isAbsolute(relativePath)) return false

  // Nothing in a project's .gitignore can match a path outside it, and the
  // `ignore` package rejects a path that escapes the root ("path should be a
  // path.relative()d string"), so a caller passing one gets `false` rather than
  // a RangeError.
  if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`))
    return false

  let gitIgnoreFileContent = ''

  if (await fileExists(gitIgnoreFilePath))
    gitIgnoreFileContent = await readFile(gitIgnoreFilePath)

  return ignore()
    .add(gitIgnoreFileContent)
    .add(config.ignoreList)
    .ignores(relativePath)
}
