import { hasDoxygenHeader } from '../rules/hasDoxygenHeader'
import { noEncodedPasswords } from '../rules/noEncodedPasswords'
import { noTrailingSpaces } from '../rules/noTrailingSpaces'
import { FileLintRule, LineLintRule } from './LintRule'

export class LintConfig {
  readonly lineLintRules: LineLintRule[] = []
  readonly fileLintRules: FileLintRule[] = []

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
  }
}
