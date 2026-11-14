import { LintConfig } from '../types'
import { LineEndings } from '../types/LineEndings'
import {
  checkIsDataLine,
  getDataSectionsDetail
} from '../utils/getDataSectionsDetail'
import { getHeaderLinesCount } from '../utils/getHeaderLinesCount'
import { cleanState, indentationMultipleOf, scanLine } from './longLines'
import { splitWithTerminators } from './rewrapText'

/**
 * A line of a block comment, split into the parts a reflow moves around.
 *
 * `lead` is everything before the text - the line's indentation, plus the
 * opening marker on the line that carries it. `trail` is everything after the
 * text - the whitespace before a closing marker, the marker, and whatever
 * follows it. `lead + content + trail` is the line as written, so a paragraph
 * the pass does not reflow keeps its bytes.
 */
interface CommentLine {
  raw: string
  lead: string
  content: string
  trail: string
  /** The width of the line's leading whitespace. */
  indent: number
}

/**
 * What begins a new paragraph: any Doxygen tag - so `@param y` never joins the
 * `@param x` above it - an HTML heading, a list marker, a table row and a macro
 * trigger.
 *
 * A run of spaces is not in this list: two spaces after a full stop is ordinary
 * prose, and treating it as structure would leave every sentence-spaced
 * paragraph wrapped one line at a time. A reflow therefore normalises the runs
 * inside the paragraph it rewrites.
 */
const startsParagraph = /^(?:@|<|[-*+]\s|\d+[.)]\s|\||#|%|`)/i

/**
 * What is not prose at all, and so is never reflowed even when it is a
 * paragraph of its own: an `@li` entry - whose continuation line would end the
 * list the header readers parse - a `@sasjslint` object, a heading, a list
 * item, a table row, and a macro trigger.
 */
const lineOriented = /^(?:@li\b|@sasjslint\b|<|[-*+]\s|\d+[.)]\s|\||#|%|`)/i

/** A tag whose body is code rather than prose. */
const codeTag = /@(?:example|code|verbatim)\b/i

/** The heading whose `@li` entries other rules read and rewrite. */
const macrosHeading = /<h4>\s*SAS Macros\s*<\/h4>/i

/** The width of a line's leading whitespace. */
const indentOf = (text: string): number => /^\s*/.exec(text)![0].length

/**
 * Wraps one paragraph's words into lines that fit, or returns `null` when a
 * word is longer than the room its line has - there is no break inside a word,
 * so the paragraph is left as the author wrote it.
 */
const wrapWords = (
  content: string,
  limit: number,
  lead: string,
  continuationIndent: string,
  trail: string
): string[] | null => {
  const words = content.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = lead
  let empty = true

  for (const word of words) {
    const candidate = empty ? lead + word : line + ' ' + word

    if (empty || candidate.length <= limit) {
      line = candidate
      empty = false
      continue
    }

    lines.push(line)
    line = continuationIndent + word
  }

  lines.push(line)
  lines[lines.length - 1] += trail

  return lines.every((wrapped) => wrapped.length <= limit) ? lines : null
}

/** The line indices a block comment covers. */
interface Block {
  open: number
  close: number
}

/**
 * Collects the block comments of a file that occupy whole lines, so that a
 * comment sharing a line with code - which a reflow would have to move the code
 * around - is left alone.
 *
 * A block opens on a line with nothing but whitespace before its marker, closes
 * on a line with nothing but whitespace after the closing marker, and covers no
 * line that carries code. Text inside a `datalines` record is data rather than
 * SAS, so a marker there is data and never opens a block.
 *
 * @param {string[]} lines - the file's lines.
 * @param {LintConfig} configuration - the configuration in force.
 * @returns {Block[]} the blocks a reflow may edit.
 */
const collectBlocks = (lines: string[], configuration: LintConfig): Block[] => {
  const blocks: Block[] = []
  const dataSections = getDataSectionsDetail(lines.join('\n'), configuration)
  let state = cleanState()
  let index = 0

  while (index < lines.length) {
    const scanned = scanLine(lines[index], state)
    state = scanned.endState

    const span = scanned.comments[0]
    const opensHere =
      !!span &&
      scanned.comments.length === 1 &&
      !checkIsDataLine(dataSections, index) &&
      lines[index].slice(0, span.start).trim() === ''

    if (!opensHere) {
      index++
      continue
    }

    if (span.end < lines[index].length) {
      if (lines[index].slice(span.end + 2).trim() === '') {
        blocks.push({ open: index, close: index })
      }
      index++
      continue
    }

    // The comment continues: walk forward to the line carrying its closer. A
    // block that runs to the end of the file has no closer to re-emit, and one
    // that covers a line of code cannot be edited without moving that code, so
    // both are left to their author.
    let close = index
    let closed = false
    let usable = true

    while (usable && !closed && close < lines.length - 1) {
      close++
      const next = scanLine(lines[close], state)
      state = next.endState

      if (checkIsDataLine(dataSections, close) || next.code.trim() !== '') {
        usable = false
        break
      }

      const closing = next.comments[0]
      if (closing && closing.end < lines[close].length) {
        closed = true
        usable = lines[close].slice(closing.end + 2).trim() === ''
      }
    }

    if (usable && closed) blocks.push({ open: index, close })

    index = close + 1
  }

  return blocks
}

/**
 * Splits a block into its lines, and works out the indentation its continuation
 * lines use - which is where a reflow puts the text it does not fit on the
 * first line.
 *
 * The opener is a special case in both directions: it carries the marker, so
 * its text starts after `/* `, and a comment written as `/* text` on one line
 * with its body indented below it is one paragraph, not two.
 */
const readBlock = (
  lines: string[],
  block: Block,
  multiple: number
): { read: CommentLine[]; contentIndent: number } => {
  const openLine = lines[block.open]
  const marker = openLine.indexOf('/*')
  // `/**` is one marker, so the second asterisk belongs to the lead.
  const afterMarker = marker + 2 + (openLine[marker + 2] === '*' ? 1 : 0)
  const openRest = openLine.slice(afterMarker)
  const openLead = afterMarker + indentOf(openRest)
  const closer = block.open === block.close ? openLine.indexOf('*/') : -1
  const openBody = openLine.slice(openLead, closer > -1 ? closer : undefined)
  const openContent = openBody.trimEnd()

  const read: CommentLine[] = [
    {
      raw: openLine,
      lead: openLine.slice(0, openLead),
      content: openContent,
      trail:
        openBody.slice(openContent.length) +
        (closer > -1 ? openLine.slice(closer) : ''),
      indent: indentOf(openLine)
    }
  ]

  for (let index = block.open + 1; index <= block.close; index++) {
    const line = lines[index]
    const lead = /^\s*/.exec(line)![0]
    const close = index === block.close ? line.indexOf('*/') : -1
    const body = line.slice(lead.length, close > -1 ? close : undefined)
    const content = body.trimEnd()

    read.push({
      raw: line,
      lead,
      content,
      trail: body.slice(content.length) + (close > -1 ? line.slice(close) : ''),
      indent: lead.length
    })
  }

  // The opener shares its paragraph with the line below it, when that line
  // carries text: that is the indentation its continuation takes. When the line
  // below is blank the opener stands alone, and its continuation is one
  // `indentationMultiple` in from the marker.
  const below = read[1]
  const contentIndent =
    below !== undefined && below.content !== ''
      ? below.indent
      : indentOf(openLine) + (multiple - (indentOf(openLine) % multiple))

  return { read, contentIndent }
}

/**
 * Reflows the prose inside a file's block comments so that no line exceeds the
 * limit that applies to it, and leaves every other line byte-identical.
 *
 * A paragraph is a run of comment lines at one indentation that carry prose. It
 * breaks at a blank line and before anything line-oriented: an `@li` entry, a
 * `@sasjslint` tag, an HTML heading, a list marker, a table row or a macro
 * trigger. Wrapping one of those - or wrapping one line of a paragraph without
 * reflowing the rest - is what leaves a header ragged. A `@brief` or `@param`
 * line is prose, so it carries the lines that follow it.
 *
 * Blocks that are left entirely alone: one sharing a line with code, one inside
 * a `datalines` record, one holding a `@example` / `@code` / `@verbatim` body,
 * the `<h4> SAS Macros </h4>` section - whose entries other rules read and
 * rewrite - and any block holding a `@sasjslint` tag, whose object has to stay
 * on the line the tag opens.
 *
 * A paragraph is reflowed only when every line of the result fits, so the pass
 * never raises the diagnostic count: a word longer than the limit - a URL,
 * usually - leaves its paragraph as the author wrote it.
 *
 * @param {string} text - the text to reflow.
 * @param {LintConfig} configuration - the configuration in force, header
 *   override included.
 * @returns {string} the reflowed text.
 */
export const reflowComments = (
  text: string,
  configuration: LintConfig
): string => {
  if (!text) return text

  if (
    !configuration.lineLintRules.some((rule) => rule.name === 'maxLineLength')
  )
    return text

  const entries = splitWithTerminators(text)
  const lines = entries.map((entry) => entry.line)
  const headerLinesCount = getHeaderLinesCount(text, configuration)
  const multiple = indentationMultipleOf(configuration)
  const headerLimit = Math.max(
    configuration.maxLineLength,
    configuration.maxHeaderLineLength
  )
  const defaultEnding =
    configuration.lineEndings === LineEndings.CRLF ? '\r\n' : '\n'
  const output: string[] = []
  let cursor = 0

  const emitTo = (index: number) => {
    while (cursor < index && cursor < lines.length) {
      output.push(lines[cursor] + entries[cursor].ending)
      cursor++
    }
  }

  for (const block of collectBlocks(lines, configuration)) {
    const { read, contentIndent } = readBlock(lines, block, multiple)
    const limit =
      block.open < headerLinesCount ? headerLimit : configuration.maxLineLength
    const blockText = read.map((line) => line.raw).join('\n')

    const refused =
      macrosHeading.test(blockText) ||
      codeTag.test(blockText) ||
      read.some((line) => /@sasjslint\b/.test(line.content))

    if (refused) continue

    emitTo(block.open)

    const emitted: string[] = []
    let paragraph: CommentLine[] = []
    let paragraphIndent = -1

    const flush = () => {
      if (!paragraph.length) return

      const last = paragraph[paragraph.length - 1]
      const overlong =
        !lineOriented.test(paragraph[0].content) &&
        paragraph.some(
          (line) =>
            line.lead.length + line.content.length + line.trail.length > limit
        )
      const content = paragraph.map((line) => line.content).join(' ')
      const wrapped = overlong
        ? wrapWords(
            content,
            limit,
            paragraph[0].lead,
            ' '.repeat(paragraphIndent),
            last.trail
          )
        : null

      if (wrapped) emitted.push(...wrapped)
      else emitted.push(...paragraph.map((line) => line.raw))

      paragraph = []
      paragraphIndent = -1
    }

    read.forEach((line, index) => {
      if (line.content === '') {
        flush()
        emitted.push(line.raw)
        return
      }

      if (paragraph.length) {
        const continues =
          index > 0 &&
          line.indent === paragraphIndent &&
          !startsParagraph.test(line.content)

        if (!continues) flush()
      }

      if (!paragraph.length)
        paragraphIndent = index === 0 ? contentIndent : line.indent

      paragraph.push(line)
    })

    flush()

    // Lines inserted inside the block take the block's own final terminator, so
    // a CRLF file keeps CRLF even with `lineEndings` off.
    const blockEnding = entries[block.close].ending || defaultEnding

    emitted.forEach((line, index) => {
      const ending =
        index === emitted.length - 1 ? entries[block.close].ending : blockEnding
      output.push(line + ending)
    })

    cursor = block.close + 1
  }

  emitTo(lines.length)

  const result = output.join('')

  return result === text ? text : result
}
