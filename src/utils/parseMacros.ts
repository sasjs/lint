import { LintConfig } from '../types/LintConfig'
import { LineEndings } from '../types/LineEndings'
import { trimComments } from './trimComments'

interface Macro {
  name: string
  startLineNumbers: number[]
  endLineNumber: number | null
  declarationLines: string[]
  terminationLine: string
  declaration: string
  termination: string
  parentMacro: string
  hasMacroNameInMend: boolean
  mismatchedMendMacroName: string
}

export const parseMacros = (text: string, config?: LintConfig): Macro[] => {
  const lineEnding = config?.lineEndings === LineEndings.CRLF ? '\r\n' : '\n'
  const lines: string[] = text ? text.split(lineEnding) : []
  const macros: Macro[] = []

  let isCommentStarted = false
  let macroStack: Macro[] = []
  let isReadingMacroDefinition = false
  let isStatementContinues = true
  let tempMacroDeclaration = ''
  let tempMacroDeclarationLines: string[] = []
  let tempStartLineNumbers: number[] = []
  lines.forEach((line, lineIndex) => {
    const { statement: trimmedLine, commentStarted } = trimComments(
      line,
      isCommentStarted
    )
    isCommentStarted = commentStarted

    isStatementContinues = !trimmedLine.endsWith(';')

    const statements: string[] = trimmedLine.split(';')

    statements.forEach((statement, statementIndex) => {
      const { statement: trimmedStatement, commentStarted } = trimComments(
        statement,
        isCommentStarted
      )
      isCommentStarted = commentStarted

      if (isReadingMacroDefinition) {
        tempMacroDeclaration =
          tempMacroDeclaration +
          (trimmedStatement ? ' ' + trimmedStatement : '')
        tempMacroDeclarationLines.push(line)
        tempStartLineNumbers.push(lineIndex + 1)

        if (!Object.is(statements.length - 1, statementIndex)) {
          isReadingMacroDefinition = false

          const name = tempMacroDeclaration
            .slice(7, tempMacroDeclaration.length)
            .trim()
            .split('/')[0]
            .split('(')[0]
            .trim()
          macroStack.push({
            name,
            startLineNumbers: tempStartLineNumbers,
            endLineNumber: null,
            parentMacro: macroStack.length
              ? macroStack[macroStack.length - 1].name
              : '',
            hasMacroNameInMend: false,
            mismatchedMendMacroName: '',
            declarationLines: tempMacroDeclarationLines,
            terminationLine: '',
            declaration: tempMacroDeclaration,
            termination: ''
          })
        }
      }

      if (trimmedStatement.startsWith('%macro')) {
        const startLineNumber = lineIndex + 1

        if (
          isStatementContinues &&
          Object.is(statements.length - 1, statementIndex)
        ) {
          tempMacroDeclaration = trimmedStatement
          tempMacroDeclarationLines = [line]
          tempStartLineNumbers = [startLineNumber]
          isReadingMacroDefinition = true
          return
        }

        const name = trimmedStatement
          .slice(7, trimmedStatement.length)
          .trim()
          .split('/')[0]
          .split('(')[0]
          .trim()
        macroStack.push({
          name,
          startLineNumbers: [startLineNumber],
          endLineNumber: null,
          parentMacro: macroStack.length
            ? macroStack[macroStack.length - 1].name
            : '',
          hasMacroNameInMend: false,
          mismatchedMendMacroName: '',
          declarationLines: [line],
          terminationLine: '',
          declaration: trimmedStatement,
          termination: ''
        })
      } else if (trimmedStatement.startsWith('%mend')) {
        if (macroStack.length) {
          const macro = macroStack.pop() as Macro
          const mendMacroName =
            trimmedStatement.split(' ').filter((s: string) => !!s)[1] || ''
          macro.endLineNumber = lineIndex + 1
          macro.hasMacroNameInMend = mendMacroName === macro.name
          macro.mismatchedMendMacroName = macro.hasMacroNameInMend
            ? ''
            : mendMacroName
          macro.terminationLine = line
          macro.termination = trimmedStatement
          macros.push(macro)
        } else {
          macros.push({
            name: '',
            startLineNumbers: [],
            endLineNumber: lineIndex + 1,
            parentMacro: '',
            hasMacroNameInMend: false,
            mismatchedMendMacroName: '',
            declarationLines: [],
            terminationLine: line,
            declaration: '',
            termination: trimmedStatement
          })
        }
      }
    })
  })

  macros.push(...macroStack)

  return macros
}
