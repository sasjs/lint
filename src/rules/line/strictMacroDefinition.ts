import { Diagnostic } from '../../types/Diagnostic'
import { LintConfig } from '../../types'
import { LineLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { parseMacros } from '../../utils/parseMacros'

const name = 'strictMacroDefinition'
const description = 'Enforce strictly rules of macro definition syntax.'
const message = 'Incorrent Macro Definition Syntax'

const validOptions = [
  'CMD',
  'DES',
  'MINDELIMITER',
  'MINOPERATOR',
  'NOMINOPERATOR',
  'PARMBUFF',
  'SECURE',
  'NOSECURE',
  'STMT',
  'SOURCE',
  'SRC',
  'STORE'
]

const test = (value: string, lineNumber: number) => {
  const diagnostics: Diagnostic[] = []

  const macros = parseMacros(value)
  const declaration = macros[0]?.declaration
  if (!declaration) return []

  const regExpParams = new RegExp(/\((.*?)\)/)
  const regExpParamsResult = regExpParams.exec(declaration)

  let _declaration = declaration
  if (regExpParamsResult) {
    const paramsPresent = regExpParamsResult[1]

    const paramsTrimmed = paramsPresent.trim()
    const params = paramsTrimmed.split(',')
    params.forEach((param) => {
      const trimedParam = param.split('=')[0].trim()
      if (trimedParam.includes(' ')) {
        diagnostics.push({
          message: `Param '${trimedParam}' cannot have space`,
          lineNumber,
          startColumnNumber: value.indexOf(trimedParam) + 1,
          endColumnNumber: value.indexOf(trimedParam) + trimedParam.length,
          severity: Severity.Warning
        })
      }
    })

    _declaration = declaration.split(`(${paramsPresent})`)[1]
  }

  const optionsPresent = _declaration.split('/')?.[1]?.trim().split(' ')

  optionsPresent
    ?.filter((o) => !!o)
    .forEach((option) => {
      const trimmedOption = option.trim()
      if (!validOptions.includes(trimmedOption.toUpperCase())) {
        diagnostics.push({
          message: `Option '${trimmedOption}' is not valid`,
          lineNumber,
          startColumnNumber: value.indexOf(trimmedOption) + 1,
          endColumnNumber: value.indexOf(trimmedOption) + trimmedOption.length,
          severity: Severity.Warning
        })
      }
    })

  return diagnostics
}

/**
 * Lint rule that checks if a line has followed syntax for macro definition
 */
export const strictMacroDefinition: LineLintRule = {
  type: LintRuleType.Line,
  name,
  description,
  message,
  test
}
