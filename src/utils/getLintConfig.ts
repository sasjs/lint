import path from 'path'
import os from 'os'
import { LintConfig } from '../types/LintConfig'
import { readFile } from '@sasjs/utils/file'
import { getProjectRoot } from './getProjectRoot'
import { LineEndings } from '../types/LineEndings'

export const getDefaultHeader = () =>
  `/**{lineEnding}  @file{lineEnding}  @brief <Your brief here>{lineEnding}{lineEnding}  <h4> SAS Macros </h4>{lineEnding}{lineEnding}**/`

/**
 * Default configuration that is used when a .sasjslint file is not found.
 *
 * It lists every setting the linter reads, with its default value, so it
 * doubles as the reference for the `.sasjslint` file. `getLintConfig.spec.ts`
 * enumerates the settings the config reads and fails if this object misses one,
 * and the README mirrors it.
 */
export const DefaultLintConfiguration = {
  allowedGremlins: [],
  defaultHeader: getDefaultHeader(),
  hasDoxygenHeader: true,
  hasMacroNameInMend: true,
  hasMacroParentheses: true,
  hasRequiredMacroOptions: false,
  ignoreList: [],
  ignoredLibnames: [],
  indentationMultiple: 2,
  lineEndings: LineEndings.OFF,
  lowerCaseFileNames: true,
  maxDataLineLength: 80,
  maxHeaderLineLength: 80,
  maxLineLength: 80,
  noEncodedPasswords: true,
  noGremlins: true,
  noNestedMacros: true,
  noSingleAsteriskComments: false,
  noSpacesInFileNames: true,
  noTabs: true,
  noTrailingSpaces: true,
  noUndeclaredMacros: true,
  noUnusedLibnames: false,
  noUnusedMacros: true,
  requiredMacroOptions: [],
  severityLevel: {},
  strictMacroDefinition: true
}

/**
 * Fetches the config from the .sasjslint file (at project root or home directory) and creates a LintConfig object.
 * Returns the default configuration when a .sasjslint file is unavailable.
 * @returns {Promise<LintConfig>} resolves with an object representing the current lint configuration.
 */
export async function getLintConfig(): Promise<LintConfig> {
  const projectRoot = await getProjectRoot()
  const lintFileLocation = projectRoot || os.homedir()
  const configuration = await readFile(
    path.join(lintFileLocation, '.sasjslint')
  ).catch((_) => {
    return JSON.stringify(DefaultLintConfiguration)
  })
  return new LintConfig(JSON.parse(configuration))
}
