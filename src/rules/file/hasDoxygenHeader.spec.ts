import { LintConfig } from '../../types'
import { Severity } from '../../types/Severity'
import { hasDoxygenHeader } from './hasDoxygenHeader'

describe('hasDoxygenHeader - test', () => {
  it('should return an empty array when the file starts with a doxygen header', () => {
    const content = `/**
   @file
   @brief Returns an unused libref
 **/

 %macro mf_getuniquelibref(prefix=mclib,maxtries=1000);
   %local x libref;
   %let x={SAS002};
   %do x=0 %to &maxtries;`

    expect(hasDoxygenHeader.test(content)).toEqual([])
  })

  it('should return an empty array when the file starts with a doxygen header', () => {
    const content = `
    
    
    /*
   @file
   @brief Returns an unused libref
 */

 %macro mf_getuniquelibref(prefix=mclib,maxtries=1000);
   %local x libref;
   %let x={SAS002};
   %do x=0 %to &maxtries;`

    expect(hasDoxygenHeader.test(content)).toEqual([
      {
        message:
          'File not following Doxygen header style, use double asterisks',
        lineNumber: 4,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })

  it('should report a header that closes with a single asterisk', () => {
    const content = `/**
   @file
   @brief Returns an unused libref
 */

 %macro mf_getuniquelibref(prefix=mclib,maxtries=1000);`

    expect(hasDoxygenHeader.test(content)).toEqual([
      {
        message:
          'File not following Doxygen header style, close with double asterisks',
        lineNumber: 4,
        startColumnNumber: 2,
        endColumnNumber: 3,
        severity: Severity.Warning
      }
    ])
  })

  it('should report an opener that is not in the Doxygen form on the first line', () => {
    const content = `/*
   @file
**/
 %put hello;`

    expect(hasDoxygenHeader.test(content)).toEqual([
      {
        message:
          'File not following Doxygen header style, use double asterisks',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })

  it('should report a header that closes on a line of its own content', () => {
    const content = `/** @brief test **/
 %put hello;`

    expect(hasDoxygenHeader.test(content)).toEqual([
      {
        message:
          'File not following Doxygen header style, close with the marker on a line of its own',
        lineNumber: 1,
        startColumnNumber: 18,
        endColumnNumber: 20,
        severity: Severity.Warning
      }
    ])
  })

  it('should report a header that is never closed', () => {
    const content = `/**
   @file
   @brief <Your brief here>

 %put hello;`

    expect(hasDoxygenHeader.test(content)).toEqual([
      {
        message:
          'File not following Doxygen header style, header is never closed',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 4,
        severity: Severity.Warning
      }
    ])
    // Closing it at the end of the file would swallow whatever the author
    // meant to keep outside the block, so the warning is theirs to resolve.
    expect(hasDoxygenHeader.fix!(content)).toEqual(content)
  })

  it('should leave a header alone when its body holds a comment opener', () => {
    // The first close marker may belong to that comment rather than to the
    // header, so its extent is the author's to decide.
    const content = `/**
   @file
   @details use /* to open a comment
 */

 %put hello;`

    expect(hasDoxygenHeader.test(content)).toEqual([])
  })

  it('should return an array with a single diagnostic when the file has no header', () => {
    const content = `
 %macro mf_getuniquelibref(prefix=mclib,maxtries=1000);
   %local x libref;
   %let x={SAS002};
   %do x=0 %to &maxtries;`

    expect(hasDoxygenHeader.test(content)).toEqual([
      {
        message: 'File missing Doxygen header',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a single diagnostic when the file has comment blocks but no header', () => {
    const content = `
 %macro mf_getuniquelibref(prefix=mclib,maxtries=1000);
   %local x libref;
   %let x={SAS002};
  /** Comment Line 1
   * Comment Line 2
   */
   %do x=0 %to &maxtries;`

    expect(hasDoxygenHeader.test(content)).toEqual([
      {
        message: 'File missing Doxygen header',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a single diagnostic when the file is undefined', () => {
    const content = undefined

    expect(hasDoxygenHeader.test(content as unknown as string)).toEqual([
      {
        message: 'File missing Doxygen header',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })
})

describe('hasDoxygenHeader - fix', () => {
  it('should not alter the text if a doxygen header is already present', () => {
    const content = `/**
   @file
   @brief Returns an unused libref
 **/

 %macro mf_getuniquelibref(prefix=mclib,maxtries=1000);
   %local x libref;
   %let x={SAS002};
   %do x=0 %to &maxtries;`

    expect(hasDoxygenHeader.fix!(content)).toEqual(content)
  })

  it('should update a single-asterisk header to the Doxygen form in one pass', () => {
    const contentOriginal = `
    /*
   @file
   @brief Returns an unused libref
 */

 %macro mf_getuniquelibref(prefix=mclib,maxtries=1000);
   %local x libref;
   %let x={SAS002};
   %do x=0 %to &maxtries;`

    const contentExpected = `
    /**
   @file
   @brief Returns an unused libref
 **/

 %macro mf_getuniquelibref(prefix=mclib,maxtries=1000);
   %local x libref;
   %let x={SAS002};
   %do x=0 %to &maxtries;`

    expect(hasDoxygenHeader.fix!(contentOriginal)).toEqual(contentExpected)
  })

  it('should widen a single-asterisk close to double asterisks', () => {
    const content = `/**
   @file
   @brief Returns an unused libref
 */

 %put hello;`

    const fixed = hasDoxygenHeader.fix!(content)

    expect(fixed).toEqual(`/**
   @file
   @brief Returns an unused libref
 **/

 %put hello;`)
    // already in the Doxygen form: a second pass changes nothing
    expect(hasDoxygenHeader.fix!(fixed)).toEqual(fixed)
    expect(hasDoxygenHeader.test(fixed)).toEqual([])
  })

  it('should move a close that shares its line onto a line of its own', () => {
    const content = `/** @brief test **/
 %put hello;`

    const fixed = hasDoxygenHeader.fix!(content)

    expect(fixed).toEqual(`/** @brief test
**/
 %put hello;`)
    // already in the Doxygen form: a second pass changes nothing
    expect(hasDoxygenHeader.fix!(fixed)).toEqual(fixed)
    expect(hasDoxygenHeader.test(fixed)).toEqual([])
  })

  it('should expand an empty one-line comment into a header block', () => {
    const content = `/**/
 %put hello;`

    const fixed = hasDoxygenHeader.fix!(content)

    expect(fixed).toEqual(`/**
**/
 %put hello;`)
    expect(hasDoxygenHeader.test(fixed)).toEqual([])
  })

  it('should move an inline close onto its own line with CRLF endings', () => {
    const content = '/** @brief test **/\r\n%put hello;'
    const config = new LintConfig({ lineEndings: 'crlf' })

    expect(hasDoxygenHeader.fix!(content, config)).toEqual(
      '/** @brief test\r\n**/\r\n%put hello;'
    )
  })

  it('should trim every space before an inline close', () => {
    const content = `/** @brief test   **/
 %put hello;`

    expect(hasDoxygenHeader.fix!(content)).toEqual(`/** @brief test
**/
 %put hello;`)
  })

  it('should move code that follows an inline close onto its own line', () => {
    const content = `/** @brief test **/ %put hello;`

    const fixed = hasDoxygenHeader.fix!(content)

    expect(fixed).toEqual(`/** @brief test
**/
%put hello;`)
    expect(hasDoxygenHeader.test(fixed)).toEqual([])
  })

  it('should keep the lines below code that followed an inline close', () => {
    const content = `/** @brief test **/ %put a;
%put hello;`

    expect(hasDoxygenHeader.fix!(content)).toEqual(`/** @brief test
**/
%put a;
%put hello;`)
  })

  it('should expand a one-line header that ends the file', () => {
    const content = `/** @brief test **/`

    const fixed = hasDoxygenHeader.fix!(content)

    expect(fixed).toEqual(`/** @brief test
**/`)
    expect(hasDoxygenHeader.test(fixed)).toEqual([])
  })

  it('should repair a single-line plain comment to a header in one pass', () => {
    const content = `/* c */
%mf_foo()`

    const fixed = hasDoxygenHeader.fix!(content)

    // Three defects in one header: single-asterisk opener, single-asterisk
    // close, and a close that shares the content line. The formatter calls this
    // fix once, so all three are taken here.
    expect(fixed).toEqual(`/** c
**/
%mf_foo()`)
    expect(hasDoxygenHeader.test(fixed)).toEqual([])
  })

  it('should widen a close and then move it onto its own line', () => {
    const content = `/**
  @file */
%mf_foo()`

    const fixed = hasDoxygenHeader.fix!(content)

    expect(fixed).toEqual(`/**
  @file
**/
%mf_foo()`)
    expect(hasDoxygenHeader.test(fixed)).toEqual([])
  })

  it('should add a doxygen header if not present', () => {
    const content = `%macro mf_getuniquelibref(prefix=mclib,maxtries=1000);
%local x libref;
%let x={SAS002};
%do x=0 %to &maxtries;`

    expect(hasDoxygenHeader.fix!(content)).toEqual(
      `/**
  @file
  @brief <Your brief here>

  <h4> SAS Macros </h4>

**/` +
        '\n' +
        content
    )
  })

  it('should use LF when the configuration names no line endings', () => {
    const content = `%put hello;`

    expect(hasDoxygenHeader.fix!(content, new LintConfig({}))).toContain(
      '**/\n%put hello;'
    )
  })

  it('should use CRLF line endings when configured', () => {
    const content = `%macro mf_getuniquelibref(prefix=mclib,maxtries=1000);\n%local x libref;\n%let x={SAS002};\n%do x=0 %to &maxtries;`
    const config = new LintConfig({ lineEndings: 'crlf' })

    expect(hasDoxygenHeader.fix!(content, config)).toEqual(
      `/**\r\n  @file\r\n  @brief <Your brief here>\r\n\r\n  <h4> SAS Macros </h4>\r\n\r\n**/` +
        '\r\n' +
        content
    )
  })
})
