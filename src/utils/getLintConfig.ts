import path from 'path'
import os from 'os'
import { LintConfig } from '../types/LintConfig'
import { readFile } from '@sasjs/utils/file'
import { getProjectRoot } from './getProjectRoot'
import { LineEndings } from '../types/LineEndings'
import { defaultBannedStrings } from './defaultBannedStrings'
import { defaultIgnoredMacros } from './defaultIgnoredMacros'

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
  bannedStrings: [...defaultBannedStrings],
  defaultHeader: getDefaultHeader(),
  hasDoxygenHeader: true,
  hasMacroNameInMend: true,
  hasMacroParentheses: true,
  hasRequiredMacroOptions: false,
  ignoreList: [],
  ignoredLibnames: [],
  ignoredMacros: [...defaultIgnoredMacros],
  indentationMultiple: 2,
  lineEndings: LineEndings.OFF,
  lowerCaseFileNames: true,
  lowerCaseMacroNames: true,
  maxDataLineLength: 80,
  maxHeaderLineLength: 80,
  maxLineLength: 80,
  minMacroNameLength: 3,
  noBannedStrings: true,
  noEncodedPasswords: true,
  noGremlins: true,
  noMacroIfInOpenCode: false,
  noMalformedMacroCalls: false,
  noNestedCommentsInHeader: true,
  noNestedMacros: true,
  noSingleAsteriskComments: false,
  noSpacesInFileNames: true,
  noTabs: true,
  noTrailingSpaces: true,
  noUndeclaredMacros: true,
  noUnusedLibnames: false,
  noUnusedMacros: true,
  noXcmd: true,
  requiredMacroOptions: [],
  severityLevel: {},
  strictMacroDefinition: true
}

/**
 * Fetches the config from the .sasjslint file (at project root or home directory) and creates a LintConfig object.
 * Returns the default configuration when a .sasjslint file is unavailable.
 *
 * An absent file means the defaults, but a file that IS there and does not parse
 * is a mistake in the project rather than a missing configuration: reporting it
 * as "no file" applies a different rule set without saying so, which is how a
 * commented-out rule or a stray trailing comma comes to look like it works.
 * @returns {Promise<LintConfig>} resolves with an object representing the current lint configuration.
 */
export async function getLintConfig(): Promise<LintConfig> {
  const projectRoot = await getProjectRoot()
  const lintFileLocation = projectRoot || os.homedir()
  const lintFilePath = path.join(lintFileLocation, '.sasjslint')
  const configuration = await readFile(lintFilePath).catch((_) => null)

  if (configuration === null) {
    return new LintConfig(DefaultLintConfiguration)
  }

  return new LintConfig(parseLintConfig(configuration, lintFilePath))
}

/**
 * Reads the configuration file, turning a parse failure into a message that
 * names the file and says what to do about it. A raw `JSON.parse` error reads
 * `Unexpected token } in JSON at position 12`, which leaves the reader to work
 * out which file was read and why JSON is involved at all.
 */
export const parseLintConfig = (configuration: string, filePath: string) => {
  try {
    return JSON.parse(configuration)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)

    throw new Error(
      `${filePath} is not valid JSON (${reason}).\n` +
        'The file is read as strict JSON, so it cannot carry comments. ' +
        'Every setting, its type and its default are documented in the schema: ' +
        'https://cli.sasjs.io/sasjslint-schema.json'
    )
  }
}
