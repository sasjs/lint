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
  noTabs,
  noTrailingSpaces,
  noGremlins
} from '../rules/line'
import { lowerCaseFileNames, noSpacesInFileNames } from '../rules/path'
import { LineEndings } from './LineEndings'
import { FileLintRule, LineLintRule, PathLintRule } from './LintRule'
import { getDefaultHeader } from '../utils'
import { Severity } from './Severity'

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
  readonly defaultHeader: string = getDefaultHeader()
  readonly severityLevel: { [key: string]: Severity } = {}

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

    if (json?.noTrailingSpaces !== false) {
      this.lineLintRules.push(noTrailingSpaces)
    }

    if (json?.noEncodedPasswords !== false) {
      this.lineLintRules.push(noEncodedPasswords)
    }

    this.lineLintRules.push(noTabs)
    if (json?.noTabs === false || json?.noTabIndentation === false) {
      this.lineLintRules.pop()
    }

    this.lineLintRules.push(maxLineLength)
    if (!isNaN(json?.maxLineLength)) {
      this.maxLineLength = json.maxLineLength
    }

    this.fileLintRules.push(lineEndings)
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
    }

    this.lineLintRules.push(indentationMultiple)
    if (!isNaN(json?.indentationMultiple)) {
      this.indentationMultiple = json.indentationMultiple as number
    }

    if (json?.hasDoxygenHeader !== false) {
      this.fileLintRules.push(hasDoxygenHeader)
    }

    if (json?.defaultHeader) {
      this.defaultHeader = json.defaultHeader
    }

    if (json?.noSpacesInFileNames !== false) {
      this.pathLintRules.push(noSpacesInFileNames)
    }

    if (json?.lowerCaseFileNames !== false) {
      this.pathLintRules.push(lowerCaseFileNames)
    }

    if (json?.hasMacroNameInMend) {
      this.fileLintRules.push(hasMacroNameInMend)
    }

    if (json?.noNestedMacros !== false) {
      this.fileLintRules.push(noNestedMacros)
    }

    if (json?.hasMacroParentheses !== false) {
      this.fileLintRules.push(hasMacroParentheses)
    }

    if (json?.strictMacroDefinition !== false) {
      this.fileLintRules.push(strictMacroDefinition)
    }

    if (json?.noGremlins !== false) {
      this.lineLintRules.push(noGremlins)
    }

    if (json?.severityLevel) {
      for (const [rule, severity] of Object.entries(json.severityLevel)) {
        if (severity === 'warn') this.severityLevel[rule] = Severity.Warning
        if (severity === 'error') this.severityLevel[rule] = Severity.Error
      }
    }
  }
}
