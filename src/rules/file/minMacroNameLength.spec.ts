import { LintConfig } from '../../types'
import { Severity } from '../../types/Severity'
import { minMacroNameLength } from './minMacroNameLength'

describe('minMacroNameLength - test', () => {
  it('should report a macro whose name is shorter than the floor', () => {
    const text = `/**
  @file
**/
%macro s();
%mend s;`

    const diagnostics = minMacroNameLength.test(text, new LintConfig())

    expect(diagnostics).toEqual([
      {
        message: `Macro name 's' is shorter than 3 characters`,
        lineNumber: 4,
        startColumnNumber: 1,
        endColumnNumber: 8,
        severity: Severity.Warning
      }
    ])
  })

  it('should not report a name at the floor', () => {
    const text = `/**
  @file
**/
%macro mfx();
%mend mfx;`

    expect(minMacroNameLength.test(text, new LintConfig())).toEqual([])
  })

  it('should honour a higher configured floor', () => {
    const text = `/**
  @file
**/
%macro mfx();
%mend mfx;`

    const config = new LintConfig({ minMacroNameLength: 4 })

    expect(minMacroNameLength.test(text, config)[0].message).toEqual(
      `Macro name 'mfx' is shorter than 4 characters`
    )
  })

  it('should be off when the floor is below two', () => {
    const text = `/**
  @file
**/
%macro s();
%mend s;`

    expect(
      minMacroNameLength.test(text, new LintConfig({ minMacroNameLength: 1 }))
    ).toEqual([])
  })

  it('should take the severity from the configuration', () => {
    const text = `/**
  @file
**/
%macro s();
%mend s;`

    const config = new LintConfig({
      severityLevel: { minMacroNameLength: 'error' }
    })

    expect(minMacroNameLength.test(text, config)[0].severity).toEqual(
      Severity.Error
    )
  })

  it('should read a nested definition too', () => {
    const text = `/**
  @file
**/
%macro outer();
  %macro z();
  %mend z;
%mend outer;`

    expect(
      minMacroNameLength.test(text, new LintConfig()).map((d) => d.lineNumber)
    ).toEqual([5])
  })

  it('should cover the declaration only, not trailing content', () => {
    const text = `/**
  @file
**/
%macro s(); %put hi;`

    const diagnostic = minMacroNameLength.test(text, new LintConfig())[0]

    expect(diagnostic.startColumnNumber).toEqual(1)
    expect(diagnostic.endColumnNumber).toEqual(8)
  })

  it('should point at the declaration, not at a comment that mentions one', () => {
    const text = `/**
  @file
**/
/* %macro a(); was the old name */ %macro s();`

    const diagnostic = minMacroNameLength.test(text, new LintConfig())[0]

    expect(diagnostic.startColumnNumber).toEqual(36)
    expect(diagnostic.endColumnNumber).toEqual(43)
  })

  it('should cover the keyword when the name is on the next line', () => {
    const text = `/**
  @file
**/
%macro
  s();
%mend s;`

    const diagnostic = minMacroNameLength.test(text, new LintConfig())[0]

    expect(diagnostic.lineNumber).toEqual(4)
    expect(diagnostic.startColumnNumber).toEqual(1)
    expect(diagnostic.endColumnNumber).toEqual(6)
  })

  it('should not throw on a stray %mend', () => {
    const text = `/**
  @file
**/
%mend s;`

    // The parser returns an entry with no name and no start line for this; there
    // is no definition to measure, and no line to report on.
    expect(minMacroNameLength.test(text, new LintConfig())).toEqual([])
  })

  it('should read a /* inside a string as text, not as a comment', () => {
    const text = `/**
  @file
**/
/* %macro a(); */ %put '/*'; %macro s();`

    // The quote makes those two characters data, so the declaration after them
    // is code and the diagnostic lands on it rather than on the comment's copy.
    const diagnostics = minMacroNameLength.test(text, new LintConfig())

    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].startColumnNumber).toEqual(30)
    expect(diagnostics[0].endColumnNumber).toEqual(37)
  })

  it('should skip a match inside a comment when the same name follows it', () => {
    const text = `/**
  @file
**/
/* %macro s(); */ %macro s();`

    const diagnostics = minMacroNameLength.test(text, new LintConfig())

    // Both matches read the same name; the first is comment text, the second is
    // the declaration, so the occurrence index lands on the code.
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].startColumnNumber).toEqual(19)
    expect(diagnostics[0].endColumnNumber).toEqual(26)
  })

  it('should read an unclosed comment as comment text to the end of the line', () => {
    const text = `/**
  @file
**/
%macro s(); /* note`

    // The block never closes, so the rest of the line is comment - and the
    // declaration before it still reports.
    const diagnostics = minMacroNameLength.test(text, new LintConfig())

    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].startColumnNumber).toEqual(1)
    expect(diagnostics[0].endColumnNumber).toEqual(8)
  })

  it('should ignore a short definition inside a data section', () => {
    const text = `/**
  @file
**/
filename tmp temp;
parmcards4;
  %macro x();
  %mend x;
;;;;
%inc tmp;`

    // The block is text written to a file, so `%macro x();` there is payload
    // rather than a definition - the same reading a `datalines` value gets.
    expect(minMacroNameLength.test(text, new LintConfig())).toEqual([])
  })

  it('should return an empty array when there is no text', () => {
    expect(minMacroNameLength.test('', new LintConfig())).toEqual([])
  })

  it('should fall back to the default configuration', () => {
    const text = `/**
  @file
**/
%macro s();
%mend s;`

    expect(minMacroNameLength.test(text).length).toEqual(1)
  })
})
