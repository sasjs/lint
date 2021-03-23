import path from 'path'
import { LintConfig } from '../types/LintConfig'
import { readFile } from '@sasjs/utils/file'
import { getProjectRoot } from './getProjectRoot'

const defaultConfiguration = {
  noTrailingSpaces: true,
  noEncodedPasswords: true,
  hasDoxygenHeader: true
}
/**
 * Fetches the config from the .sasjslint file and creates a LintConfig object.
 * @returns {Promise<LintConfig>} resolves with an object representing the current lint configuration.
 */
export async function getLintConfig(): Promise<LintConfig> {
  const projectRoot = await getProjectRoot()
  const configuration = await readFile(
    path.join(projectRoot, '.sasjslint')
  ).catch((e) => {
    console.error('Error reading .sasjslint file', e)
    return JSON.stringify(defaultConfiguration)
  })
  return new LintConfig(JSON.parse(configuration))
}
