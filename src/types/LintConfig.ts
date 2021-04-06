import { hasDoxygenHeader } from '../rules/hasDoxygenHeader'
import { indentationMultiple } from '../rules/indentationMultiple'
import { lowerCaseFileNames } from '../rules/lowerCaseFileNames'
import { maxLineLength } from '../rules/maxLineLength'
import { noEncodedPasswords } from '../rules/noEncodedPasswords'
import { noSpacesInFileNames } from '../rules/noSpacesInFileNames'
import { noTabIndentation } from '../rules/noTabIndentation'
import { noTrailingSpaces } from '../rules/noTrailingSpaces'
import { hasMacroNameInMend } from '../rules/hasMacroNameInMend'
import { noNestedMacros } from '../rules/noNestedMacros'
import { hasMacroParentheses } from '../rules/hasMacroParentheses'
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
  readonly maxLineLength: number = 80
  readonly indentationMultiple: number = 2

  constructor(json?: any) {
    if (json?.noTrailingSpaces) {
      this.lineLintRules.push(noTrailingSpaces)
    }

    if (json?.noEncodedPasswords) {
      this.lineLintRules.push(noEncodedPasswords)
    }

    if (json?.noTabIndentation) {
      this.lineLintRules.push(noTabIndentation)
    }

    if (json?.maxLineLength) {
      this.maxLineLength = json.maxLineLength
      this.lineLintRules.push(maxLineLength)
    }

    if (!isNaN(json?.indentationMultiple)) {
      this.indentationMultiple = json.indentationMultiple as number
      this.lineLintRules.push(indentationMultiple)
    }

    if (json?.hasDoxygenHeader) {
      this.fileLintRules.push(hasDoxygenHeader)
    }

    if (json?.noSpacesInFileNames) {
      this.pathLintRules.push(noSpacesInFileNames)
    }

    if (json?.lowerCaseFileNames) {
      this.pathLintRules.push(lowerCaseFileNames)
    }

    if (json?.hasMacroNameInMend) {
      this.fileLintRules.push(hasMacroNameInMend)
    }

    if (json?.noNestedMacros) {
      this.fileLintRules.push(noNestedMacros)
    }

    if (json?.hasMacroParentheses) {
      this.fileLintRules.push(hasMacroParentheses)
    }
  }
}
