import { LintConfig, Severity } from '../../types'
import { hasRequiredMacroOptions } from './hasRequiredMacroOptions'

describe('hasRequiredMacroOptions - test', () => {
  it('should return an empty array when the content has the required macro option(s)', () => {
    const content = '%macro somemacro/ SECURE;'
    const config = new LintConfig({
      hasRequiredMacroOptions: true,
      requiredMacroOptions: ['SECURE']
    })
    expect(hasRequiredMacroOptions.test(content, config)).toEqual([])

    const content2 = '%macro somemacro/ SECURE SRC;'
    const config2 = new LintConfig({
      hasRequiredMacroOptions: true,
      requiredMacroOptions: ['SECURE', 'SRC']
    })
    expect(hasRequiredMacroOptions.test(content, config)).toEqual([])

    const content3 = '%macro somemacro/ SECURE SRC;'
    const config3 = new LintConfig({
      hasRequiredMacroOptions: true,
      requiredMacroOptions: ['']
    })
    expect(hasRequiredMacroOptions.test(content, config)).toEqual([])
  })

  it('should return an array with a single diagnostic when Macro does not contain the required option', () => {
    const config = new LintConfig({
      hasRequiredMacroOptions: true,
      requiredMacroOptions: ['SECURE']
    })

    const content = '%macro somemacro(var1, var2)/minXoperator;'
    expect(hasRequiredMacroOptions.test(content, config)).toEqual([
      {
        message: `Macro 'somemacro' does not contain the required option 'SECURE'`,
        lineNumber: 1,
        startColumnNumber: 0,
        endColumnNumber: 0,
        severity: Severity.Warning
      }
    ])

    const content2 = '%macro somemacro(var1, var2)/ SE CURE;'
    expect(hasRequiredMacroOptions.test(content2, config)).toEqual([
      {
        message: `Macro 'somemacro' does not contain the required option 'SECURE'`,
        lineNumber: 1,
        startColumnNumber: 0,
        endColumnNumber: 0,
        severity: Severity.Warning
      }
    ])

    const content3 = '%macro somemacro(var1, var2);'
    expect(hasRequiredMacroOptions.test(content3, config)).toEqual([
      {
        message: `Macro 'somemacro' does not contain the required option 'SECURE'`,
        lineNumber: 1,
        startColumnNumber: 0,
        endColumnNumber: 0,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a two diagnostics when Macro does not contain the required options', () => {
    const config = new LintConfig({
      hasRequiredMacroOptions: true,
      requiredMacroOptions: ['SRC', 'STMT'],
      severityLevel: { hasRequiredMacroOptions: 'warn' }
    })
    const content = '%macro somemacro(var1, var2)/minXoperator;'
    expect(hasRequiredMacroOptions.test(content, config)).toEqual([
      {
        message: `Macro 'somemacro' does not contain the required option 'SRC'`,
        lineNumber: 1,
        startColumnNumber: 0,
        endColumnNumber: 0,
        severity: Severity.Warning
      },
      {
        message: `Macro 'somemacro' does not contain the required option 'STMT'`,
        lineNumber: 1,
        startColumnNumber: 0,
        endColumnNumber: 0,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a one diagnostic when Macro contains 1 of 2 required options', () => {
    const config = new LintConfig({
      hasRequiredMacroOptions: true,
      requiredMacroOptions: ['SRC', 'STMT'],
      severityLevel: { hasRequiredMacroOptions: 'error' }
    })
    const content = '%macro somemacro(var1, var2)/ SRC;'
    expect(hasRequiredMacroOptions.test(content, config)).toEqual([
      {
        message: `Macro 'somemacro' does not contain the required option 'STMT'`,
        lineNumber: 1,
        startColumnNumber: 0,
        endColumnNumber: 0,
        severity: Severity.Error
      }
    ])
  })
})
