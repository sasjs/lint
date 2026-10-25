import { LintConfig } from '../../types'
import { Severity } from '../../types/Severity'
import { noUnusedMacros } from './noUnusedMacros'

describe('noUnusedMacros - test', () => {
  it('should not report a macro that the file uses', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_trim.sas
**/
%mf_trim()`

    expect(noUnusedMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should report a macro that the file does not use', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_used.sas
  @li mf_unused.sas
**/
%mf_used()`

    expect(noUnusedMacros.test(text, new LintConfig())).toEqual([
      {
        message: `Macro 'mf_unused' is declared in the <h4> SAS Macros </h4> section but not used in the file`,
        lineNumber: 5,
        startColumnNumber: 7,
        endColumnNumber: 16,
        severity: Severity.Warning
      }
    ])
  })

  it('should not manage a list that is not the SAS Macros section', () => {
    const text = `/**
  @file
  <h4> Other Macros </h4>
  @li my_custom.sas
**/`

    expect(noUnusedMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should count an invocation made inside a masking function', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_existds.sas
  @li mp_abort.sas
**/
%mp_abort(iftrue=(%str(%mf_existds(work.a)) ne 1),msg=x)`

    // %str masks the argument while %mp_abort is called, but the condition
    // resolves %mf_existds, so the declaration is a dependency of the file.
    expect(noUnusedMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should respect the configured severity', () => {
    const config = new LintConfig({
      severityLevel: { noUnusedMacros: 'error' }
    })
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_unused.sas
**/`

    expect(noUnusedMacros.test(text, config)[0].severity).toEqual(
      Severity.Error
    )
  })

  it('should report a duplicated entry once', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_unused.sas
  @li mf_unused.sas
**/`

    expect(noUnusedMacros.test(text, new LintConfig()).length).toEqual(1)
  })

  it('should fall back to the default configuration', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_unused.sas
**/`

    expect(noUnusedMacros.test(text).length).toEqual(1)
  })

  it('should return an empty array when there is no text', () => {
    expect(noUnusedMacros.test('')).toEqual([])
  })
})

describe('noUnusedMacros - fix', () => {
  it('should remove the unused macros from the header', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_used.sas
  @li mf_unused.sas
**/
%mf_used()`

    const expected = `/**
  @file

  <h4> SAS Macros </h4>
  @li mf_used.sas

**/
%mf_used()`

    expect(noUnusedMacros.fix!(text, new LintConfig())).toEqual(expected)
  })

  it('should resolve the diagnostics it produces', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_used.sas
  @li mf_unused.sas
**/
%mf_used()`

    const fixed = noUnusedMacros.fix!(text, new LintConfig())

    expect(noUnusedMacros.test(fixed, new LintConfig())).toEqual([])
  })

  it('should not change a file whose macros are all used', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_used.sas
**/
%mf_used()`

    expect(noUnusedMacros.fix!(text, new LintConfig())).toEqual(text)
  })

  it('should not change a file whose macro is invoked inside a masking function', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_existds.sas
**/
%put %str(%mf_existds(work.a));`

    expect(noUnusedMacros.fix!(text, new LintConfig())).toEqual(text)
  })

  it('should repair a mistyped tag in place, without re-spacing the header', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_used.sas
  @il mf_also.sas
**/
%mf_used()
%mf_also()`

    const expected = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_used.sas
  @li mf_also.sas
**/
%mf_used()
%mf_also()`

    // Nothing is unused here, so this is the repair-only path: it edits the
    // entry line and touches nothing else, including the section spacing.
    expect(noUnusedMacros.fix!(text, new LintConfig())).toEqual(expected)
  })

  it('should not change a file that has no header', () => {
    const text = `%mf_used()`

    expect(noUnusedMacros.fix!(text, new LintConfig())).toEqual(text)
  })

  it('should fall back to the default configuration', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_unused.sas
**/`

    expect(noUnusedMacros.fix!(text)).toEqual(`/**
  @file

  <h4> SAS Macros </h4>

**/`)
  })
})
