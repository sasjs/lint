import { Diagnostic } from '../../types/Diagnostic'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { getColumnNumber } from '../../utils/getColumnNumber'
import { getIndex } from '../../utils/getIndex'
import { parseMacros } from '../../utils/parseMacros'
import { LintConfig } from '../../types'
import { Macro } from '../../types/Macro'
import { escapeRegExp } from '../../utils'
import { getSeverity } from '../../utils/getSeverity'

const name = 'hasMacroParentheses'
const description = 'Enforces the presence of parentheses in macro definitions.'
const message = 'Macro definition missing parentheses'

/**
 * The whole declaration line of a macro that takes no parameters: the keyword,
 * the name, an optional comment, and the end of the statement. Nothing else may
 * sit between the name and the `;`, which is what makes this the guard for the
 * fix - appending `()` to `%macro foo param=1;` would put the parentheses in
 * front of the parameters, so that shape is left to the author.
 */
const parameterlessDeclaration = (macroName: string) =>
  new RegExp(
    `(%macro\\s+${escapeRegExp(macroName)})((?:\\s*/\\*.*?\\*/)?\\s*;)`,
    'i'
  )

/** The line of the declaration that carries the macro name. */
const nameLine = (macro: Macro): number =>
  macro.declarationLines.findIndex((declarationLine) =>
    declarationLine.includes(macro.name)
  )

const test = (value: string, config?: LintConfig) => {
  const diagnostics: Diagnostic[] = []
  const macros = parseMacros(value, config)
  const severity = getSeverity(config, name, Severity.Warning)

  macros.forEach((macro) => {
    if (!macro.name) {
      diagnostics.push({
        message: 'Macro definition missing name',
        lineNumber: macro.startLineNumbers![0],
        startColumnNumber: getColumnNumber(
          macro.declarationLines![0],
          '%macro',
          true
        ),
        // The span ends on the declaration's last character, the convention the
        // other macro rules use.
        endColumnNumber:
          getColumnNumber(macro.declarationLines![0], '%macro', true) +
          macro.declaration.length -
          1,
        severity
      })
    } else if (!macro.declarationLines.find((dl) => dl.includes('('))) {
      const macroNameLineIndex = nameLine(macro)
      diagnostics.push({
        message,
        lineNumber: macro.startLineNumbers![macroNameLineIndex],
        startColumnNumber: getColumnNumber(
          macro.declarationLines[macroNameLineIndex],
          macro.name
        ),
        endColumnNumber:
          getColumnNumber(
            macro.declarationLines[macroNameLineIndex],
            macro.name
          ) +
          macro.name.length -
          1,
        severity
      })
    }
  })

  return diagnostics
}

/**
 * Adds the empty parameter list to every declaration that takes no parameters.
 *
 * The parentheses go immediately after the name, so any spacing that follows it
 * (and a comment on the same line) survives untouched. The declaration is the
 * guard: a line whose name is followed by parameter text does not match, so
 * `%macro foo param=1;` keeps its warning and is left to the author, and a
 * declaration that carries no name is skipped here for the same reason.
 *
 * Only the bytes of the declaration line are rewritten - the rest of the file,
 * its line endings included, is copied through untouched.
 */
const fix = (value: string, config?: LintConfig): string => {
  if (!value) return value

  // The name's line is resolved once, in the filter, so the loop has no
  // unreachable branch for a declaration whose name the parser invented.
  const declarations = parseMacros(value, config)
    .filter((macro) => !!macro.name)
    .map((macro) => ({ macro, index: nameLine(macro) }))
    .filter(({ index }) => index !== -1)

  return declarations.reduce((text, { macro, index }) => {
    const lineNumber = macro.startLineNumbers[index]
    // The offsets of this line and of the next one, measured on the text as it
    // stands. `getIndex` clamps to the end of the file, so the last line ends
    // there.
    const start = getIndex(text, lineNumber, 1)
    const end = getIndex(text, lineNumber + 1, 1)

    // The line is taken with its terminator and put back with it, so every byte
    // of the file other than the two this fix inserts is left alone.
    const line = text.slice(start, end)

    // Anchored on the statement rather than the line, so a line carrying two
    // declarations gets each of them in turn. `$2` keeps the spacing before the
    // `;` and any comment that sits between the name and it.
    const pattern = parameterlessDeclaration(macro.name)

    if (!pattern.test(line)) return text

    return (
      text.slice(0, start) + line.replace(pattern, '$1()$2') + text.slice(end)
    )
  }, value)
}

/**
 * Lint rule that enforces the presence of parentheses in macro definitions.. It
 * reports a definition with no name or with no parentheses, and its fix adds
 * the empty parameter list to a declaration that takes no parameters.
 */
export const hasMacroParentheses: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test,
  fix
}
