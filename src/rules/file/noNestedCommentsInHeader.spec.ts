import { LintConfig } from '../../types'
import { Severity } from '../../types/Severity'
import { noNestedCommentsInHeader } from './noNestedCommentsInHeader'

const header = `/**
  @file test.sas
  @brief Example
  @details some details

  <h4> SAS Macros </h4>
  @li example.sas

**/
%example()`

describe('noNestedCommentsInHeader', () => {
  it('should return an empty array for a well formed header', () => {
    expect(noNestedCommentsInHeader.test(header)).toEqual([])
  })

  it('should return an empty array for a file without a header', () => {
    expect(noNestedCommentsInHeader.test('%put hello;')).toEqual([])
    expect(noNestedCommentsInHeader.test('')).toEqual([])
    expect(
      noNestedCommentsInHeader.test(undefined as unknown as string)
    ).toEqual([])
  })

  it('should return an empty array for a file opening with a plain comment', () => {
    const content = `/* a note
  /* with a nested opener */
*/
data a;
run;

/**
  @file test.sas
**/`

    expect(noNestedCommentsInHeader.test(content)).toEqual([])
  })

  it('should report a nested block comment in the header', () => {
    const content = `/**
  @file test.sas
  @brief Example
  @details Usage:

      %my_macro()
      /* reaching here means the child completed */
      data _null_;
        set work.status;
      run;

**/

%macro my_macro();
%mend my_macro;`

    expect(noNestedCommentsInHeader.test(content)).toEqual([
      {
        message: 'Doxygen header contains a nested block comment',
        lineNumber: 7,
        startColumnNumber: 7,
        endColumnNumber: 9,
        severity: Severity.Warning
      }
    ])
  })

  it('should report a /*/ in header text as the terminator', () => {
    const content = `/**
  @file test.sas
  @details outputs land in src/*/file.sas
  @brief Example

**/
%example()`

    expect(noNestedCommentsInHeader.test(content)).toEqual([
      {
        message:
          'Doxygen header contains /*/, which SAS reads as a comment terminator',
        lineNumber: 3,
        startColumnNumber: 31,
        endColumnNumber: 33,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an empty array when the terminator closes before the opener', () => {
    // The `/*` is header text that SAS never acts on: the first close marker is
    // the header's own terminator.
    const content = `/**
  @file test.sas
  @details use /* to open a comment
  @brief Example
**/
%example()`

    expect(noNestedCommentsInHeader.test(content)).toEqual([])
  })

  it('should return an empty array for a header that is never closed', () => {
    expect(
      noNestedCommentsInHeader.test('/**\n  @file test.sas\n  /* inner\n')
    ).toEqual([])
  })

  it('should return an empty array when the only opener follows the header', () => {
    // The opener belongs to code, not to the header: nothing was truncated
    // inside the header, so nothing is reported.
    const content = `/**
  @file test.sas
*/
data a;
run;
/* a trailing comment */`

    expect(noNestedCommentsInHeader.test(content)).toEqual([])
  })

  it('should return an empty array for a header with no terminator of its own', () => {
    const content = `/**
  @file test.sas
  @details some /* detail */ here
*/
%example()`

    expect(noNestedCommentsInHeader.test(content)).toEqual([])
  })

  it('should return an empty array when a later header owns the terminator', () => {
    const content = `/**
  @file a.sas
  @details a nested /* comment */
*/
%macro a; %mend;

/**
  @file b.sas
**/`

    expect(noNestedCommentsInHeader.test(content)).toEqual([])
  })

  it('should report the first of two comments inside one header', () => {
    // The second opener is part of the text that leaked, not a header of its
    // own, so it must not be taken as the owner of the terminator.
    const content = `/**
  @file test.sas
  @details /* a */ and /* b */
  @brief Example

**/
%example()`

    expect(noNestedCommentsInHeader.test(content)).toEqual([
      {
        message: 'Doxygen header contains a nested block comment',
        lineNumber: 3,
        startColumnNumber: 12,
        endColumnNumber: 14,
        severity: Severity.Warning
      }
    ])
  })

  it('should report a close marker that is bare text', () => {
    const content = `/**
  @file test.sas
  @details the close marker */ ends this header
  @brief Example

**/
%example()`

    expect(noNestedCommentsInHeader.test(content)).toEqual([
      {
        message: 'Doxygen header contains a close marker as text',
        lineNumber: 3,
        startColumnNumber: 29,
        endColumnNumber: 31,
        severity: Severity.Warning
      }
    ])
  })

  it('should ignore a terminator that is not alone on its line', () => {
    const content = `/**
  @file test.sas
  @details use /* to open a comment
  @brief Example
*/

data _null_;
  put 'a **/ marker';
run;`

    expect(noNestedCommentsInHeader.test(content)).toEqual([])
  })

  it('should report when the terminator is indented', () => {
    const content = `/**
  @file test.sas
  @details a nested /* comment */
  @brief Example

  **/
%example()`

    expect(noNestedCommentsInHeader.test(content)).toEqual([
      {
        message: 'Doxygen header contains a nested block comment',
        lineNumber: 3,
        startColumnNumber: 21,
        endColumnNumber: 23,
        severity: Severity.Warning
      }
    ])
  })

  it('should report an inner snippet that closes with its own terminator', () => {
    const content = `/**
  @details a snippet: /** @file x **/
  @brief Example

**/
%example()`

    expect(noNestedCommentsInHeader.test(content)).toEqual([
      {
        message: 'Doxygen header contains a nested block comment',
        lineNumber: 2,
        startColumnNumber: 23,
        endColumnNumber: 25,
        severity: Severity.Warning
      }
    ])
  })

  it('should use the configured severity', () => {
    const content = `/**
  @file test.sas
  @details a nested /* comment */
  @brief Example

**/
%example()`

    const config = new LintConfig({
      severityLevel: { noNestedCommentsInHeader: 'error' }
    })

    expect(noNestedCommentsInHeader.test(content, config)).toEqual([
      {
        message: 'Doxygen header contains a nested block comment',
        lineNumber: 3,
        startColumnNumber: 21,
        endColumnNumber: 23,
        severity: Severity.Error
      }
    ])
  })
})
