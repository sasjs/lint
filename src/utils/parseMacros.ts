import { LintConfig, Macro } from '../types'
import { trimComments } from './trimComments'
import { splitLines } from './splitLines'

/** The `%macro` statement, in any capitalisation. */
const macroStatement = /^%macro\b/i
/** The `%mend` statement, in any capitalisation. */
const mendStatement = /^%mend\b/i
/**
 * The name in a `%macro` declaration, as written.
 *
 * The name runs to the first character that cannot belong to it: whitespace, an
 * opening parenthesis, the `/` that introduces the options, or an end of
 * statement. Reading it by pattern rather than from a fixed offset is what makes
 * `%MACRO`, `%macro  s` and `%macro\ts` yield the same name - the keyword and the
 * whitespace before the name can each be a different length.
 */
const declarationName = /^%macro\b\s*([^\s(;/]*)/i
/** The name in a `%mend` statement, as written. */
const mendName = /^%mend\b\s*([^\s;]*)/i

/** The name a macro statement carries, or an empty string when it has none. */
const getName = (statement: string, pattern: RegExp): string => {
  const match = pattern.exec(statement)

  return match ? match[1].trim() : ''
}

/**
 * A `%mend` that follows other text on the same statement, as written.
 *
 * `%mend` always starts a statement of its own, so `  %quote(&x) %mend f;` is
 * two: a macro call that ends without a semicolon, and the closing keyword.
 * Matching at a whitespace boundary keeps the keyword inside an identifier out
 * of it.
 */
const mendAfterText = /\s(%mend\b)/i

/** Whether a position sits inside a quoted value, counted from the quotes before it. */
const isQuotedAt = (text: string, index: number): boolean =>
  (text.slice(0, index).match(/'/g) ?? []).length % 2 === 1

/**
 * Splits one `;`-delimited statement where a `%mend` starts a statement of its own.
 *
 * A statement that ends without a semicolon - how every value-returning macro in
 * @sasjs/core ends - leaves the closing keyword inside the same statement when
 * the two share a line. A `%mend` that is not at the start of a statement is one
 * `hasMacroNameInMend` never sees, so it reported "Missing %mend statement" for
 * a macro that visibly closes. The quoted check keeps a `%mend` that is only text
 * - `%put 'the %mend keyword';` - inside the statement it belongs to.
 */
const splitAtMend = (statement: string): string[] => {
  const match = mendAfterText.exec(statement)

  if (!match || isQuotedAt(statement, match.index + 1)) {
    return [statement]
  }

  const at = match.index + 1

  return [statement.slice(0, at), ...splitAtMend(statement.slice(at))]
}

export const parseMacros = (text: string, config?: LintConfig): Macro[] => {
  const lines = splitLines(text)
  const macros: Macro[] = []

  let isCommentStarted = false
  let isQuoteStarted = ''
  let macroStack: Macro[] = []
  let isReadingMacroDefinition = false
  let isStatementContinues = true
  let tempMacroDeclaration = ''
  let tempMacroDeclarationLines: string[] = []
  let tempStartLineNumbers: number[] = []
  lines.forEach((line, lineIndex) => {
    // The state a line STARTS in belongs to the line's statements, and the state
    // it ENDS in belongs to the next line. Reading the second into the statement
    // loop swallowed the code that precedes a comment opening mid-line
    // (sasjs/lint#274).
    const stateBeforeLine = isCommentStarted
    const {
      statement: trimmedLine,
      commentStarted: stateAfterLine,
      quoteStarted: quoteAfterLine
    } = trimComments(line, stateBeforeLine, false, isQuoteStarted)
    isCommentStarted = stateAfterLine
    isQuoteStarted = quoteAfterLine

    isStatementContinues = !trimmedLine.endsWith(';')

    const statements: string[] = trimmedLine
      .split(';')
      .flatMap((statement) => splitAtMend(statement))

    if (isReadingMacroDefinition) {
      // checking if code is split into statements based on `;` is a part of HTML Encoded Character
      // if it happened, merges two statements into one
      statements.forEach((statement, statementIndex) => {
        if (/&[^\s]{1,5}$/.test(statement)) {
          const next = statements[statementIndex]
          const updatedStatement = `${statement};${
            statements[statementIndex + 1]
          }`
          statements.splice(statementIndex, 1, updatedStatement)
          statements.splice(statementIndex + 1, 1)
        }
      })
    }

    statements.forEach((statement, statementIndex) => {
      // The statements were split from the line's ALREADY trimmed text, so they
      // carry no comment and no quoted value: trimming them again either swallowed
      // the code after a comment that closes at the start of the line (`... */
      // %macro foo;`) or re-read a `/*` inside a multi-line string as a comment.
      const trimmedStatement = statement.trim()

      if (isReadingMacroDefinition) {
        tempMacroDeclaration =
          tempMacroDeclaration +
          (trimmedStatement ? ' ' + trimmedStatement : '')
        tempMacroDeclarationLines.push(line)
        tempStartLineNumbers.push(lineIndex + 1)

        if (!Object.is(statements.length - 1, statementIndex)) {
          isReadingMacroDefinition = false

          const name = getName(tempMacroDeclaration, declarationName)
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

      if (macroStatement.test(trimmedStatement)) {
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

        const name = getName(trimmedStatement, declarationName)
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
      } else if (mendStatement.test(trimmedStatement)) {
        if (macroStack.length) {
          const macro = macroStack.pop() as Macro
          const mendMacroName = getName(trimmedStatement, mendName)
          macro.endLineNumber = lineIndex + 1
          // SAS matches a macro name without regard to case, so `%mend s` closes
          // `%macro S()`. The name is kept as written for the rules that point at
          // it, and only the comparison folds the case.
          macro.hasMacroNameInMend =
            mendMacroName.toLowerCase() === macro.name.toLowerCase()
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
