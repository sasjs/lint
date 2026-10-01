import { LintConfig } from '../../types'
import { Severity } from '../../types/Severity'
import { noUndeclaredMacros } from './noUndeclaredMacros'

describe('noUndeclaredMacros - test', () => {
  it('should not report a macro that is declared in the header', () => {
    const text = `/**
  @file
  @brief test
  <h4> SAS Macros </h4>
  @li mf_trim.sas
**/
%mf_trim()`

    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should not report a macro that is declared in the Other Macros section', () => {
    const text = `/**
  @file
  <h4> Other Macros </h4>
  @li my_custom.sas
**/
%my_custom()`

    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should not report a macro that is defined in the file', () => {
    const text = `%macro mf_trim();
%mend;
%mf_trim()`

    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should not report the macros that ship with SAS', () => {
    const text = `%put %sysfunc(date());
%scan(a b, 1);
%if &x %then %do;
%end;`

    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should report a macro that is used but not declared', () => {
    const text = `/**
  @file
  @brief test
  <h4> SAS Macros </h4>
**/
%mf_foo()`

    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([
      {
        message: `Macro 'mf_foo' is not declared - add it to the <h4> SAS Macros </h4> or <h4> Other Macros </h4> section of the header`,
        lineNumber: 6,
        startColumnNumber: 1,
        endColumnNumber: 8,
        severity: Severity.Warning
      }
    ])
  })

  it('should report each undeclared macro once, at its first use', () => {
    const text = `%mf_foo()\n%mf_bar()\n%mf_foo()`

    expect(
      noUndeclaredMacros.test(text, new LintConfig()).map((d) => d.lineNumber)
    ).toEqual([1, 2])
  })

  it('should respect the configured severity', () => {
    const config = new LintConfig({
      severityLevel: { noUndeclaredMacros: 'error' }
    })

    expect(noUndeclaredMacros.test(`%mf_foo()`, config)[0].severity).toEqual(
      Severity.Error
    )
  })

  it('should fall back to the default configuration', () => {
    expect(noUndeclaredMacros.test(`%mf_foo()`).length).toEqual(1)
  })

  it('should return an empty array when there is no text', () => {
    expect(noUndeclaredMacros.test('')).toEqual([])
  })
})

describe('noUndeclaredMacros - fix', () => {
  it('should add the undeclared macros to the header, sorted', () => {
    const text = `/**
  @file
  @brief test
  <h4> SAS Macros </h4>
**/
%mf_b()
%mf_a()`

    const expected = `/**
  @file
  @brief test

  <h4> SAS Macros </h4>
  @li mf_a.sas
  @li mf_b.sas

**/
%mf_b()
%mf_a()`

    expect(noUndeclaredMacros.fix!(text, new LintConfig())).toEqual(expected)
  })

  it('should resolve the diagnostics it produces', () => {
    const text = `/**
  @file
  @brief test
  <h4> SAS Macros </h4>
**/
%mf_b()
%mf_a()`

    const fixed = noUndeclaredMacros.fix!(text, new LintConfig())

    expect(noUndeclaredMacros.test(fixed, new LintConfig())).toEqual([])
  })

  it('should not change a file whose macros are all declared', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_trim.sas
**/
%mf_trim()`

    expect(noUndeclaredMacros.fix!(text, new LintConfig())).toEqual(text)
  })

  it('should not add a header to a file that has none', () => {
    const text = `%mf_trim()`

    expect(noUndeclaredMacros.fix!(text, new LintConfig())).toEqual(text)
  })

  it('should fall back to the default configuration', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
**/
%mf_trim()`

    expect(noUndeclaredMacros.fix!(text)).toContain('@li mf_trim.sas')
  })

  it('should not duplicate an entry that sits below a blank line', () => {
    const text = `/**
  @file
  @brief x

  <h4> SAS Macros </h4>
  @li mf_a.sas

  @li mf_b.sas

**/
%mf_a()
%mf_b()`

    // Both macros are declared, so the fix has nothing to add and must leave
    // the file alone. A reader that stopped at the blank line would treat mf_b
    // as undeclared and add a second entry for it.
    expect(noUndeclaredMacros.fix!(text, new LintConfig())).toEqual(text)
  })
})
