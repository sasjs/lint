import { LintConfig } from '../types'
import { LineEndings } from '../types/LineEndings'
import {
  addMacrosToHeader,
  getHeaderMacros,
  removeMacrosFromHeader,
  repairHeaderList
} from './headerMacros'

describe('getHeaderMacros', () => {
  it('should return the macros declared in the SAS Macros section', () => {
    const text = `/**
  @file
  @brief test
  <h4> SAS Macros </h4>
  @li mf_trim.sas
  @li mf_left.sas

  <h4> Other Macros </h4>
  @li my_custom.sas

  @version 9.4
**/
%mf_trim()`

    expect(getHeaderMacros(text, new LintConfig())).toEqual([
      {
        name: 'mf_trim',
        lineNumber: 5,
        startColumnNumber: 7,
        endColumnNumber: 14
      },
      {
        name: 'mf_left',
        lineNumber: 6,
        startColumnNumber: 7,
        endColumnNumber: 14
      }
    ])
  })

  it('should not read a section that is not the compile dependency list', () => {
    const text = `/**
  @file
  <h4> Other Macros </h4>
  @li my_custom.sas

  <h4> SAS Programs </h4>
  @li load_dim.sas - loads the dimension

  <h4> SAS Macros </h4>
  @li mf_trim.sas
**/`

    // `sasjs compile` reads `<h4> SAS Macros </h4>` only, so that is the only
    // list this reader reports. `Other Macros` is not a SASjs header section.
    expect(getHeaderMacros(text, new LintConfig()).map((m) => m.name)).toEqual([
      'mf_trim'
    ])
  })

  it('should stop the list at the first non @li line', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_trim.sas
  <h4> Related Macros </h4>
  @li mp_gitadd.sas
**/`

    expect(getHeaderMacros(text, new LintConfig()).map((m) => m.name)).toEqual([
      'mf_trim'
    ])
  })

  it('should read a mistyped tag as an entry, and the entries below it', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_trim.sas
  @il mf_left.sas
  @li mf_right.sas
**/`

    // `@il` is a typo, not the end of the list: the declarations it and the
    // lines below it carry are still this file's dependencies, and reporting
    // them as undeclared would send the author looking in the wrong place.
    expect(getHeaderMacros(text, new LintConfig()).map((m) => m.name)).toEqual([
      'mf_trim',
      'mf_left',
      'mf_right'
    ])
  })

  it('should report the column of a mistyped entry at its name', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @il mf_left.sas
**/`

    const [macro] = getHeaderMacros(text, new LintConfig())

    expect([macro.startColumnNumber, macro.endColumnNumber]).toEqual([7, 14])
  })

  it('should not read an entry that carries writing after it', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_left.sas - trims the left
**/`

    // The entry is the tag and one file token; anything after it is not part
    // of the format, so the line declares nothing and the section stays as its
    // author wrote it rather than having the line rewritten or removed.
    expect(getHeaderMacros(text, new LintConfig())).toEqual([])
  })

  it('should not read an unrelated tag as an entry', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_trim.sas
  @example demo.sas
**/`

    // `@example` is not a mistyped `@li`, so it must not become a declaration
    // of `demo` - that would invent a dependency on a file that does not exist
    // and have the formatter write an `@li` entry for it.
    const names = getHeaderMacros(text, new LintConfig()).map((m) => m.name)

    expect(names).toEqual(['mf_trim'])
  })

  it('should not read an entry carrying other words', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @il see the notes below
**/`

    expect(getHeaderMacros(text, new LintConfig())).toEqual([])
  })

  it('should end the list at a tag that is not an entry', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_trim.sas
  @example mf_trim(work.a)
  @li mf_later.sas
**/`

    // `@example` is another tag, not a mistyped entry: the list ends there, so
    // the entries above it stay readable and rewritable, and the line below
    // the other tag is not swallowed into this section.
    expect(getHeaderMacros(text, new LintConfig()).map((m) => m.name)).toEqual([
      'mf_trim'
    ])
  })

  it('should drop a path and the file extension from an entry', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li sasjs/mf_trim.sas
**/`

    expect(getHeaderMacros(text, new LintConfig()).map((m) => m.name)).toEqual([
      'mf_trim'
    ])
  })

  it('should return an empty array when there is no header', () => {
    expect(getHeaderMacros(`%mf_trim()`, new LintConfig())).toEqual([])
  })

  it('should return an empty array when there is no text', () => {
    expect(getHeaderMacros('', new LintConfig())).toEqual([])
  })

  it('should fall back to the default configuration', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_trim.sas
**/`

    expect(getHeaderMacros(text).map((m) => m.name)).toEqual(['mf_trim'])
  })

  it('should ignore an entry that carries no macro name', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li .sas
**/`

    expect(getHeaderMacros(text, new LintConfig())).toEqual([])
  })

  it('should locate a name that also appears inside the @li tag', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li li.sas
**/`

    expect(getHeaderMacros(text, new LintConfig())).toEqual([
      {
        name: 'li',
        lineNumber: 4,
        startColumnNumber: 7,
        endColumnNumber: 9
      }
    ])
  })

  it('should read a list broken up by a blank line', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_a.sas

  @li mf_b.sas

**/`

    expect(getHeaderMacros(text, new LintConfig()).map((m) => m.name)).toEqual([
      'mf_a',
      'mf_b'
    ])
  })

  it('should read an entry that shares the section tag line', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4> @li mf_a.sas
**/`

    expect(getHeaderMacros(text, new LintConfig()).map((m) => m.name)).toEqual([
      'mf_a'
    ])
  })
})

describe('addMacrosToHeader', () => {
  it('should merge new macros with the existing entries and sort them', () => {
    const text = `/**
  @file
  @brief test
  <h4> SAS Macros </h4>
  @li mf_trim.sas

  @version 9.4
**/
%mf_trim()
%mf_left()
%mf_append()`

    const expected = `/**
  @file
  @brief test

  <h4> SAS Macros </h4>
  @li mf_append.sas
  @li mf_left.sas
  @li mf_trim.sas

  @version 9.4
**/
%mf_trim()
%mf_left()
%mf_append()`

    expect(
      addMacrosToHeader(text, new LintConfig(), ['mf_left', 'mf_append'])
    ).toEqual(expected)
  })

  it('should add a SAS Macros section when the header has none', () => {
    const text = `/**
  @file
  @brief test
**/
%mf_trim()`

    const expected = `/**
  @file
  @brief test

  <h4> SAS Macros </h4>
  @li mf_trim.sas

**/
%mf_trim()`

    expect(addMacrosToHeader(text, new LintConfig(), ['mf_trim'])).toEqual(
      expected
    )
  })

  it('should not duplicate a macro that is already listed', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_trim.sas
**/
%mf_trim()`

    const expected = `/**
  @file

  <h4> SAS Macros </h4>
  @li mf_trim.sas

**/
%mf_trim()`

    expect(addMacrosToHeader(text, new LintConfig(), ['mf_trim'])).toEqual(
      expected
    )
  })

  it('should return the text unchanged when there is no header', () => {
    const text = `%mf_trim()`

    expect(addMacrosToHeader(text, new LintConfig(), ['mf_trim'])).toEqual(text)
  })

  it('should return the text unchanged when there is no text', () => {
    expect(addMacrosToHeader('', new LintConfig(), ['mf_trim'])).toEqual('')
  })

  it('should return the text unchanged when there are no macros to add', () => {
    const text = `/**
  @file
**/`

    expect(addMacrosToHeader(text, new LintConfig(), [])).toEqual(text)
  })

  it('should leave a single-line header without a SAS Macros section alone', () => {
    const text = `/** @file **/`

    expect(addMacrosToHeader(text, new LintConfig(), ['mf_trim'])).toEqual(text)
  })

  it('should leave a single-line header with a SAS Macros section alone', () => {
    const text = `/** <h4> SAS Macros </h4> **/`

    expect(addMacrosToHeader(text, new LintConfig(), ['mf_trim'])).toEqual(text)
  })

  it('should fall back to a two space indent when the header content is not indented', () => {
    const text = `/**
@file
**/`

    const expected = `/**
@file

  <h4> SAS Macros </h4>
  @li mf_trim.sas

**/`

    expect(addMacrosToHeader(text, new LintConfig(), ['mf_trim'])).toEqual(
      expected
    )
  })

  it('should keep a single blank line before the section', () => {
    const text = `/**
  @file

**/`

    const expected = `/**
  @file

  <h4> SAS Macros </h4>
  @li mf_trim.sas

**/`

    expect(addMacrosToHeader(text, new LintConfig(), ['mf_trim'])).toEqual(
      expected
    )
  })

  it('should use CRLF line endings when configured', () => {
    const text = `/**\n  @file\n  <h4> SAS Macros </h4>\n**/`
    const config = new LintConfig({ lineEndings: LineEndings.CRLF })

    expect(addMacrosToHeader(text, config, ['mf_trim'])).toEqual(
      `/**\r\n  @file\r\n\r\n  <h4> SAS Macros </h4>\r\n  @li mf_trim.sas\r\n\r\n**/`
    )
  })

  it('should not duplicate an entry that sits below a blank line', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_a.sas

  @li mf_b.sas

**/`

    const expected = `/**
  @file

  <h4> SAS Macros </h4>
  @li mf_a.sas
  @li mf_b.sas

**/`

    expect(addMacrosToHeader(text, new LintConfig(), ['mf_b'])).toEqual(
      expected
    )
  })

  it('should leave a section whose tag line carries an entry alone', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4> @li mf_a.sas
**/
%mf_b()`

    expect(addMacrosToHeader(text, new LintConfig(), ['mf_b'])).toEqual(text)
  })

  it('should repair a mistyped tag and the indentation while adding', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_a.sas
  @il mf_typo.sas
      @li mf_indented.sas
**/
%mf_b()`

    const expected = `/**
  @file

  <h4> SAS Macros </h4>
  @li mf_a.sas
  @li mf_b.sas
  @li mf_indented.sas
  @li mf_typo.sas

**/
%mf_b()`

    expect(addMacrosToHeader(text, new LintConfig(), ['mf_b'])).toEqual(
      expected
    )
  })

  it('should leave a section alone when an entry carries writing after it', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_a.sas - trims a value
**/
%mf_b()`

    // The line is not an entry, and rewriting the section would replace the
    // span it sits in, so the header stays as its author wrote it.
    expect(addMacrosToHeader(text, new LintConfig(), ['mf_b'])).toEqual(text)
  })

  it('should add entries above another tag and leave that tag in place', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_a.sas
  @example demo.sas
**/
%mf_b()`

    const expected = `/**
  @file

  <h4> SAS Macros </h4>
  @li mf_a.sas
  @li mf_b.sas

  @example demo.sas
**/
%mf_b()`

    // `@example` ends the list but does not make the section unreadable, so
    // the missing macro is still added and the other tag is preserved.
    expect(addMacrosToHeader(text, new LintConfig(), ['mf_b'])).toEqual(
      expected
    )
  })

  it('should leave a section that carries an unreadable entry alone', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_a.sas
  @li
**/
%mf_b()`

    // The line cannot be repaired, and rewriting would replace the span it
    // sits in and delete it, so the section stays as its author wrote it.
    expect(addMacrosToHeader(text, new LintConfig(), ['mf_b'])).toEqual(text)
  })
})

describe('removeMacrosFromHeader', () => {
  it('should remove a listed macro and keep the others', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_used.sas
  @li mf_unused.sas

  @version 9.4
**/`

    const expected = `/**
  @file

  <h4> SAS Macros </h4>
  @li mf_used.sas

  @version 9.4
**/`

    expect(
      removeMacrosFromHeader(text, new LintConfig(), ['mf_unused'])
    ).toEqual(expected)
  })

  it('should keep the section header when every entry is removed', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_unused.sas
**/`

    const expected = `/**
  @file

  <h4> SAS Macros </h4>

**/`

    expect(
      removeMacrosFromHeader(text, new LintConfig(), ['mf_unused'])
    ).toEqual(expected)
  })

  it('should return the text unchanged when the macro is not listed', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_used.sas
**/`

    expect(
      removeMacrosFromHeader(text, new LintConfig(), ['mf_unused'])
    ).toEqual(text)
  })

  it('should return the text unchanged when there is no header', () => {
    const text = `%mf_used()`

    expect(removeMacrosFromHeader(text, new LintConfig(), ['mf_used'])).toEqual(
      text
    )
  })

  it('should return the text unchanged when there is no SAS Macros section', () => {
    const text = `/**
  @file
  <h4> Other Macros </h4>
  @li mf_unused.sas
**/`

    expect(
      removeMacrosFromHeader(text, new LintConfig(), ['mf_unused'])
    ).toEqual(text)
  })

  it('should return the text unchanged when there is no text', () => {
    expect(removeMacrosFromHeader('', new LintConfig(), ['mf_unused'])).toEqual(
      ''
    )
  })

  it('should return the text unchanged when there are no macros to remove', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_unused.sas
**/`

    expect(removeMacrosFromHeader(text, new LintConfig(), [])).toEqual(text)
  })

  it('should drop a duplicated entry when removing another', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_a.sas
  @li mf_a.sas
  @li mf_b.sas
**/`

    const expected = `/**
  @file

  <h4> SAS Macros </h4>
  @li mf_a.sas

**/`

    expect(removeMacrosFromHeader(text, new LintConfig(), ['mf_b'])).toEqual(
      expected
    )
  })

  it('should return the text unchanged when there are no macros to remove', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_unused.sas
**/`

    expect(removeMacrosFromHeader(text, new LintConfig(), [])).toEqual(text)
  })

  it('should leave a section that carries an unreadable entry alone', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_a.sas
  @li
**/
%mf_b()`

    expect(removeMacrosFromHeader(text, new LintConfig(), ['mf_a'])).toEqual(
      text
    )
  })
})

describe('repairHeaderList', () => {
  it('should rewrite a mistyped tag as @li', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_a.sas
  @il mf_typo.sas
**/
%mf_b()`

    const expected = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_a.sas
  @li mf_typo.sas
**/
%mf_b()`

    expect(repairHeaderList(text, new LintConfig())).toEqual(expected)
  })

  it('should repair the indentation of an entry in place', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
        @li mf_a.sas
**/
%mf_b()`

    const expected = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_a.sas
**/
%mf_b()`

    expect(repairHeaderList(text, new LintConfig())).toEqual(expected)
  })

  it('should change nothing when the entries are already canonical', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_a.sas
  @li mf_b.sas
**/
%mf_a()`

    expect(repairHeaderList(text, new LintConfig())).toEqual(text)
  })

  it('should change nothing when the section cannot be rewritten', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @il mf_a.sas
  @li
**/
%mf_a()`

    expect(repairHeaderList(text, new LintConfig())).toEqual(text)
  })

  it('should change nothing without a header', () => {
    expect(repairHeaderList('%mf_a()', new LintConfig())).toEqual('%mf_a()')
    expect(repairHeaderList('', new LintConfig())).toEqual('')
  })
})
