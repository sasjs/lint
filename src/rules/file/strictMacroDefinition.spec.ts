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

  describe('multi-content macro declarations', () => {
    it('should return an empty array when the content has correct macro definition syntax', () => {
      const content = `%macro mp_ds2cards(base_ds=, tgt_ds=\n    ,cards_file="%sysfunc(pathname(work))/cardgen.sas"\n    ,maxobs=max\n    ,random_sample=NO\n    ,showlog=YES\n    ,outencoding=\n    ,append=NO\n)/*/STORE SOURCE*/;`
      expect(strictMacroDefinition.test(content)).toEqual([])
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
