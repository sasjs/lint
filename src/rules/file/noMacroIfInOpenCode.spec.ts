import { LintConfig } from '../../types'
import { Severity } from '../../types/Severity'
import { noMacroIfInOpenCode } from './noMacroIfInOpenCode'

const expectedMessage = `Macro %if used in open code - open-code %if requires SAS 9.4M5; move the block inside a %macro definition`

const enabled = new LintConfig({ noMacroIfInOpenCode: true })

describe('noMacroIfInOpenCode', () => {
  it('should be off by default', () => {
    const config = new LintConfig({})

    expect(
      config.fileLintRules.find((rule) => rule.name === 'noMacroIfInOpenCode')
    ).toBeUndefined()
  })

  it('should be enabled by the setting', () => {
    const config = new LintConfig({ noMacroIfInOpenCode: true })

    expect(
      config.fileLintRules.find((rule) => rule.name === 'noMacroIfInOpenCode')
    ).toBeTruthy()
  })

  it('should report %if in open code at its position', () => {
    const text = `%let debug = 1;\n%if &debug %then %do;\n  %put debug;\n%end;`

    expect(noMacroIfInOpenCode.test(text, enabled)).toEqual([
      {
        message: expectedMessage,
        lineNumber: 2,
        startColumnNumber: 1,
        endColumnNumber: 4,
        severity: Severity.Warning
      }
    ])
  })

  it('should report an upper case %IF', () => {
    const text = `%IF 1 %then %put x;`

    expect(noMacroIfInOpenCode.test(text, enabled)).toEqual([
      {
        message: expectedMessage,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 4,
        severity: Severity.Warning
      }
    ])
  })

  it('should report each %if in open code', () => {
    const text = `%if 1 %then %do;\n%end;\n%if 2 %then %do;\n%end;`

    expect(noMacroIfInOpenCode.test(text, enabled)).toEqual([
      {
        message: expectedMessage,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 4,
        severity: Severity.Warning
      },
      {
        message: expectedMessage,
        lineNumber: 3,
        startColumnNumber: 1,
        endColumnNumber: 4,
        severity: Severity.Warning
      }
    ])
  })

  it('should not report %if inside a macro definition', () => {
    const text = `%macro run(debug=0);\n  %if &debug %then %do;\n    %put debug;\n  %end;\n%mend run`

    expect(noMacroIfInOpenCode.test(text, enabled)).toEqual([])
  })

  it('should report %if that follows the closing %mend', () => {
    const text = `%macro run();\n  %put ok;\n%mend run\n%if 1 %then %put outside;`

    expect(noMacroIfInOpenCode.test(text, enabled)).toEqual([
      {
        message: expectedMessage,
        lineNumber: 4,
        startColumnNumber: 1,
        endColumnNumber: 4,
        severity: Severity.Warning
      }
    ])
  })

  it('should report %if in open code in a file that also defines a macro', () => {
    const text = `%if 1 %then %put before;\n%macro run();\n  %put ok;\n%mend run`

    expect(noMacroIfInOpenCode.test(text, enabled)).toEqual([
      {
        message: expectedMessage,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 4,
        severity: Severity.Warning
      }
    ])
  })

  it('should not report %if on the line that declares a one-line definition', () => {
    const text = `%macro run(); %if 1 %then %put inside; %mend run`

    expect(noMacroIfInOpenCode.test(text, enabled)).toEqual([])
  })

  it('should not report %if on the line that closes a definition', () => {
    const text = `%macro run();\n  %put ok;\n%mend run; %if 1 %then %put after;`

    expect(noMacroIfInOpenCode.test(text, enabled)).toEqual([])
  })

  it('should not report %if in a definition that has no %mend', () => {
    const text = `%macro run();\n  %if 1 %then %put inside;`

    expect(noMacroIfInOpenCode.test(text, enabled)).toEqual([])
  })

  it('should not report %if in comments', () => {
    const text = [
      '/* %if 1 %then %put a; */',
      '%* %if 1 %then %put b;',
      'data _null_;',
      '  * %if 1 %then %put c;',
      'run;'
    ].join('\n')

    expect(noMacroIfInOpenCode.test(text, enabled)).toEqual([])
  })

  it('should not report %if inside a single-quoted string', () => {
    const text = `data _null_;\n  file out;\n  put '%if 1 %then %do;';\nrun;`

    expect(noMacroIfInOpenCode.test(text, enabled)).toEqual([])
  })

  it('should report %if inside a double-quoted string', () => {
    const text = `data _null_;\n  file out;\n  put "%if 1 %then %do;";\nrun;`

    expect(noMacroIfInOpenCode.test(text, enabled)).toEqual([
      {
        message: expectedMessage,
        lineNumber: 3,
        startColumnNumber: 8,
        endColumnNumber: 11,
        severity: Severity.Warning
      }
    ])
  })

  it('should not report %if inside a %str argument', () => {
    const text = `%let note = %str(%if 1 %then %do;);`

    expect(noMacroIfInOpenCode.test(text, enabled)).toEqual([])
  })

  it('should not report %if inside a %nrstr argument', () => {
    const text = `%let note = %nrstr(%if 1 %then %do;);`

    expect(noMacroIfInOpenCode.test(text, enabled)).toEqual([])
  })

  it('should honour a severity level', () => {
    const config = new LintConfig({
      noMacroIfInOpenCode: true,
      severityLevel: { noMacroIfInOpenCode: 'error' }
    })

    const text = `%if 1 %then %put x;`

    expect(noMacroIfInOpenCode.test(text, config)[0].severity).toEqual(
      Severity.Error
    )
  })

  it('should have no fix', () => {
    expect(noMacroIfInOpenCode.fix).toBeUndefined()
  })

  it('should return nothing for an empty file', () => {
    expect(noMacroIfInOpenCode.test('', enabled)).toEqual([])
  })
})
