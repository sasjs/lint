import { LintConfig, Severity } from '../../types'
import { strictMacroDefinition } from './strictMacroDefinition'

describe('strictMacroDefinition', () => {
  it('should return an empty array when the line has correct macro definition syntax', () => {
    const line = '%macro somemacro;'
    expect(strictMacroDefinition.test(line, 1)).toEqual([])

    const line2 = '%macro somemacro();'
    expect(strictMacroDefinition.test(line2, 1)).toEqual([])

    const line3 = '%macro somemacro(var1);'
    expect(strictMacroDefinition.test(line3, 1)).toEqual([])

    const line4 = '%macro somemacro/minoperator;'
    expect(strictMacroDefinition.test(line4, 1)).toEqual([])

    const line5 = '%macro somemacro /minoperator;'
    expect(strictMacroDefinition.test(line5, 1)).toEqual([])

    const line6 = '%macro somemacro(var1, var2)/minoperator;'
    expect(strictMacroDefinition.test(line6, 1)).toEqual([])

    const line7 =
      ' /* Some Comment */ %macro somemacro(var1, var2) /minoperator ; /* Some Comment */'
    expect(strictMacroDefinition.test(line7, 1)).toEqual([])

    const line8 =
      '%macro macroName( arr, arr/* / store source */3 ) /* / store source */;/* / store source */'
    expect(strictMacroDefinition.test(line8, 1)).toEqual([])

    const line9 = '%macro macroName(var1, var2=with space, var3=);'
    expect(strictMacroDefinition.test(line9, 1)).toEqual([])

    const line10 = '%macro macroName()/ /* some comment */ store source;'
    expect(strictMacroDefinition.test(line10, 1)).toEqual([])

    const line11 = '`%macro macroName() /* / store source */;'
    expect(strictMacroDefinition.test(line11, 1)).toEqual([])
  })

  it('should return an array with a single diagnostic when Macro definition has space in param', () => {
    const line = '%macro somemacro(va r1);'
    expect(strictMacroDefinition.test(line, 1)).toEqual([
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
    const line = '%macro somemacro(var1, var 2, v ar3, var4);'
    expect(strictMacroDefinition.test(line, 1)).toEqual([
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
    const line =
      '%macro macroName( arr, ar r/* / store source */ 3 ) /* / store source */;/* / store source */'
    expect(strictMacroDefinition.test(line, 1)).toEqual([
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
    const line = '%macro somemacro(var1, var2)/minXoperator;'
    expect(strictMacroDefinition.test(line, 1)).toEqual([
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
    const line =
      '%macro somemacro(var1, var2)/ store   invalidoption   secure ;'
    expect(strictMacroDefinition.test(line, 1)).toEqual([
      {
        message: `Option 'invalidoption' is not valid`,
        lineNumber: 1,
        startColumnNumber: 39,
        endColumnNumber: 51,
        severity: Severity.Warning
      }
    ])
  })
})
