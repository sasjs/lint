import { Severity } from '../types/Severity'
import { hasMacroParentheses } from './hasMacroParentheses'

describe('hasMacroParentheses', () => {
  it('should return an empty array when macro defined correctly', () => {
    const content = `
  %macro somemacro();
    %put &sysmacroname;
  %mend somemacro;`

    expect(hasMacroParentheses.test(content)).toEqual([])
  })

  it('should return an array with a single diagnostics when macro defined without parentheses', () => {
    const content = `
  %macro somemacro;
    %put &sysmacroname;
  %mend somemacro;`

    expect(hasMacroParentheses.test(content)).toEqual([
      {
        message: 'Macro definition missing parentheses',
        lineNumber: 2,
        startColumnNumber: 10,
        endColumnNumber: 18,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a single diagnostics when macro defined without name', () => {
    const content = `
  %macro ();
    %put &sysmacroname;
  %mend;`

    expect(hasMacroParentheses.test(content)).toEqual([
      {
        message: 'Macro definition missing name',
        lineNumber: 2,
        startColumnNumber: 3,
        endColumnNumber: 12,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a single diagnostics when macro defined without name and parentheses', () => {
    const content = `
  %macro ;
    %put &sysmacroname;
  %mend;`

    expect(hasMacroParentheses.test(content)).toEqual([
      {
        message: 'Macro definition missing name',
        lineNumber: 2,
        startColumnNumber: 3,
        endColumnNumber: 10,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an empty array when the file is undefined', () => {
    const content = undefined

    expect(hasMacroParentheses.test((content as unknown) as string)).toEqual([])
  })

  describe('with extra spaces and comments', () => {
    it('should return an empty array when %mend has correct macro name', () => {
      const content = `
      /* 1st comment */
     %macro  somemacro();

      %put &sysmacroname;

     /* 2nd 
     comment */
      /* 3rd comment */ %mend  somemacro ;`

      expect(hasMacroParentheses.test(content)).toEqual([])
    })

    it('should return an array with a single diagnostic when macro defined without parentheses having code in comments', () => {
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

    %macro examplemacro;

    proc sql;
    create table areas
      as select area
      
    from sashelp.springs;

    %doesnothing();

    %mend;`

      expect(hasMacroParentheses.test(content)).toEqual([
        {
          message: 'Macro definition missing parentheses',
          lineNumber: 19,
          startColumnNumber: 12,
          endColumnNumber: 23,
          severity: Severity.Warning
        }
      ])
    })
  })

  it('should return an array with a single diagnostic when a macro definition contains a space', () => {
    const content = `%macro test ()`

    expect(hasMacroParentheses.test(content)).toEqual([
      {
        message: 'Macro definition contains space(s)',
        lineNumber: 1,
        startColumnNumber: 8,
        endColumnNumber: 14,
        severity: Severity.Warning
      }
    ])
  })
})
