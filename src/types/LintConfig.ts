import { hasDoxygenHeader } from '../rules/hasDoxygenHeader'
import { noEncodedPasswords } from '../rules/noEncodedPasswords'
import { noSpacesInFileNames } from '../rules/noSpacesInFileNames'
import { noTrailingSpaces } from '../rules/noTrailingSpaces'
import { FileLintRule, LineLintRule, PathLintRule } from './LintRule'

/**
 * LintConfig is the logical representation of the .sasjslint file.
 * It exposes two sets of rules - one to be run against each line in a file,
 * and one to be run once per file.
 *
 * More types of rules, when available, will be added here.
 */
export class LintConfig {
  readonly lineLintRules: LineLintRule[] = []
  readonly fileLintRules: FileLintRule[] = []
  readonly pathLintRules: PathLintRule[] = []

  constructor(json?: any) {
    if (json?.noTrailingSpaces) {
      this.lineLintRules.push(noTrailingSpaces)
    }

    if (json?.noEncodedPasswords) {
      this.lineLintRules.push(noEncodedPasswords)
    }

    if (json?.hasDoxygenHeader) {
      this.fileLintRules.push(hasDoxygenHeader)
    }

    if (json?.noSpacesInFileNames) {
      this.pathLintRules.push(noSpacesInFileNames)
    }
  }
}
