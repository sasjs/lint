import { Severity } from '../types/Severity'
import { hasMacroNameInMend } from './hasMacroNameInMend'

describe('hasMacroNameInMend', () => {
  it('should return an empty array when %mend has correct macro name', () => {
    const content = `
  %macro somemacro();
    %put &sysmacroname;
  %mend somemacro;`

    expect(hasMacroNameInMend.test(content)).toEqual([])
  })

  it('should return an empty array when %mend has correct macro name without parentheses', () => {
    const content = `
  %macro somemacro;
    %put &sysmacroname;
  %mend somemacro;`

    expect(hasMacroNameInMend.test(content)).toEqual([])
  })

  it('should return an array with a single diagnostic when %mend has no macro name', () => {
    const content = `
  %macro somemacro;
    %put &sysmacroname;
  %mend;`

    expect(hasMacroNameInMend.test(content)).toEqual([
      {
        message: '%mend missing macro name',
        lineNumber: 4,
        startColumnNumber: 3,
        endColumnNumber: 9,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a single diagnostic when %mend has incorrect macro name', () => {
    const content = `
  %macro somemacro;
    %put &sysmacroname;
  %mend someanothermacro;`

    expect(hasMacroNameInMend.test(content)).toEqual([
      {
        message: 'mismatch macro name in %mend statement',
        lineNumber: 4,
        startColumnNumber: 9,
        endColumnNumber: 25,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an empty array when the file is undefined', () => {
    const content = undefined

    expect(hasMacroNameInMend.test((content as unknown) as string)).toEqual([])
  })

  describe('nestedMacros', () => {
    it('should return an empty array when %mend has correct macro name', () => {
      const content = `
  %macro outer();

    %macro inner();
      %put inner;
    %mend inner;
    %inner()
    %put outer;
  %mend outer;`

      expect(hasMacroNameInMend.test(content)).toEqual([])
    })

    it('should return an array with a single diagnostic when %mend has no macro name(inner)', () => {
      const content = `
  %macro outer();

    %macro inner();
      %put inner;
    %mend;
    %inner()
    %put outer;
  %mend outer;`

      expect(hasMacroNameInMend.test(content)).toEqual([
        {
          message: '%mend missing macro name',
          lineNumber: 6,
          startColumnNumber: 5,
          endColumnNumber: 11,
          severity: Severity.Warning
        }
      ])
    })

    it('should return an array with a single diagnostic when %mend has no macro name(outer)', () => {
      const content = `
  %macro outer();

    %macro inner();
      %put inner;
    %mend inner;
    %inner()
    %put outer;
  %mend;`

      expect(hasMacroNameInMend.test(content)).toEqual([
        {
          message: '%mend missing macro name',
          lineNumber: 9,
          startColumnNumber: 3,
          endColumnNumber: 9,
          severity: Severity.Warning
        }
      ])
    })

    it('should return an array with two diagnostics when %mend has no macro name(none)', () => {
      const content = `
  %macro outer();

    %macro inner();
      %put inner;
    %mend;
    %inner()
    %put outer;
  %mend;`

      expect(hasMacroNameInMend.test(content)).toEqual([
        {
          message: '%mend missing macro name',
          lineNumber: 6,
          startColumnNumber: 5,
          endColumnNumber: 11,
          severity: Severity.Warning
        },
        {
          message: '%mend missing macro name',
          lineNumber: 9,
          startColumnNumber: 3,
          endColumnNumber: 9,
          severity: Severity.Warning
        }
      ])
    })
  })

  describe('with extra spaces ', () => {
    it('should return an empty array when %mend has correct macro name', () => {
      const content = `
     %macro  somemacro ;
      %put &sysmacroname;
    %mend  somemacro ;`

      expect(hasMacroNameInMend.test(content)).toEqual([])
    })

    it('should return an array with a single diagnostic when %mend has incorrect macro name', () => {
      const content = `
    %macro  somemacro;

      %put  &sysmacroname;

    %mend    someanothermacro   ;`

      expect(hasMacroNameInMend.test(content)).toEqual([
        {
          message: 'mismatch macro name in %mend statement',
          lineNumber: 6,
          startColumnNumber: 14,
          endColumnNumber: 30,
          severity: Severity.Warning
        }
      ])
    })

    it('should return an array with a single diagnostic when %mend has no macro name', () => {
      const content = `
     %macro   somemacro ;
      %put &sysmacroname;
    %mend         ;`

      expect(hasMacroNameInMend.test(content)).toEqual([
        {
          message: '%mend missing macro name',
          lineNumber: 4,
          startColumnNumber: 5,
          endColumnNumber: 11,
          severity: Severity.Warning
        }
      ])
    })

    describe('nestedMacros', () => {
      it('should return an empty array when %mend has correct macro name', () => {
        const content = `
  %macro outer( ) ;


    %macro inner();

      %put inner;

       %mend inner;

      %inner()

         %put outer;
  %mend outer;`

        expect(hasMacroNameInMend.test(content)).toEqual([])
      })
    })
  })
})
