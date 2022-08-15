import {
  hasDoxygenHeader,
  hasMacroNameInMend,
  noNestedMacros,
  hasMacroParentheses,
  lineEndings,
  strictMacroDefinition
} from '../rules/file'
import {
  indentationMultiple,
  maxLineLength,
  noEncodedPasswords,
  noTabIndentation,
  noTrailingSpaces
} from '../rules/line'
import { lowerCaseFileNames, noSpacesInFileNames } from '../rules/path'
import { LineEndings } from './LineEndings'
import { FileLintRule, LineLintRule, PathLintRule } from './LintRule'

/**
 * LintConfig is the logical representation of the .sasjslint file.
 * It exposes two sets of rules - one to be run against each line in a file,
 * and one to be run once per file.
 *
 * More types of rules, when available, will be added here.
 */
export class LintConfig {
  readonly ignoreList: string[] = []
  readonly lineLintRules: LineLintRule[] = []
  readonly fileLintRules: FileLintRule[] = []
  readonly pathLintRules: PathLintRule[] = []
  readonly maxLineLength: number = 80
  readonly indentationMultiple: number = 2
  readonly lineEndings: LineEndings = LineEndings.LF

  constructor(json?: any) {
    if (json?.ignoreList) {
      if (Array.isArray(json.ignoreList)) {
        json.ignoreList.forEach((item: any) => {
          if (typeof item === 'string') this.ignoreList.push(item)
          else
            throw new Error(
              `Property "ignoreList" has invalid type of values. It can contain only strings.`
            )
        })
      } else {
        throw new Error(`Property "ignoreList" can only be an array of strings`)
      }
    }

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

    if (json?.lineEndings) {
      if (
        json.lineEndings !== LineEndings.LF &&
        json.lineEndings !== LineEndings.CRLF
      ) {
        throw new Error(
          `Invalid value for lineEndings: can be ${LineEndings.LF} or ${LineEndings.CRLF}`
        )
      }
      this.lineEndings = json.lineEndings
      this.fileLintRules.push(lineEndings)
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

    if (json?.strictMacroDefinition) {
      this.fileLintRules.push(strictMacroDefinition)
    }
  }
}
