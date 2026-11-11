import { Severity } from '../../types/Severity'
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

  it('should return an array with a single diagnostic when macro defined without name', () => {
    const content = `
  %macro ();
    %put &sysmacroname;
  %mend;`

    expect(hasMacroParentheses.test(content)).toEqual([
      {
        message: 'Macro definition missing name',
        lineNumber: 2,
        startColumnNumber: 3,
        endColumnNumber: 11,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a single diagnostic when macro defined without name ( single line code )', () => {
    const content = `
  %macro ();    %put &sysmacroname;  %mend;`

    expect(hasMacroParentheses.test(content)).toEqual([
      {
        message: 'Macro definition missing name',
        lineNumber: 2,
        startColumnNumber: 3,
        endColumnNumber: 11,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a single diagnostic when macro defined without name and parentheses', () => {
    const content = `
  %macro ;
    %put &sysmacroname;
  %mend;`

    expect(hasMacroParentheses.test(content)).toEqual([
      {
        message: 'Macro definition missing name',
        lineNumber: 2,
        startColumnNumber: 3,
        endColumnNumber: 8,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an empty array when the file is undefined', () => {
    const content = undefined

    expect(hasMacroParentheses.test(content as unknown as string)).toEqual([])
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

  describe('keyword capitalisation', () => {
    it('should report an upper case definition without parentheses', () => {
      const content = `%MACRO somemacro;\n  %put &sysmacroname;\n%MEND somemacro;`

      expect(hasMacroParentheses.test(content)).toEqual([
        {
          message: 'Macro definition missing parentheses',
          lineNumber: 1,
          startColumnNumber: 8,
          endColumnNumber: 16,
          severity: Severity.Warning
        }
      ])
    })
  })

  describe('fix', () => {
    it('should add the empty parameter list to a declaration without one', () => {
      const content = `%macro somemacro;\n  %put &sysmacroname;\n%mend somemacro;`

      expect(hasMacroParentheses.fix!(content)).toEqual(
        `%macro somemacro();\n  %put &sysmacroname;\n%mend somemacro;`
      )
    })

    it('should keep the case of the keyword and of the name', () => {
      const content = `%MACRO SomeMacro ;\n  %put &sysmacroname;\n%MEND SomeMacro;`

      expect(hasMacroParentheses.fix!(content)).toEqual(
        `%MACRO SomeMacro() ;\n  %put &sysmacroname;\n%MEND SomeMacro;`
      )
    })

    it('should keep a comment that shares the declaration line', () => {
      const content = `  %macro somemacro; /* the name says it all */\n%mend somemacro;`

      expect(hasMacroParentheses.fix!(content)).toEqual(
        `  %macro somemacro(); /* the name says it all */\n%mend somemacro;`
      )
    })

    it('should fix every declaration in the file', () => {
      const content = `%macro first;\n%mend first;\n%macro second;\n%mend second;`

      expect(hasMacroParentheses.fix!(content)).toEqual(
        `%macro first();\n%mend first;\n%macro second();\n%mend second;`
      )
    })

    it('should leave the other characters of the file alone, line endings included', () => {
      const content = `%macro first; \r\n  %put &sysmacroname;\r\n%mend first;\r\n`

      expect(hasMacroParentheses.fix!(content)).toEqual(
        `%macro first(); \r\n  %put &sysmacroname;\r\n%mend first;\r\n`
      )
    })

    it('should resolve the diagnostic it fixes', () => {
      const content = `%macro somemacro;\n%mend somemacro;`
      const fixed = hasMacroParentheses.fix!(content)

      expect(hasMacroParentheses.test(fixed)).toEqual([])
    })

    it('should be idempotent', () => {
      const content = `%macro somemacro;\n%mend somemacro;`
      const once = hasMacroParentheses.fix!(content)

      expect(hasMacroParentheses.fix!(once)).toEqual(once)
    })

    it('should decline a declaration that carries parameter text without parentheses', () => {
      const content = `%macro somemacro param=1;\n%mend somemacro;`

      expect(hasMacroParentheses.fix!(content)).toEqual(content)
      // the warning stays: adding `()` here would land in front of the
      // parameters, so this shape is the author's to repair
      expect(hasMacroParentheses.test(content)).toEqual([
        {
          message: 'Macro definition missing parentheses',
          lineNumber: 1,
          startColumnNumber: 8,
          endColumnNumber: 16,
          severity: Severity.Warning
        }
      ])
    })

    it('should decline a declaration that carries no name', () => {
      const content = `%macro ();\n%mend;`

      expect(hasMacroParentheses.fix!(content)).toEqual(content)
    })

    it('should fix each declaration on a line that carries two', () => {
      const content = `%macro first; %mend first; %macro second; %mend second;`

      expect(hasMacroParentheses.fix!(content)).toEqual(
        `%macro first(); %mend first; %macro second(); %mend second;`
      )
    })

    it('should keep a comment that sits between the name and the semicolon', () => {
      const content = `%macro somemacro /* no parameters */;\n%mend somemacro;`

      expect(hasMacroParentheses.fix!(content)).toEqual(
        `%macro somemacro() /* no parameters */;\n%mend somemacro;`
      )
    })

    it('should leave a declaration with no name alone', () => {
      const content = `%macro ;\n%mend;`

      expect(hasMacroParentheses.fix!(content)).toEqual(content)
    })

    it('should leave a definition that already has parentheses alone', () => {
      const content = `%macro somemacro();\n%mend somemacro;`

      expect(hasMacroParentheses.fix!(content)).toEqual(content)
    })

    it('should leave a definition whose parentheses are on a later declaration line alone', () => {
      const content = `%macro somemacro\n  (param=1)\n  /secure;\n%mend somemacro;`

      expect(hasMacroParentheses.fix!(content)).toEqual(content)
      expect(hasMacroParentheses.test(content)).toEqual([])
    })

    it('should do nothing with an empty file', () => {
      expect(hasMacroParentheses.fix!('')).toEqual('')
    })
  })
})
