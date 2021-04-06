import { Severity } from '../types/Severity'
import { noNestedMacros } from './noNestedMacros'

describe('noNestedMacros', () => {
  it('should return an empty array when no nested macro', () => {
    const content = `
  %macro somemacro();
    %put &sysmacroname;
  %mend somemacro;`

    expect(noNestedMacros.test(content)).toEqual([])
  })

  it('should return an array with a single diagnostics when nested macro defined', () => {
    const content = `
    %macro outer();
      /* any amount of arbitrary code */
      %macro inner();
        %put inner;
      %mend;
      %inner()
      %put outer;
    %mend;

    %outer()`

    expect(noNestedMacros.test(content)).toEqual([
      {
        message: "Macro definition present inside another macro 'outer'",
        lineNumber: 4,
        startColumnNumber: 7,
        endColumnNumber: 20,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a single diagnostics when nested macro defined 2 levels', () => {
    const content = `
    %macro outer();
      /* any amount of arbitrary code */
      %macro inner();
        %put inner;

                %macro inner2();
                  %put inner2;
                %mend;
      %mend;
      %inner()
      %put outer;
    %mend;

    %outer()`

    expect(noNestedMacros.test(content)).toEqual([
      {
        message: "Macro definition present inside another macro 'outer'",
        lineNumber: 4,
        startColumnNumber: 7,
        endColumnNumber: 20,
        severity: Severity.Warning
      },
      {
        message: "Macro definition present inside another macro 'inner'",
        lineNumber: 7,
        startColumnNumber: 17,
        endColumnNumber: 31,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an empty array when the file is undefined', () => {
    const content = undefined

    expect(noNestedMacros.test((content as unknown) as string)).toEqual([])
  })
})
