import { LintConfig, Severity } from '../../types'
import { strictMacroDefinition } from './strictMacroDefinition'

describe('strictMacroDefinition', () => {
  it('should return an empty array when the content has correct macro definition syntax', () => {
    const content = '%macro somemacro;'
    expect(strictMacroDefinition.test(content)).toEqual([])

    const content2 = '%macro somemacro();'
    expect(strictMacroDefinition.test(content2)).toEqual([])

    const content3 = '%macro somemacro(var1);'
    expect(strictMacroDefinition.test(content3)).toEqual([])

    const content4 = '%macro somemacro/minoperator;'
    expect(strictMacroDefinition.test(content4)).toEqual([])

    const content5 = '%macro somemacro /minoperator;'
    expect(strictMacroDefinition.test(content5)).toEqual([])

    const content6 = '%macro somemacro(var1, var2)/minoperator;'
    expect(strictMacroDefinition.test(content6)).toEqual([])

    const content7 =
      ' /* Some Comment */ %macro somemacro(var1, var2) /minoperator ; /* Some Comment */'
    expect(strictMacroDefinition.test(content7)).toEqual([])

    const content8 =
      '%macro macroName( arr, arr/* / store source */3 ) /* / store source */;/* / store source */'
    expect(strictMacroDefinition.test(content8)).toEqual([])

    const content9 = '%macro macroName(var1, var2=with space, var3=);'
    expect(strictMacroDefinition.test(content9)).toEqual([])

    const content10 = '%macro macroName()/ /* some comment */ store source;'
    expect(strictMacroDefinition.test(content10)).toEqual([])

    const content11 = '`%macro macroName() /* / store source */;'
    expect(strictMacroDefinition.test(content11)).toEqual([])

    const content12 =
      '%macro macroName()/ /* some comment */ store des="some description";'
    expect(strictMacroDefinition.test(content12)).toEqual([])
  })

  it('should return an array with a single diagnostic when Macro definition has space in param', () => {
    const content = '%macro somemacro(va r1);'
    expect(strictMacroDefinition.test(content)).toEqual([
      {
        message: `Param 'va r1' cannot have space`,
        lineNumber: 1,
        startColumnNumber: 18,
        endColumnNumber: 22,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a two diagnostics when Macro definition has space in params', () => {
    const content = '%macro somemacro(var1, var 2, v ar3, var4);'
    expect(strictMacroDefinition.test(content)).toEqual([
      {
        message: `Param 'var 2' cannot have space`,
        lineNumber: 1,
        startColumnNumber: 24,
        endColumnNumber: 28,
        severity: Severity.Warning
      },
      {
        message: `Param 'v ar3' cannot have space`,
        lineNumber: 1,
        startColumnNumber: 31,
        endColumnNumber: 35,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a two diagnostics when Macro definition has space in params - special case', () => {
    const content =
      '%macro macroName( arr, ar r/* / store source */ 3 ) /* / store source */;/* / store source */'
    expect(strictMacroDefinition.test(content)).toEqual([
      {
        message: `Param 'ar r 3' cannot have space`,
        lineNumber: 1,
        startColumnNumber: 24,
        endColumnNumber: 49,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a single diagnostic when Macro definition has invalid option', () => {
    const content = '%macro somemacro(var1, var2)/minXoperator;'
    expect(strictMacroDefinition.test(content)).toEqual([
      {
        message: `Option 'minXoperator' is not valid`,
        lineNumber: 1,
        startColumnNumber: 30,
        endColumnNumber: 41,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a two diagnostics when Macro definition has invalid options', () => {
    const content =
      '%macro somemacro(var1, var2)/ store   invalidoption   secure ;'
    expect(strictMacroDefinition.test(content)).toEqual([
      {
        message: `Option 'invalidoption' is not valid`,
        lineNumber: 1,
        startColumnNumber: 39,
        endColumnNumber: 51,
        severity: Severity.Warning
      }
    ])
  })

  describe('declarations that continue past the parameter list', () => {
    it('should not throw on a declaration whose options follow the parameter list', () => {
      const content = `%macro m(
  a = 1   /* note,
             more text, SAS 9.4M6 */
)/secure
des = 'Run %m(HELP) for help.'
;
%put ok;
%mend m;
`

      // The list ends at its own `)`, so the `des=` value - which carries a
      // parenthesis of its own - is option text rather than a parameter. Reading
      // it as a parameter used to build an invalid RegExp and abort the run
      // (issue #273).
      expect(strictMacroDefinition.test(content)).toEqual([])
    })

    it('should read a parameter default that carries its own parentheses', () => {
      const content = `%macro m(a = %sysfunc(pathname(work)), b = 2);`

      expect(strictMacroDefinition.test(content)).toEqual([])
    })

    it('should not end the parameter list inside a quoted value', () => {
      const content = `%macro m(a = 'x)', va r2);`

      expect(strictMacroDefinition.test(content)).toEqual([
        {
          message: `Param 'va r2' cannot have space`,
          lineNumber: 1,
          startColumnNumber: 20,
          endColumnNumber: 24,
          severity: Severity.Warning
        }
      ])
    })

    it('should not end the parameter list inside a double-quoted value', () => {
      const content = `%macro m(a = "x)", va r2);`

      expect(strictMacroDefinition.test(content)).toEqual([
        {
          message: `Param 'va r2' cannot have space`,
          lineNumber: 1,
          startColumnNumber: 20,
          endColumnNumber: 24,
          severity: Severity.Warning
        }
      ])
    })

    it('should not split a parameter at a comma inside a quoted value', () => {
      const content = `%macro m(a = "x, y", va r2);`

      expect(strictMacroDefinition.test(content)).toEqual([
        {
          message: `Param 'va r2' cannot have space`,
          lineNumber: 1,
          startColumnNumber: 22,
          endColumnNumber: 26,
          severity: Severity.Warning
        }
      ])
    })

    it('should check a parameter in a declaration whose comment spans lines', () => {
      const content = `%macro m(
  a = 1,   /* first
              second */
  va r2
)/secure;`

      // The parameter checks read the declaration lines with their comments
      // removed, so a comment the parser keeps content from does not hide the
      // parameters next to it.
      const diagnostics = strictMacroDefinition.test(content)

      expect(diagnostics).toHaveLength(1)
      expect(diagnostics[0].message).toEqual(`Param 'va r2' cannot have space`)
    })

    it('should read a comment marker inside a quoted default as text', () => {
      const content = `%macro m(a = '/*', va r2);`

      // The quote makes those two characters data, so nothing opens a comment and
      // the parameter after them is still in the list.
      expect(strictMacroDefinition.test(content)).toEqual([
        {
          message: `Param 'va r2' cannot have space`,
          lineNumber: 1,
          startColumnNumber: 20,
          endColumnNumber: 24,
          severity: Severity.Warning
        }
      ])
    })

    it('should not report a nested call comma as a parameter separator', () => {
      const content = `%macro m(a=%sysfunc(catx(,x y,z)), b);`

      // The commas inside catx belong to the value: `x y` is an argument, not a
      // parameter, and used to read as one.
      expect(strictMacroDefinition.test(content)).toEqual([])
    })

    it('should report an option when the parameter list never closes', () => {
      const content = `%macro m(a = 1 /* x
*/ /badoption;`

      // The comment's content is not part of the declaration (#274), and with the
      // comment-marker guard gone the options after the unclosed list are read
      // like any other: the invalid one is reported.
      expect(strictMacroDefinition.test(content)).toEqual([
        {
          message: `Option 'badoption' is not valid`,
          lineNumber: 2,
          startColumnNumber: 5,
          endColumnNumber: 13,
          severity: Severity.Warning
        }
      ])
    })

    it('should report options in a declaration whose comment spans lines', () => {
      const content = `%macro m(
  a = 1 /* first
  second */
)/invalidoption;`

      // The parser reports the declaration with the comment removed (#274), so
      // the options pass reads real text: the coverage loss this rule used to
      // carry for commented declarations is gone.
      expect(strictMacroDefinition.test(content)).toEqual([
        {
          message: `Option 'invalidoption' is not valid`,
          lineNumber: 4,
          startColumnNumber: 3,
          endColumnNumber: 15,
          severity: Severity.Warning
        }
      ])
    })

    it('should report an option after a list whose quoted value holds a marker', () => {
      const content = `%macro m(a = '/*')/badoption;`

      // The marker sits inside a quoted value, so it is data: the options after
      // the list are still read and the invalid one is reported.
      expect(strictMacroDefinition.test(content)).toEqual([
        {
          message: `Option 'badoption' is not valid`,
          lineNumber: 1,
          startColumnNumber: 20,
          endColumnNumber: 28,
          severity: Severity.Warning
        }
      ])
    })

    it('should read options after a list whose option value holds a parenthesis', () => {
      const content = `%macro m(a)/secure des = 'Run %m(HELP) for help.';`

      // The list ends at its own `)`, so the options text is not cut short by the
      // parenthesis inside the quoted value, and every option is valid.
      expect(strictMacroDefinition.test(content)).toEqual([])
    })

    it('should not throw on a declaration whose comment never closes', () => {
      const content = `%macro m(a /* note);`

      expect(strictMacroDefinition.test(content)).toEqual([])
    })

    it('should not throw when the parameter list never closes', () => {
      const content = `%macro m(a = 1;`

      expect(strictMacroDefinition.test(content)).toEqual([])
    })
  })

  describe('multi-content macro declarations', () => {
    it('should return an empty array when the content has correct macro definition syntax', () => {
      const content = `%macro mp_ds2cards(base_ds=, tgt_ds=\n    ,cards_file="%sysfunc(pathname(work))/cardgen.sas"\n    ,maxobs=max\n    ,random_sample=NO\n    ,showlog=YES\n    ,outencoding=\n    ,append=NO\n)/*/STORE SOURCE*/;`
      expect(strictMacroDefinition.test(content)).toEqual([])

      const content2 = `%macro mm_createapplication(\n    tree=/User Folders/sasdemo\n    ,name=myApp\n    ,ClassIdentifier=mcore\n    ,desc=Created by mm_createapplication\n    ,params= param1=1&#x0a;param2=blah\n    ,version=\n    ,frefin=mm_in\n    ,frefout=mm_out\n    ,mDebug=1\n    );`
      expect(strictMacroDefinition.test(content2)).toEqual([])
    })

    it('should return an array with a single diagnostic when Macro definition has space in param', () => {
      const content = `%macro 
       somemacro(va r1);`
      expect(strictMacroDefinition.test(content)).toEqual([
        {
          message: `Param 'va r1' cannot have space`,
          lineNumber: 2,
          startColumnNumber: 18,
          endColumnNumber: 22,
          severity: Severity.Warning
        }
      ])
    })

    it('should return an array with a two diagnostics when Macro definition has space in params', () => {
      const content = `%macro somemacro(
      var1, 
      var 2, 
      v ar3, 
      var4);`
      expect(strictMacroDefinition.test(content)).toEqual([
        {
          message: `Param 'var 2' cannot have space`,
          lineNumber: 3,
          startColumnNumber: 7,
          endColumnNumber: 11,
          severity: Severity.Warning
        },
        {
          message: `Param 'v ar3' cannot have space`,
          lineNumber: 4,
          startColumnNumber: 7,
          endColumnNumber: 11,
          severity: Severity.Warning
        }
      ])
    })

    it('should return an array with a two diagnostics when Macro definition has space in params - special case', () => {
      const content = `%macro macroName( 
      arr, 
      ar r/* / store source */ 3 
      ) /* / store source */;/* / store source */`
      expect(strictMacroDefinition.test(content)).toEqual([
        {
          message: `Param 'ar r 3' cannot have space`,
          lineNumber: 3,
          startColumnNumber: 7,
          endColumnNumber: 32,
          severity: Severity.Warning
        }
      ])
    })

    it('should return an array with a single diagnostic when Macro definition has invalid option', () => {
      const content = `%macro somemacro(var1, var2)
      /minXoperator;`
      expect(strictMacroDefinition.test(content)).toEqual([
        {
          message: `Option 'minXoperator' is not valid`,
          lineNumber: 2,
          startColumnNumber: 8,
          endColumnNumber: 19,
          severity: Severity.Warning
        }
      ])
    })

    it('should return an array with a two diagnostics when Macro definition has invalid options', () => {
      const content = `%macro 
           somemacro(
             var1, var2
             )
           / store   
               invalidoption   
               secure ;`
      expect(strictMacroDefinition.test(content)).toEqual([
        {
          message: `Option 'invalidoption' is not valid`,
          lineNumber: 6,
          startColumnNumber: 16,
          endColumnNumber: 28,
          severity: Severity.Warning
        }
      ])
    })
  })
})
