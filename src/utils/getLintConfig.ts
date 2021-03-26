import path from 'path'
import { LintConfig } from '../types/LintConfig'
import { readFile } from '@sasjs/utils/file'
import { getProjectRoot } from './getProjectRoot'

const defaultConfiguration = {
  noTrailingSpaces: true,
  noEncodedPasswords: true,
  hasDoxygenHeader: true,
  noSpacesInFileNames: true,
  lowerCaseFileNames: true,
  maxLineLength: 80,
  noTabIndentation: true
}
/**
 * Fetches the config from the .sasjslint file and creates a LintConfig object.
 * Returns the default configuration when a .sasjslint file is unavailable.
 * @returns {Promise<LintConfig>} resolves with an object representing the current lint configuration.
 */
export async function getLintConfig(): Promise<LintConfig> {
  const projectRoot = await getProjectRoot()
  const configuration = await readFile(
    path.join(projectRoot, '.sasjslint')
  ).catch((_) => {
    console.warn('Unable to load .sasjslint file. Using default configuration.')
    return JSON.stringify(defaultConfiguration)
  })
  return new LintConfig(JSON.parse(configuration))
}
