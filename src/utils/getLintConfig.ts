import path from 'path'
import { LintConfig } from '../types/LintConfig'
import { readFile } from '@sasjs/utils/file'
import { getProjectRoot } from './getProjectRoot'

/**
 * Fetches the config from the .sasjslint file and creates a LintConfig object.
 * @returns {Promise<LintConfig>} resolves with an object representing the current lint configuration.
 */
export async function getLintConfig(): Promise<LintConfig> {
  const projectRoot = await getProjectRoot()
  const configuration = await readFile(path.join(projectRoot, '.sasjslint'))
  return new LintConfig(JSON.parse(configuration))
}
