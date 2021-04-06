import path from 'path'
import { LintConfig } from '../types/LintConfig'
import { readFile } from '@sasjs/utils/file'
import { getProjectRoot } from './getProjectRoot'

/**
 * Default configuration that is used when a .sasjslint file is not found
 */
export const DefaultLintConfiguration = {
  noTrailingSpaces: true,
  noEncodedPasswords: true,
  hasDoxygenHeader: true,
  noSpacesInFileNames: true,
  lowerCaseFileNames: true,
  maxLineLength: 80,
  noTabIndentation: true,
  indentationMultiple: 2,
  hasMacroNameInMend: false,
  noNestedMacros: true,
  hasMacroParentheses: true
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
    return JSON.stringify(DefaultLintConfiguration)
  })
  return new LintConfig(JSON.parse(configuration))
}
