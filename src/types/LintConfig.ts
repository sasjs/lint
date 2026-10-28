import {
  hasDoxygenHeader,
  hasMacroNameInMend,
  noNestedCommentsInHeader,
  noNestedMacros,
  hasMacroParentheses,
  lineEndings,
  minMacroNameLength,
  strictMacroDefinition,
  hasRequiredMacroOptions,
  noSingleAsteriskComments,
  noUndeclaredMacros,
  noUnusedMacros,
  noUnusedLibnames
} from '../rules/file'
import {
  indentationMultiple,
  maxLineLength,
  noBannedStrings,
  noEncodedPasswords,
  noTabs,
  noTrailingSpaces,
  noGremlins
} from '../rules/line'
import { lowerCaseFileNames, noSpacesInFileNames } from '../rules/path'
import { LineEndings } from './LineEndings'
import { FileLintRule, LineLintRule, PathLintRule } from './LintRule'
import {
  getDefaultHeader,
  defaultBannedStrings,
  defaultIgnoredMacros
} from '../utils'
import { mergeLintConfig } from '../utils/mergeLintConfig'
import { Severity } from './Severity'

/**
 * LintConfig is the logical representation of the .sasjslint file.
 * It exposes two sets of rules - one to be run against each line in a file,
 * and one to be run once per file.
 *
 * More types of rules, when available, will be added here.
 */
export class LintConfig {
  /** The JSON this configuration was built from, so it can be overridden. */
  readonly source: any
  readonly ignoreList: string[] = []
  readonly allowedGremlins: string[] = []
  readonly lineLintRules: LineLintRule[] = []
  readonly fileLintRules: FileLintRule[] = []
  readonly pathLintRules: PathLintRule[] = []
  readonly maxLineLength: number = 80
  readonly maxHeaderLineLength: number = 80
  readonly maxDataLineLength: number = 80
  readonly indentationMultiple: number = 2
  readonly minMacroNameLength: number = 3
  readonly lineEndings: LineEndings = LineEndings.LF
  readonly defaultHeader: string = getDefaultHeader()
  readonly severityLevel: { [key: string]: Severity } = {}
  readonly requiredMacroOptions: string[] = []
  readonly ignoredLibnames: string[] = []
  readonly ignoredMacros: string[] = []
  readonly bannedStrings: string[] = []

  constructor(json?: any) {
    this.source = json ?? {}

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

    // An absent setting falls back to the documented default. An explicit list
    // replaces it, so `[]` reports `webout` like any other undeclared name.
    if (json?.ignoredMacros === undefined) {
      this.ignoredMacros.push(...defaultIgnoredMacros)
    } else if (!Array.isArray(json.ignoredMacros)) {
      throw new Error(
        `Property "ignoredMacros" can only be an array of strings.`
      )
    } else {
      json.ignoredMacros.forEach((item: any) => {
        if (typeof item === 'string') {
          this.ignoredMacros.push(item)
        } else {
          throw new Error(
            `Property "ignoredMacros" has invalid type of values. It can only contain strings.`
          )
        }
      })
    }

    if (json?.noTrailingSpaces !== false) {
      this.lineLintRules.push(noTrailingSpaces)
    }

    if (json?.noEncodedPasswords !== false) {
      this.lineLintRules.push(noEncodedPasswords)
    }

    // The default list is seeded only when the setting is absent, so an empty
    // array is an explicit "report nothing" rather than a fallback to the
    // defaults - the same contract `ignoredMacros` follows.
    if (json?.bannedStrings === undefined) {
      this.bannedStrings.push(...defaultBannedStrings)
    } else if (!Array.isArray(json.bannedStrings)) {
      throw new Error(
        `Property "bannedStrings" can only be an array of strings.`
      )
    } else {
      json.bannedStrings.forEach((item: any) => {
        if (typeof item === 'string' && item.length) {
          this.bannedStrings.push(item)
        } else {
          throw new Error(
            `Property "bannedStrings" has invalid type of values. It can contain only non-empty strings.`
          )
        }
      })
    }

    if (json?.noBannedStrings !== false) {
      this.lineLintRules.push(noBannedStrings)
    }

    this.lineLintRules.push(noTabs)
    if (json?.noTabs === false || json?.noTabIndentation === false) {
      this.lineLintRules.pop()
    }

    // An absent setting falls back to the default, so the rule is on unless the
    // value switches it off (0 or a negative number).
    if (json?.maxLineLength === undefined || json?.maxLineLength > 0) {
      this.lineLintRules.push(maxLineLength)

      if (!isNaN(json?.maxLineLength)) {
        this.maxLineLength = json.maxLineLength
      }

      if (!isNaN(json?.maxHeaderLineLength)) {
        this.maxHeaderLineLength = json.maxHeaderLineLength
      }

      if (!isNaN(json?.maxDataLineLength)) {
        this.maxDataLineLength = json.maxDataLineLength
      }
    }

    if (json?.lineEndings && json.lineEndings !== LineEndings.OFF) {
      if (
        json.lineEndings !== LineEndings.LF &&
        json.lineEndings !== LineEndings.CRLF
      ) {
        throw new Error(
          `Invalid value for lineEndings: can be ${LineEndings.LF} or ${LineEndings.CRLF}`
        )
      }
      this.fileLintRules.push(lineEndings)
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

    if (json?.hasMacroNameInMend !== false) {
      this.fileLintRules.push(hasMacroNameInMend)
    }

    if (json?.noNestedCommentsInHeader !== false) {
      this.fileLintRules.push(noNestedCommentsInHeader)
    }

    if (json?.noNestedMacros !== false) {
      this.fileLintRules.push(noNestedMacros)
    }

    // Absence means the documented default, so a project that omits the key
    // still gets the floor. A value below two switches the rule off, the way a
    // zero `maxLineLength` does - and the value is still kept, so the macro
    // rules read one-character names again.
    if (json?.minMacroNameLength !== undefined) {
      // A name length is a whole number of at least one. `isNaN` alone coerces,
      // so it would accept "3" and true, and a fraction or a value below one
      // would store a floor no name can be measured against - 1 is the
      // documented way to switch the rule off.
      if (
        typeof json?.minMacroNameLength !== 'number' ||
        !Number.isInteger(json.minMacroNameLength) ||
        json.minMacroNameLength < 1
      ) {
        throw new Error(
          `Property "minMacroNameLength" must be an integer of 1 or more.`
        )
      }
      this.minMacroNameLength = json.minMacroNameLength
    }

    if (json?.minMacroNameLength === undefined || json.minMacroNameLength > 1) {
      this.fileLintRules.push(minMacroNameLength)
    }

    if (json?.hasMacroParentheses !== false) {
      this.fileLintRules.push(hasMacroParentheses)
    }

    if (json?.strictMacroDefinition !== false) {
      this.fileLintRules.push(strictMacroDefinition)
    }

    if (json?.hasRequiredMacroOptions) {
      this.fileLintRules.push(hasRequiredMacroOptions)

      if (json?.requiredMacroOptions) {
        if (!Array.isArray(json.requiredMacroOptions)) {
          throw new Error(
            `Property "requiredMacroOptions" can only be an array of strings.`
          )
        }

        json.requiredMacroOptions.forEach((item: any) => {
          if (typeof item === 'string') {
            this.requiredMacroOptions.push(item)
          } else {
            throw new Error(
              `Property "requiredMacroOptions" has invalid type of values. It can only contain strings.`
            )
          }
        })
      }
    }

    if (json?.noSingleAsteriskComments) {
      this.fileLintRules.push(noSingleAsteriskComments)
    }

    if (json?.noUndeclaredMacros !== false) {
      this.fileLintRules.push(noUndeclaredMacros)
    }

    if (json?.noUnusedMacros !== false) {
      this.fileLintRules.push(noUnusedMacros)
    }

    // Off by default: a libref a file assigns can be used by another file.
    if (json?.noUnusedLibnames) {
      this.fileLintRules.push(noUnusedLibnames)

      if (json?.ignoredLibnames) {
        if (!Array.isArray(json.ignoredLibnames)) {
          throw new Error(
            `Property "ignoredLibnames" can only be an array of strings.`
          )
        }

        json.ignoredLibnames.forEach((item: any) => {
          if (typeof item === 'string') {
            this.ignoredLibnames.push(item)
          } else {
            throw new Error(
              `Property "ignoredLibnames" has invalid type of values. It can only contain strings.`
            )
          }
        })
      }
    }

    if (json?.noGremlins !== false) {
      this.lineLintRules.push(noGremlins)

      if (json?.allowedGremlins) {
        if (Array.isArray(json.allowedGremlins)) {
          json.allowedGremlins.forEach((item: any) => {
            if (typeof item === 'string' && /^0x[0-9a-f]{4}$/i.test(item))
              this.allowedGremlins.push(item)
            else
              throw new Error(
                `Property "allowedGremlins" has invalid type of values. It can contain only strings of form hexcode like '["0x0080", "0x3000"]'`
              )
          })
        } else {
          throw new Error(
            `Property "allowedGremlins" can only be an array of strings of form hexcode like '["0x0080", "0x3000"]'`
          )
        }
      }
    }

    if (json?.severityLevel) {
      for (const [rule, severity] of Object.entries(json.severityLevel)) {
        if (severity === 'warn') this.severityLevel[rule] = Severity.Warning
        if (severity === 'error') this.severityLevel[rule] = Severity.Error
      }
    }
  }

  /**
   * Returns a new configuration with an override merged over this one, so a
   * file can adjust the rules that apply to it.
   *
   * Scalars replace, arrays are additive and objects merge key by key - see
   * `mergeLintConfig`.
   *
   * @param {object} json - the override, as read from a `@sasjslint` block.
   * @returns {LintConfig} a new configuration; this one is unchanged.
   */
  override(json: any): LintConfig {
    const source = { ...this.source }

    // Arrays whose documented default is not empty are seeded into the base
    // before the merge. A per-file override is additive, and the project json
    // usually leaves such a key out rather than restating the default - without
    // the seed, an override that adds one entry would drop the rest.
    if (source.ignoredMacros === undefined) {
      source.ignoredMacros = [...this.ignoredMacros]
    }

    if (source.bannedStrings === undefined) {
      source.bannedStrings = [...this.bannedStrings]
    }

    return new LintConfig(mergeLintConfig(source, json))
  }
}
