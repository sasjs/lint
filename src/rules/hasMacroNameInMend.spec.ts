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

  describe('with extra spaces and comments', () => {
    it('should return an empty array when %mend has correct macro name', () => {
      const content = `
      /* 1st comment */
     %macro  somemacro ;

      %put &sysmacroname;

     /* 2nd 
     comment */
      /* 3rd comment */ %mend  somemacro ;`

      expect(hasMacroNameInMend.test(content)).toEqual([])
    })

    it('should return an array with a single diagnostic when %mend has correct macro name having code in comments', () => {
      const content = `/**
      @file examplemacro.sas
      @brief an example of a macro to be used in a service
      @details  This macro is great. Yadda yadda yadda.  Usage:

        * code formatting applies when indented by 4 spaces; code formatting applies when indented by 4 spaces; code formatting applies when indented by 4 spaces; code formatting applies when indented by 4 spaces; code formatting applies when indented by 4 spaces;

        some code
        %macro examplemacro123();      
        
        %examplemacro()

      <h4> SAS Macros </h4>
      @li doesnothing.sas

      @author Allan Bowe
    **/

    %macro examplemacro();

    proc sql;
    create table areas
      as select area
      
    from sashelp.springs;

    %doesnothing();

    %mend;`

      expect(hasMacroNameInMend.test(content)).toEqual([
        {
          message: '%mend missing macro name',
          lineNumber: 29,
          startColumnNumber: 5,
          endColumnNumber: 11,
          severity: Severity.Warning
        }
      ])
    })

    it('should return an array with a single diagnostic when %mend has incorrect macro name', () => {
      const content = `
    %macro  somemacro;
/* some comments */
      %put  &sysmacroname;
/* some comments */
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
      /* some comments */%put &sysmacroname;
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
