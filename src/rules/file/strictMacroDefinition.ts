import { Diagnostic, LintConfig, Macro, Severity } from '../../types'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
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

const processParams = (
  content: string,
  macro: Macro,
  diagnostics: Diagnostic[],
  config?: LintConfig
): string => {
  const declaration = macro.declaration
  const severity = config?.severityLevel[name] || Severity.Warning

  const regExpParams = new RegExp(/(?<=\().*(?=\))/)
  const regExpParamsResult = regExpParams.exec(declaration)

  let _declaration = declaration
  if (regExpParamsResult) {
    const paramsPresent = regExpParamsResult[0]

    const params = paramsPresent.trim().split(',')
    params.forEach((param) => {
      const trimedParam = param.split('=')[0].trim()

      let paramLineNumber: number = 1,
        paramStartIndex: number = 1,
        paramEndIndex: number = content.length

      if (
        macro.declarationLines.findIndex(
          (dl) => dl.indexOf(trimedParam) !== -1
        ) === -1
      ) {
        const comment = '/\\*(.*?)\\*/'
        for (let i = 1; i < trimedParam.length; i++) {
          const paramWithComment =
            trimedParam.slice(0, i) + comment + trimedParam.slice(i)
          const regEx = new RegExp(paramWithComment)

          const declarationLineIndex = macro.declarationLines.findIndex(
            (dl) => !!regEx.exec(dl)
          )

          if (declarationLineIndex !== -1) {
            const declarationLine = macro.declarationLines[declarationLineIndex]
            const partFound = regEx.exec(declarationLine)![0]

            paramLineNumber = macro.startLineNumbers[declarationLineIndex]
            paramStartIndex = declarationLine.indexOf(partFound)
            paramEndIndex =
              declarationLine.indexOf(partFound) + partFound.length
            break
          }
        }
      } else {
        const declarationLineIndex = macro.declarationLines.findIndex(
          (dl) => dl.indexOf(trimedParam) !== -1
        )
        const declarationLine = macro.declarationLines[declarationLineIndex]
        paramLineNumber = macro.startLineNumbers[declarationLineIndex]

        paramStartIndex = declarationLine.indexOf(trimedParam)
        paramEndIndex =
          declarationLine.indexOf(trimedParam) + trimedParam.length
      }

      if (trimedParam.includes(' ')) {
        diagnostics.push({
          message: `Param '${trimedParam}' cannot have space`,
          lineNumber: paramLineNumber,
          startColumnNumber: paramStartIndex + 1,
          endColumnNumber: paramEndIndex,
          severity
        })
      }
    })

    _declaration = declaration.split(`(${paramsPresent})`)[1]
  }
  return _declaration
}

const processOptions = (
  _declaration: string,
  macro: Macro,
  diagnostics: Diagnostic[],
  config?: LintConfig
): void => {
  let optionsPresent = _declaration.split('/')?.[1]?.trim()
  const severity = config?.severityLevel[name] || Severity.Warning

  if (optionsPresent) {
    const regex = new RegExp(/=["|'](.*?)["|']/, 'g')

    let result = regex.exec(optionsPresent)

    // removing Option's `="..."` part, e.g. des="..."
    while (result) {
      optionsPresent =
        optionsPresent.slice(0, result.index) +
        optionsPresent.slice(result.index + result[0].length)

      result = regex.exec(optionsPresent)
    }

    optionsPresent
      .split(' ')
      ?.filter((o) => !!o)
      .forEach((option) => {
        const trimmedOption = option.trim()
        if (!validOptions.includes(trimmedOption.toUpperCase())) {
          const declarationLineIndex = macro.declarationLines.findIndex(
            (dl) => dl.indexOf(trimmedOption) !== -1
          )
          const declarationLine = macro.declarationLines[declarationLineIndex]

          diagnostics.push({
            message: `Option '${trimmedOption}' is not valid`,
            lineNumber: macro.startLineNumbers[declarationLineIndex],
            startColumnNumber: declarationLine.indexOf(trimmedOption) + 1,
            endColumnNumber:
              declarationLine.indexOf(trimmedOption) + trimmedOption.length,
            severity
          })
        }
      })
  }
}

const test = (value: string, config?: LintConfig) => {
  const diagnostics: Diagnostic[] = []

  const macros = parseMacros(value, config)

  macros.forEach((macro) => {
    const _declaration = processParams(value, macro, diagnostics, config)

    processOptions(_declaration, macro, diagnostics, config)
  })

  return diagnostics
}

/**
 * Lint rule that checks if a line has followed syntax for macro definition
 */
export const strictMacroDefinition: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
