import { LintConfig } from '../types'
import { LineEndings } from '../types/LineEndings'
import {
  addMacrosToHeader,
  getHeaderMacros,
  removeMacrosFromHeader
} from './headerMacros'

describe('getHeaderMacros', () => {
  it('should return the macros declared in the SAS Macros and Other Macros sections', () => {
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
        endColumnNumber: 14,
        section: 'sasMacros'
      },
      {
        name: 'mf_left',
        lineNumber: 6,
        startColumnNumber: 7,
        endColumnNumber: 14,
        section: 'sasMacros'
      },
      {
        name: 'my_custom',
        lineNumber: 9,
        startColumnNumber: 7,
        endColumnNumber: 16,
        section: 'otherMacros'
      }
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
})
