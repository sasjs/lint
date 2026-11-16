import { LintConfig } from '../types'
import { headerLayout } from './headerLayout'

const config = (json: any = {}) => new LintConfig(json)

const header = (body: string) => `/**\n${body}**/\ndata _null_;\nrun;\n`

describe('headerLayout', () => {
  it('indents the header body, which the printer leaves at column 0', () => {
    const text = header(
      `@file a.sas\n@brief does a thing\n\n<h4> SAS Macros </h4>\n`
    )

    expect(headerLayout(text, config())).toEqual(
      header(
        `  @file a.sas\n  @brief does a thing\n\n  <h4> SAS Macros </h4>\n`
      )
    )
  })

  it('puts the closing marker back at column 0, since the printer leaves it one space in', () => {
    const text = `/**\n@file a.sas\n **/\ndata _null_;\nrun;\n`

    expect(headerLayout(text, config())).toEqual(
      `/**\n  @file a.sas\n**/\ndata _null_;\nrun;\n`
    )
  })

  it('follows indentationMultiple rather than assuming two spaces', () => {
    const text = header(`@file a.sas\n`)

    expect(headerLayout(text, config({ indentationMultiple: 4 }))).toEqual(
      header(`    @file a.sas\n`)
    )
  })

  it('leaves blank lines blank, rather than filling them with spaces', () => {
    const text = header(`@file a.sas\n\n@brief b\n`)

    expect(headerLayout(text, config())).toEqual(
      header(`  @file a.sas\n\n  @brief b\n`)
    )
  })

  it('indents a body that sits at the margin, and leaves a correct one alone', () => {
    // The printer keeps a comment's interior indentation now, so a body already
    // at the unit is the template's shape and must come back byte for byte - the
    // pass only moves a body that is closer to the margin than the unit asks
    // for.
    const flush = header(`@file a.sas\n@brief b\n`)
    expect(headerLayout(flush, config())).toEqual(
      header(`  @file a.sas\n  @brief b\n`)
    )

    const correct = header(`  @file a.sas\n  @brief b\n`)
    expect(headerLayout(correct, config())).toEqual(correct)
  })

  it('keeps the relative indentation of a heading, a hanging continuation and a code body', () => {
    // This is the damage the pass used to do: indenting every line by the unit
    // flattens the body, and a code sample that loses its extra indent stops
    // being a code sample to a doxygen reader.
    const text = header(
      `@file a.sas\n@param [in] x described over\n    a hanging continuation\n\n<h4> SAS Macros </h4>\n@li mf_a.sas\n\n@example\n    %let x = 1;\n      proc sql; quit;\n@version 1\n`
    )

    expect(headerLayout(text, config())).toEqual(
      header(
        `  @file a.sas\n  @param [in] x described over\n      a hanging continuation\n\n  <h4> SAS Macros </h4>\n  @li mf_a.sas\n\n  @example\n      %let x = 1;\n        proc sql; quit;\n  @version 1\n`
      )
    )
  })

  it('trims trailing whitespace from body lines without changing their relative indentation', () => {
    const text = `/**\r\n@file a.sas  \r\n    continuation\t \r\n**/\r\ndata _null_;  \r\n`
    const expected = `/**\r\n  @file a.sas\r\n      continuation\r\n**/\r\ndata _null_;  \r\n`

    expect(headerLayout(text, config())).toEqual(expected)
    expect(headerLayout(expected, config())).toEqual(expected)
  })

  it('keeps the relative indentation of a body that is already indented', () => {
    const text = header(`  @file a.sas\n  @param [in] x\n      continued\n`)

    expect(headerLayout(text, config())).toEqual(text)
  })

  it('does not shift a correct body because one line is outdented', () => {
    // A doxygen blockquote marker is written at the margin inside an indented
    // body. Reading the body's *smallest* indent as its margin would see that
    // line, add the unit to everything, and move a header that was already
    // correct - which is how a `>` line in a core macro header first showed up.
    const text = header(
      `  @details a description\n\n> ERROR 22-322: Expecting a name.\n\n  @param [in] x\n`
    )

    expect(headerLayout(text, config())).toEqual(text)

    // Flattened, the same body moves as a block: the blockquote keeps its offset
    // from the body rather than being re-indented on its own.
    const flattened = header(
      `@details a description\n\n> ERROR 22-322: Expecting a name.\n\n@param [in] x\n`
    )

    expect(headerLayout(flattened, config())).toEqual(
      header(
        `  @details a description\n\n  > ERROR 22-322: Expecting a name.\n\n  @param [in] x\n`
      )
    )
  })

  it('keeps a star that is punctuation rather than a marker', () => {
    // A body in the template's shape can still contain a `*` bullet, or the
    // opening star of an emphasis. Reading the star style from one line at a
    // time deleted it, which changed what the header said.
    const text = header(
      `  @details notes:\n\n  * first bullet\n  * second bullet\n\n  @param [in] x a *libref* is created\n`
    )

    expect(headerLayout(text, config())).toEqual(text)

    // The body's own first line can be the bullet, which is why the style comes
    // from the tag line rather than from the line the body opens with.
    const leadingBullet = header(
      `  *libref* is created here\n  @param [in] x\n`
    )

    expect(headerLayout(leadingBullet, config())).toEqual(leadingBullet)
  })

  it('handles a header with no body at all', () => {
    // Nothing to measure an indent from, and the closer still goes back to the
    // margin: the empty-body branch is the one a reviewer asks about.
    const text = `/**\n **/\ndata _null_;\nrun;\n`

    expect(headerLayout(text, config())).toEqual(
      `/**\n**/\ndata _null_;\nrun;\n`
    )
  })

  it('converts a starred body whose continuation carries no star', () => {
    // The style is read from how the body opens, not from every line agreeing:
    // one unstarred continuation used to leave the whole body starred, and a
    // starred `@li` is not an entry the macros rule reads, so the list was
    // appended again on every pass.
    const text = `/**\n * @file a.sas\n   a continuation without a star\n * @li mf_a.sas\n */\ndata _null_;\nrun;\n`

    expect(headerLayout(text, config())).toEqual(
      `/**\n  @file a.sas\n    a continuation without a star\n  @li mf_a.sas\n**/\ndata _null_;\nrun;\n`
    )
  })

  it('strips the marker from every line of a starred body, sample included', () => {
    // A star-style body marks every line, so a code sample carries the marker as
    // well. Leaving it in place kept the star in the body and pushed the sample
    // two columns further from the tag it belongs under.
    const text = `/**\n * @details Notes:\n *   proc sql;\n *     select 1;\n **/\ndata _null_;\nrun;\n`

    expect(headerLayout(text, config())).toEqual(
      `/**\n  @details Notes:\n    proc sql;\n      select 1;\n**/\ndata _null_;\nrun;\n`
    )
  })

  it('leaves a bullet list beside a starred entry alone', () => {
    // The markers are stripped where they precede a tag and nowhere else: a
    // bullet three lines down is punctuation, and the entry beside it has to
    // stop being starred or the macros rule cannot read it.
    const text = header(
      `  @file a.sas\n  * @li mf_a.sas\n  @details notes:\n\n  * first bullet\n`
    )

    expect(headerLayout(text, config())).toEqual(
      header(
        `  @file a.sas\n  @li mf_a.sas\n  @details notes:\n\n  * first bullet\n`
      )
    )
  })

  it('converts markers written at more than one column in a single pass', () => {
    // A header can carry its markers at two columns. Taking the column from one
    // line left the others starred, and a starred `@li` is not an entry the
    // macros rule reads - so the rule appended what it could not see, and only
    // the next pass stripped the star.
    const text = `/**\n * @file a.sas\n  * @li mf_a.sas\n */\ndata _null_;\nrun;\n`

    const once = headerLayout(text, config())

    // Each tag keeps the column it was written at: the block is moved by the
    // first tag, so a marker written a column further in stays a column in.
    expect(once).toEqual(
      `/**\n  @file a.sas\n   @li mf_a.sas\n**/\ndata _null_;\nrun;\n`
    )
    expect(headerLayout(once, config())).toEqual(once)
  })

  it('puts the tags at the unit when the starred body opens with prose', () => {
    // The body's first line is not a tag, so it cannot decide the margin: the
    // tags land on the unit and the prose keeps its offset from them.
    const text = `/**\n   prose line\n * @file a.sas\n */\ndata _null_;\nrun;\n`

    const once = headerLayout(text, config())

    expect(once).toEqual(
      `/**\n    prose line\n  @file a.sas\n**/\ndata _null_;\nrun;\n`
    )
    expect(headerLayout(once, config())).toEqual(once)
  })

  it('preserves an unmarked emphasis beside starred tags', () => {
    const text = `/**\n  *libref* is created here\n * @file a.sas\n */\ndata _null_;\nrun;\n`
    expect(headerLayout(text, config())).toEqual(
      `/**\n   *libref* is created here\n  @file a.sas\n**/\ndata _null_;\nrun;\n`
    )
  })

  it('converts doubled tag markers before the macros rule reads them', () => {
    const text = `/**\n ** @file a.sas\n ** @li mf_a.sas\n **/\ndata _null_;\nrun;\n`
    const once = headerLayout(text, config())
    expect(once).toEqual(
      `/**\n  @file a.sas\n  @li mf_a.sas\n**/\ndata _null_;\nrun;\n`
    )
    expect(headerLayout(once, config())).toEqual(once)
  })

  it('converts a consistently starred prose-only header', () => {
    const text = `/**\n * just a prose header\n * second line\n */\ndata _null_;\nrun;\n`
    const once = headerLayout(text, config())
    expect(once).toEqual(
      `/**\n  just a prose header\n  second line\n**/\ndata _null_;\nrun;\n`
    )
    expect(headerLayout(once, config())).toEqual(once)
  })

  it('converts tagless marked prose with an indented unmarked continuation', () => {
    const text = `/**\n * prose one\n   continued\n * prose two\n   * a nested bullet\n */\ndata _null_;\nrun;\n`
    const once = headerLayout(text, config())
    expect(once).toEqual(
      `/**\n  prose one\n    continued\n  prose two\n    * a nested bullet\n**/\ndata _null_;\nrun;\n`
    )
    expect(headerLayout(once, config())).toEqual(once)

    const single = `/**\n * prose one\n   continued\n */\ndata _null_;\nrun;\n`
    const singleOnce = headerLayout(single, config())
    expect(singleOnce).toEqual(
      `/**\n  prose one\n    continued\n**/\ndata _null_;\nrun;\n`
    )
    expect(headerLayout(singleOnce, config())).toEqual(singleOnce)
  })

  it('preserves an outdented unmarked line rather than guessing a marker style', () => {
    const text = header(` * prose\nunmarked at margin\n`)
    const once = headerLayout(text, config())
    expect(once).toEqual(header(`  * prose\n unmarked at margin\n`))
    expect(headerLayout(once, config())).toEqual(once)
  })

  it('accepts a tab after a tagless marker before the margin', () => {
    const text = header(`*\tprose one\n*\tprose two\n`)
    const once = headerLayout(text, config())
    expect(once).toEqual(header(`  prose one\n  prose two\n`))
    expect(headerLayout(once, config())).toEqual(once)
  })

  it('keeps tab-indented tagless bullets at the template margin', () => {
    const text = header(`\t*\tfirst bullet\n\t*\tsecond bullet\n`)
    expect(headerLayout(text, config())).toEqual(text)
  })

  it('keeps tagless bullet lists written at the template margin', () => {
    const text = header(`  * first bullet\n  * second bullet\n`)
    expect(headerLayout(text, config())).toEqual(text)
  })

  it('measures a body that carries no tag from its first line', () => {
    // Nothing to prefer over the opening line when there is no tag: a prose-only
    // header is laid out from what it opens with, which here is already the unit.
    const text = header(`  a header with no doxygen tags\n`)

    expect(headerLayout(text, config())).toEqual(text)
  })

  it('keeps every tag at or beyond the unit when a later tag is outdented', () => {
    const text = `/**\n  * @file a.sas\n * @li mf_a.sas\n */\ndata _null_;\nrun;\n`
    const once = headerLayout(text, config())
    expect(once).toEqual(
      `/**\n   @file a.sas\n  @li mf_a.sas\n**/\ndata _null_;\nrun;\n`
    )
    expect(headerLayout(once, config())).toEqual(once)
  })

  it('counts a tab as one unit rather than one column when it measures the body', () => {
    // Measured in characters, a tab-indented body read as narrower than the
    // unit and the shift padded a space in front of the tab, so the header sat
    // at neither indentationMultiple nor the author's indentation.
    const text = `/**\n\t@file a.sas\n\t@brief b\n**/\ndata _null_;\nrun;\n`

    expect(headerLayout(text, config())).toEqual(text)
  })

  it('converts the star style to the template shape, stars and closer included', () => {
    // Keeping the stars was tried first and is wrong: the rules that read the macros
    // list do not recognise a starred `@li`, so each pass appended another copy.
    const text = `/**\n * @file a.sas\n * @brief b\n *\n *\/\ndata _null_;\nrun;\n`

    expect(headerLayout(text, config())).toEqual(
      `/**\n  @file a.sas\n  @brief b\n\n**/\ndata _null_;\nrun;\n`
    )
  })

  it('returns empty text unchanged', () => {
    expect(headerLayout('', config())).toEqual('')
  })

  it('treats indentationMultiple 0 as the default unit, like every sibling pass', () => {
    const text = header(`@file a.sas\n`)

    expect(headerLayout(text, config({ indentationMultiple: 0 }))).toEqual(
      header(`  @file a.sas\n`)
    )
  })

  it('leaves an ordinary block comment alone, which is not a doxygen header', () => {
    // getHeaderLinesCount accepts any `/*`, so without this check a build banner
    // would be re-indented and have its ` */` rewritten to `**/`.
    const banner = `/* generated by the build - do not edit */\ndata _null_;\nrun;\n`
    const block = `/*\n * build artifact\n */\ndata _null_;\nrun;\n`

    expect(headerLayout(banner, config())).toEqual(banner)
    expect(headerLayout(block, config())).toEqual(block)
  })

  it('leaves a file with no header untouched', () => {
    const text = `data _null_;\n  x = 1;\nrun;\n`

    expect(headerLayout(text, config())).toEqual(text)
  })

  it('is idempotent, which the caller relies on', () => {
    const text = header(
      `@file a.sas\n@brief a long description that the wrap will break up later\n\n@example\n%let x = 1;\n@version 1\n`
    )

    const once = headerLayout(text, config())

    expect(headerLayout(once, config())).toEqual(once)
  })

  it('does not touch anything after the header', () => {
    const text = `/**\n@file a.sas\n**/\n\n  /* an indented body comment */\ndata _null_;\nrun;\n`

    expect(headerLayout(text, config())).toEqual(
      `/**\n  @file a.sas\n**/\n\n  /* an indented body comment */\ndata _null_;\nrun;\n`
    )
  })
})
