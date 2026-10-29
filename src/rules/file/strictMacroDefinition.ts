import { Diagnostic, LintConfig, Macro, Severity } from '../../types'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { escapeRegExp } from '../../utils'
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

/**
 * Reads a declaration's parameter list: where the list sits, and the text of each
 * parameter, from ONE depth- and quote-aware pass.
 *
 * A declaration can run past its list - `)/secure`, then `des = '...'` - and a
 * value can carry parentheses or commas of its own (`%sysfunc(pathname(work))`,
 * `%sysfunc(catx(,x y,z))`, `des = 'a, b'`), so:
 *
 * - the list ends at the parenthesis that closes the first one, not at the last
 *   `)` in the declaration;
 * - a comma separates parameters only at depth zero and outside a quoted value.
 *
 * Both facts come from the same reading of the same text. They used to be two
 * scans - one delimiting the list, one splitting it - which disagreed about a
 * comma inside a nested call and left `x y` looking like a parameter name.
 * Returns an unclosed list as `null`, in which case there is nothing to check.
 */
const parseParamList = (
  declaration: string
): { list: string | null; params: string[]; listEnd: number } => {
  const open = declaration.indexOf('(')
  if (open === -1) return { list: null, params: [], listEnd: -1 }

  const params: string[] = []
  let current = ''
  let quote = ''
  let depth = 0

  for (let index = open + 1; index < declaration.length; index++) {
    const character = declaration[index]

    // Inside a quoted value nothing is syntax: SAS accepts both quote characters,
    // and a `)` or a `,` in a value is text.
    if (quote) {
      current += character
      if (character === quote) quote = ''
      continue
    }

    if (character === "'" || character === '"') {
      quote = character
      current += character
      continue
    }

    if (character === '(') depth++

    if (character === ')') {
      if (depth === 0) {
        params.push(current)

        return {
          list: declaration.slice(open + 1, index),
          params,
          listEnd: index
        }
      }

      depth--
    }

    if (character === ',' && depth === 0) {
      params.push(current)
      current = ''
      continue
    }

    current += character
  }

  return { list: null, params: [], listEnd: -1 }
}

const processParams = (
  content: string,
  macro: Macro,
  diagnostics: Diagnostic[],
  config?: LintConfig
): string => {
  const declaration = macro.declaration
  const severity = config?.severityLevel[name] || Severity.Warning

  // The parser reports a declaration with its comments removed, including one that
  // spans lines (sasjs/lint#274), so the list is read from the declaration itself.
  const {
    list: paramList,
    params: rawParams,
    listEnd
  } = parseParamList(declaration)
  const params = rawParams.map((param) => param.trim())

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
      // The parameter name is interrupted by a comment in the declaration line,
      // so the name as the parser reads it is not the text the line holds. Look
      // for it with a comment in each possible position - the name and the
      // suffix are escaped, since they come from the file and a parenthesis in
      // one of them used to make the pattern invalid.
      const comment = '/\\*(.*?)\\*/'
      for (let i = 1; i < trimedParam.length; i++) {
        const paramWithComment =
          escapeRegExp(trimedParam.slice(0, i)) +
          comment +
          escapeRegExp(trimedParam.slice(i))
        const regEx = new RegExp(paramWithComment)

        const declarationLineIndex = macro.declarationLines.findIndex(
          (dl) => !!regEx.exec(dl)
        )

        if (declarationLineIndex !== -1) {
          const declarationLine = macro.declarationLines[declarationLineIndex]
          const partFound = regEx.exec(declarationLine)![0]

          paramLineNumber = macro.startLineNumbers[declarationLineIndex]
          paramStartIndex = declarationLine.indexOf(partFound)
          paramEndIndex = declarationLine.indexOf(partFound) + partFound.length
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
      paramEndIndex = declarationLine.indexOf(trimedParam) + trimedParam.length
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

  if (paramList === null) return declaration

  // The options text starts after the parenthesis that CLOSES the parameter list,
  // which is where `parseParamList` says the list ends. It used to start after the
  // LAST `)` in the declaration, so an option value carrying its own parenthesis
  // (`des = 'Run %m(HELP) for help.'`) cut the text short and the options after it
  // were never checked.
  return declaration.slice(listEnd + 1)
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
    // An option value is quoted and can hold spaces - and the other quote
    // character, as in `des = 'Run %m("x") for help.'` - so the value is removed
    // up to its matching quote before the text is split on spaces. SAS accepts
    // whitespace around the `=`.
    const regex = new RegExp(/=\s*(['"])([\s\S]*?)\1/, 'g')

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
