import path from 'path'
import { LintConfig } from '../types/LintConfig'
import { readFile } from '@sasjs/utils/file'
import { getProjectRoot } from './getProjectRoot'
import { LineEndings } from '../types/LineEndings'

export const getDefaultHeader = () =>
  `/**{lineEnding}  @file{lineEnding}  @brief <Your brief here>{lineEnding}  <h4> SAS Macros </h4>{lineEnding}**/`

/**
 * Default configuration that is used when a .sasjslint file is not found
 */
export const DefaultLintConfiguration = {
  lineEndings: LineEndings.OFF,
  noTrailingSpaces: true,
  noEncodedPasswords: true,
  hasDoxygenHeader: true,
  noSpacesInFileNames: true,
  lowerCaseFileNames: true,
  maxLineLength: 80,
  maxHeaderLineLength: 80,
  maxDataLineLength: 80,
  noTabIndentation: true,
  indentationMultiple: 2,
  hasMacroNameInMend: true,
  noNestedMacros: true,
  hasMacroParentheses: true,
  strictMacroDefinition: true,
  noGremlins: true,
  defaultHeader: getDefaultHeader()
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
