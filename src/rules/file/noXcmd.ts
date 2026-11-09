import { Diagnostic, LintConfig } from '../../types'
import { FileLintRule } from '../../types/LintRule'
import { LintRuleType } from '../../types/LintRuleType'
import { Severity } from '../../types/Severity'
import { getPosition } from '../../utils'
import { getSeverity } from '../../utils/getSeverity'

const name = 'noXcmd'
const description =
  'Disallow OS commands, which need XCMD: the x statement, call system, %sysexec, %sysfunc(system(...)), options xcmd, a pipe fileref and systask command. `options noxcmd;` is the hardening and is not reported.'
const message = 'OS command requires XCMD'

/** A construct that needs XCMD, and the text that names it in the diagnostic. */
interface Finding {
  index: number
  length: number
}

interface Construct {
  label: string
  /**
   * `statementStarts` is every offset where a SAS statement begins, as the mask
   * saw them - a construct that is one letter long cannot be told from a
   * continuation line by its own pattern.
   */
  find: (code: string, statementStarts: number[]) => Finding[]
}

/**
 * Blanks everything SAS does not compile, keeping the text's length so that a
 * column measured here is the file's column.
 *
 * Comments become spaces and the CONTENT of a quoted value becomes `_`, which
 * leaves the quotes themselves visible - `x "cmd";` reads as `x "____";`, so a
 * construct is still recognisable while the words inside a string are not.
 *
 * Both comment syntaxes are blanked, because the constructs this rule looks for
 * are exactly what a header or a note tends to mention: the block comment,
 * which SAS ends at the first close marker, and the comment statement
 * (`* ...;` and `%* ...;`), which SAS ends at the first semicolon. A comment
 * statement only starts in statement position, so `x = a * b;` keeps its
 * asterisk while `run; * note;` is a comment.
 *
 * Quotes are carried across lines, as the engine does: `x = "ab` / `cd";` is
 * one string, and only that reading stops the continuation from being linted as
 * code. An unterminated quote therefore hides the rest of the file rather than
 * reporting a construct that is really string content.
 */
const maskNonCode = (text: string) => {
  const characters = text.split('')
  const statementStarts: number[] = []
  let statementStarted = false
  let inBlockComment = false
  let inCommentStatement = false
  let quote = ''
  let index = 0

  const blank = (position: number) => {
    if (text[position] !== '\n') characters[position] = ' '
  }

  while (index < text.length) {
    const character = text[index]
    const next = text[index + 1]

    if (inBlockComment) {
      if (character === '*' && next === '/') {
        blank(index)
        blank(index + 1)
        inBlockComment = false
        index += 2
        continue
      }

      blank(index)
      index++
      continue
    }

    if (inCommentStatement) {
      // The terminating `;` stays: it ends the comment AND the statement the
      // next construct may start from, so blanking it would hide `* note; x
      // "ls";`. Only the comment text goes.
      if (character === ';') {
        inCommentStatement = false
        statementStarted = false
        index++
        continue
      }

      blank(index)
      index++
      continue
    }

    if (quote) {
      if (character === quote) {
        // A doubled delimiter is an escaped quote inside the literal, so the
        // literal continues.
        if (next === quote) {
          characters[index] = '_'
          characters[index + 1] = '_'
          index += 2
          continue
        }

        quote = ''
        index++
        continue
      }

      if (character !== '\n') characters[index] = '_'
      index++
      continue
    }

    if (character === '/' && next === '*') {
      blank(index)
      blank(index + 1)
      inBlockComment = true
      index += 2
      continue
    }

    if (!statementStarted && character === '%' && next === '*') {
      blank(index)
      blank(index + 1)
      inCommentStatement = true
      index += 2
      continue
    }

    if (!statementStarted && character === '*') {
      blank(index)
      inCommentStatement = true
      index++
      continue
    }

    // A quoted value never BEGINS a statement, so this does not record a start:
    // the patterns that read starts look for a keyword or for `x`, and a quote
    // matches neither.
    if (character === "'" || character === '"') {
      quote = character
      statementStarted = true
      index++
      continue
    }

    if (character === ';') {
      statementStarted = false
      index++
      continue
    }

    if (!/\s/.test(character)) {
      if (!statementStarted) statementStarts.push(index)

      statementStarted = true
    }

    index++
  }

  return { code: characters.join(''), statementStarts }
}

/** The offset each line starts at, so a line index becomes a character index. */
const getLineStarts = (text: string) => {
  const starts = [0]

  for (let index = 0; index < text.length; index++) {
    if (text[index] === '\n') starts.push(index + 1)
  }

  return starts
}

/**
 * Blanks the `datalines` payloads: data is not code, and a value holding
 * `call system` is not something a developer typed as a command.
 *
 * Two passes, and both are load-bearing:
 *
 * - the STATEMENT is found in the text after `maskNonCode`, so a `datalines;`
 *   written inside a comment or a quoted value does not open a payload. Finding
 *   it on the raw text let a header that documents the statement blank every
 *   construct between it and the next line starting with `;`.
 * - the PAYLOAD is then blanked in the RAW text, before the mask reads it,
 *   because a payload is arbitrary text: one holding a lone apostrophe (a name
 *   like O'Brien) or a `/*` would otherwise open a string or a comment inside
 *   the mask and hide everything after it.
 *
 * The statement is matched here rather than through `getDataSectionsDetail`,
 * which requires the keyword at column 1 - an indented `datalines;` inside a
 * macro body is not seen there. SAS ends a plain payload at the first line that
 * starts with `;`, and a `datalines4` payload at the first line that starts
 * with `;;;;`; both are matched at the start of the line, because an indented
 * `;` is data.
 */
const blankDatalines = (text: string) => {
  const { code: codeOnly } = maskNonCode(text)
  const statement = /(?:^|;)[ \t]*(datalines|cards|parmcards)(4)?[ \t]*;/gim
  const characters = text.split('')
  const lineStarts = getLineStarts(text)
  let match

  while ((match = statement.exec(codeOnly))) {
    const terminator = match[2] ? /^;;;;/ : /^;/
    const from = match.index + match[0].length
    const end = lineStarts.findIndex((start, index) => {
      if (start < from) return false

      return terminator.test(text.slice(start, lineStarts[index + 1]))
    })

    // A statement with no terminator line is not a payload this scan can
    // delimit, so nothing is blanked. Blanking to the end of the file would
    // hide every construct after it, which is worse than reading a phantom
    // payload as code.
    if (end === -1) continue

    // Through the end of the terminator line, so the payload's own content and
    // the terminator are both taken out of the scanned text.
    const to = lineStarts[end + 1] ?? text.length

    for (let index = from; index < to; index++) {
      if (characters[index] !== '\n') characters[index] = ' '
    }
  }

  return characters.join('')
}

/** The words between two offsets, with the character index each one starts at. */
const getTokens = (code: string, from: number, to: number) => {
  const tokens: { value: string; index: number }[] = []
  let index = from

  while (index < to) {
    if (/\s/.test(code[index])) {
      index++
      continue
    }

    const start = index

    while (index < to && !/\s/.test(code[index])) index++

    // A token that ends a statement carries the terminator; the token is the
    // word before it.
    tokens.push({
      value: code.slice(start, index).replace(/;$/, ''),
      index: start
    })
  }

  return tokens
}

/**
 * The `x` statement: the shell-out SAS spells as a single letter.
 *
 * Reported only where a statement begins, so `keep x` and a `%let x="a";` are
 * not commands, and only when a command follows. The command may be quoted
 * (`x "ls";`, the documented form) or bare (`x dir;`), so a bare word counts
 * too - but a word followed by `=` or `+` is the DATA step's assignment and sum
 * statement, and a `,`, `;` or `)` closes a statement that was not a command.
 */
const xStatement: Construct = {
  label: 'x statement',
  find: (code, statementStarts) => {
    const found: Finding[] = []

    statementStarts.forEach((start) => {
      // `^` here is the statement start the mask recorded, not a line start: a
      // continuation line beginning `x from t;` in a multi-line PROC SQL is not
      // a command.
      if (!/^x[ \t]+(?![-+=,;)])\S/i.test(code.slice(start))) return

      found.push({ index: start, length: 1 })
    })

    return found
  }
}

/** `call system(...)`, with or without a space before the parenthesis. */
const callSystem: Construct = {
  label: 'call system',
  find: (code) => {
    // `\s+` rather than a space class: a statement can be wrapped after `call`.
    const regex = /\bcall\s+system\s*\(/gi
    const found: { index: number; length: number }[] = []
    let match

    while ((match = regex.exec(code))) {
      found.push({ index: match.index, length: match[0].length })
    }

    return found
  }
}

/**
 * `%sysexec`, anchored on the macro name: the `%` is what makes it a call, so
 * `%mf_sysexec(...)` is a user macro and does not match.
 */
const sysExec: Construct = {
  label: '%sysexec',
  find: (code) => {
    const regex = /%sysexec\b/gi
    const found: { index: number; length: number }[] = []
    let match

    while ((match = regex.exec(code))) {
      found.push({ index: match.index, length: match[0].length })
    }

    return found
  }
}

/** `%sysfunc(system(...))` - the same command reached as a function call. */
const sysFuncSystem: Construct = {
  label: '%sysfunc(system(...))',
  find: (code) => {
    const regex = /%sysfunc\s*\(\s*system\s*\(/gi
    const found: { index: number; length: number }[] = []
    let match

    while ((match = regex.exec(code))) {
      found.push({ index: match.index, length: match[0].length })
    }

    return found
  }
}

/**
 * Whether `name(` at this position is a data set reference rather than a call.
 *
 * SAS writes data set options straight after the member name - `set
 * work.system(keep=x);`, `proc sort data=system(where=(...));` - so `system(`
 * is not always the function. A member reference is preceded by `.` or by the
 * keyword that takes the list (`set`, `merge`, `data=`, `out=`, ...). An
 * ASSIGNMENT is not: `rc = system('ls');` has `rc` before the `=`, which is the
 * case this guard must keep reporting.
 */
const DATASET_KEYWORDS = [
  'set',
  'merge',
  'update',
  'modify',
  'data',
  'out',
  'in',
  'base'
]

const isDatasetReference = (code: string, index: number) => {
  const before = code.slice(0, index).trimEnd()
  const lastCharacter = before[before.length - 1]

  if (lastCharacter === '.') return true

  // For `data=system(` the keyword sits before the `=`; for `set system(` it
  // sits before the name with a space between them.
  const prefix = lastCharacter === '=' ? before.slice(0, -1).trimEnd() : before
  const keyword = /([A-Za-z_][A-Za-z0-9_]*)$/.exec(prefix)?.[1] ?? ''

  return DATASET_KEYWORDS.includes(keyword.toLowerCase())
}

/**
 * `system(...)` as a function, which is the same command without the wrapping
 * `%sysfunc`. A macro call (`%system(...)`) is a user macro rather than the SAS
 * function, so a `%` immediately before the name is not a match.
 */
const systemFunction: Construct = {
  label: 'system(...)',
  find: (code) => {
    const regex = /\bsystem\s*\(/gi
    const found: { index: number; length: number }[] = []
    let match

    while ((match = regex.exec(code))) {
      if (code[match.index - 1] === '%') continue

      // `%macro system();` names a macro rather than calling the function.
      const before = code.slice(Math.max(0, match.index - 20), match.index)

      if (/%(macro|mend)\s+$/i.test(before)) continue

      if (isDatasetReference(code, match.index)) continue

      found.push({ index: match.index, length: match[0].length })
    }

    return found
  }
}

/** `systask command`. */
const sysTaskCommand: Construct = {
  label: 'systask command',
  find: (code) => {
    const regex = /\bsystask\s+command\b/gi
    const found: { index: number; length: number }[] = []
    let match

    while ((match = regex.exec(code))) {
      found.push({ index: match.index, length: match[0].length })
    }

    return found
  }
}

/**
 * `options xcmd;` - the positive form only. `options noxcmd;` is the statement
 * that turns the capability off, and reporting it would push a project away from
 * the hardening it performs.
 */
const optionsXcmd: Construct = {
  label: 'options xcmd',
  find: (code) => {
    const regex = /(?:^|;)[ \t]*options\b([^;]*)/gim
    const found: { index: number; length: number }[] = []
    let match

    while ((match = regex.exec(code))) {
      const to = match.index + match[0].length
      const from = to - match[1].length

      getTokens(code, from, to)
        .filter((token) => token.value.toLowerCase() === 'xcmd')
        .forEach((token) =>
          found.push({ index: token.index, length: token.value.length })
        )
    }

    return found
  }
}

/**
 * A fileref or an infile that reads from a pipe, which is an OS command with a
 * file's clothes on.
 *
 * `pipe` stands in the option position of a `filename` statement, or after the
 * quoted path of an `infile`. Requiring one of those positions is what keeps a
 * variable named `pipe`, and the fileref `pipe`, from being reported.
 */
const pipeFileref: Construct = {
  label: 'pipe',
  find: (code) => {
    const regex = /(?:^|;)[ \t]*(filename|infile)\b([^;]*)/gim
    const found: { index: number; length: number }[] = []
    let match

    while ((match = regex.exec(code))) {
      const keyword = match[1].toLowerCase()
      const to = match.index + match[0].length
      const tokens = getTokens(code, to - match[2].length, to)

      if (keyword === 'filename') {
        // The first token is the fileref being assigned, so `filename pipe;`
        // deassigns that fileref rather than opening a pipe.
        const pipe = tokens
          .slice(1)
          .find((token) => token.value.toLowerCase() === 'pipe')

        if (pipe) found.push({ index: pipe.index, length: pipe.value.length })
        continue
      }

      // `infile "path" pipe;` - the pipe follows the path it reads, which a
      // macro-driven job may hold in a variable (`infile &cmd pipe;`).
      const path = tokens.findIndex(
        (token) => /["']$/.test(token.value) || /^[&%]/.test(token.value)
      )

      if (path === -1) continue

      const pipe = tokens
        .slice(path + 1)
        .find((token) => token.value.toLowerCase() === 'pipe')

      if (pipe) found.push({ index: pipe.index, length: pipe.value.length })
    }

    return found
  }
}

const constructs: Construct[] = [
  xStatement,
  callSystem,
  sysExec,
  sysFuncSystem,
  systemFunction,
  sysTaskCommand,
  optionsXcmd,
  pipeFileref
]

/**
 * Drops a finding that sits inside another, so one construct yields one
 * diagnostic: `call system(...)` and `%sysfunc(system(...))` both contain a
 * `system(` call, and reporting the inner one as well would triple the noise.
 */
const removeNested = <T extends { index: number; length: number }>(
  findings: T[]
) => {
  const kept: { index: number; length: number }[] = []

  return findings
    .sort((a, b) => a.index - b.index || b.length - a.length)
    .filter((finding) => {
      const end = finding.index + finding.length

      if (
        kept.some(
          (span) =>
            finding.index >= span.index && end <= span.index + span.length
        )
      )
        return false

      kept.push(finding)

      return true
    })
}

const test = (value: string, config?: LintConfig): Diagnostic[] => {
  if (!value) return []

  const severity = getSeverity(config, name, Severity.Warning)
  // Data first, then code: see blankDatalines for why the order is this way.
  const { code, statementStarts } = maskNonCode(blankDatalines(value))

  const findings: (Finding & { label: string })[] = []

  constructs.forEach((construct) => {
    construct
      .find(code, statementStarts)
      .forEach((found) => findings.push({ ...found, label: construct.label }))
  })

  return removeNested(findings)
    .sort((a, b) => a.index - b.index || a.length - b.length)
    .map((finding) => {
      const { lineNumber, columnNumber } = getPosition(code, finding.index)

      // A construct wrapped over two lines is reported on the line it starts
      // on, so its span stops at that line's end rather than running past it.
      const lineEnd = code.indexOf('\n', finding.index)
      const spanEnd =
        lineEnd === -1 || lineEnd >= finding.index + finding.length
          ? finding.index + finding.length - 1
          : lineEnd - 1

      // On a CRLF file the last character of the line is the `\r`, which is not
      // part of the construct.
      const trimmedEnd = code[spanEnd] === '\r' ? spanEnd - 1 : spanEnd

      return {
        message: `${message}: ${finding.label}`,
        lineNumber,
        startColumnNumber: columnNumber,
        endColumnNumber: getPosition(code, trimmedEnd).columnNumber,
        severity
      }
    })
}

/**
 * Lint rule that reports the statements and functions that need XCMD, so a
 * program that shells out is found when it is linted rather than when it runs on
 * a server where XCMD is off.
 */
export const noXcmd: FileLintRule = {
  type: LintRuleType.File,
  name,
  description,
  message,
  test
}
