import { LintConfig } from '../types/LintConfig'
import { LineEndings } from '../types/LineEndings'
import { trimComments } from './trimComments'

interface Macro {
  name: string
  startLineNumber: number | null
  endLineNumber: number | null
  declaration: string
  termination: string
  declarationTrimmedStatement: string
  terminationTrimmedStatement: string
  parentMacro: string
  hasMacroNameInMend: boolean
  hasParentheses: boolean
  mismatchedMendMacroName: string
}

export const parseMacros = (text: string, config?: LintConfig): Macro[] => {
  const lineEnding = config?.lineEndings === LineEndings.CRLF ? '\r\n' : '\n'
  const lines: string[] = text ? text.split(lineEnding) : []
  const macros: Macro[] = []

  let isCommentStarted = false
  let macroStack: Macro[] = []
  lines.forEach((line, index) => {
    const { statement: trimmedLine, commentStarted } = trimComments(
      line,
      isCommentStarted
    )
    isCommentStarted = commentStarted
    const statements: string[] = trimmedLine ? trimmedLine.split(';') : []

    statements.forEach((statement) => {
      const { statement: trimmedStatement, commentStarted } = trimComments(
        statement,
        isCommentStarted
      )
      isCommentStarted = commentStarted

      if (trimmedStatement.startsWith('%macro')) {
        const startLineNumber = index + 1
        const name = trimmedStatement
          .slice(7, trimmedStatement.length)
          .trim()
          .split('(')[0]
        macroStack.push({
          name,
          startLineNumber,
          endLineNumber: null,
          parentMacro: macroStack.length
            ? macroStack[macroStack.length - 1].name
            : '',
          hasParentheses: trimmedStatement.endsWith('()'),
          hasMacroNameInMend: false,
          mismatchedMendMacroName: '',
          declaration: line,
          termination: '',
          declarationTrimmedStatement: trimmedStatement,
          terminationTrimmedStatement: ''
        })
      } else if (trimmedStatement.startsWith('%mend')) {
        if (macroStack.length) {
          const macro = macroStack.pop() as Macro
          const mendMacroName =
            trimmedStatement.split(' ').filter((s: string) => !!s)[1] || ''
          macro.endLineNumber = index + 1
          macro.hasMacroNameInMend = trimmedStatement.includes(macro.name)
          macro.mismatchedMendMacroName = macro.hasMacroNameInMend
            ? ''
            : mendMacroName
          macro.termination = line
          macro.terminationTrimmedStatement = trimmedStatement
          macros.push(macro)
        } else {
          macros.push({
            name: '',
            startLineNumber: null,
            endLineNumber: index + 1,
            parentMacro: '',
            hasParentheses: false,
            hasMacroNameInMend: false,
            mismatchedMendMacroName: '',
            declaration: '',
            termination: line,
            declarationTrimmedStatement: '',
            terminationTrimmedStatement: trimmedStatement
          })
        }
      }
    })
  })

  macros.push(...macroStack)

  return macros
}
