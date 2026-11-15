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

  it('indents a code body by the unit, and does not reflow it', () => {
    // The printer has already flattened the body's inner indentation, so the
    // unit indent is the most this pass can honour.
    const text = header(
      `@example\n  %let x = 1;\n    proc sql; quit;\n@version 1\n`
    )

    expect(headerLayout(text, config())).toEqual(
      header(`  @example\n  %let x = 1;\n  proc sql; quit;\n  @version 1\n`)
    )
  })

  it('returns empty text unchanged', () => {
    expect(headerLayout('', config())).toEqual('')
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
