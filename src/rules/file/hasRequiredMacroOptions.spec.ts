import { LintConfig, Severity } from '../../types'
import { hasRequiredMacroOptions } from './hasRequiredMacroOptions'

describe('hasRequiredMacroOptions - test', () => {
  it('should return an empty array when the content has the required macro option(s)', () => {
    const contentSecure = '%macro somemacro/ SECURE;'
    const configSecure = new LintConfig({
      hasRequiredMacroOptions: true,
      requiredMacroOptions: ['SECURE']
    })
    expect(hasRequiredMacroOptions.test(contentSecure, configSecure)).toEqual(
      []
    )

    const contentSecureSrc = '%macro somemacro/ SECURE SRC;'
    const configSecureSrc = new LintConfig({
      hasRequiredMacroOptions: true,
      requiredMacroOptions: ['SECURE', 'SRC']
    })
    expect(
      hasRequiredMacroOptions.test(contentSecureSrc, configSecureSrc)
    ).toEqual([])

    const configEmpty = new LintConfig({
      hasRequiredMacroOptions: true,
      requiredMacroOptions: ['']
    })
    expect(hasRequiredMacroOptions.test(contentSecureSrc, configEmpty)).toEqual(
      []
    )
  })

  it('should return an array with a single diagnostic when Macro does not contain the required option', () => {
    const configSecure = new LintConfig({
      hasRequiredMacroOptions: true,
      requiredMacroOptions: ['SECURE']
    })

    const contentMinXOperator = '%macro somemacro(var1, var2)/minXoperator;'
    expect(
      hasRequiredMacroOptions.test(contentMinXOperator, configSecure)
    ).toEqual([
      {
        message: `Macro 'somemacro' does not contain the required option 'SECURE'`,
        lineNumber: 1,
        startColumnNumber: 0,
        endColumnNumber: 0,
        severity: Severity.Warning
      }
    ])

    const contentSecureSplit = '%macro somemacro(var1, var2)/ SE CURE;'
    expect(
      hasRequiredMacroOptions.test(contentSecureSplit, configSecure)
    ).toEqual([
      {
        message: `Macro 'somemacro' does not contain the required option 'SECURE'`,
        lineNumber: 1,
        startColumnNumber: 0,
        endColumnNumber: 0,
        severity: Severity.Warning
      }
    ])

    const contentNoOption = '%macro somemacro(var1, var2);'
    expect(hasRequiredMacroOptions.test(contentNoOption, configSecure)).toEqual(
      [
        {
          message: `Macro 'somemacro' does not contain the required option 'SECURE'`,
          lineNumber: 1,
          startColumnNumber: 0,
          endColumnNumber: 0,
          severity: Severity.Warning
        }
      ]
    )
  })

  it('should return an array with a two diagnostics when Macro does not contain the required options', () => {
    const configSrcStmt = new LintConfig({
      hasRequiredMacroOptions: true,
      requiredMacroOptions: ['SRC', 'STMT'],
      severityLevel: { hasRequiredMacroOptions: 'warn' }
    })
    const contentMinXOperator = '%macro somemacro(var1, var2)/minXoperator;'
    expect(
      hasRequiredMacroOptions.test(contentMinXOperator, configSrcStmt)
    ).toEqual([
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
    const configSrcStmt = new LintConfig({
      hasRequiredMacroOptions: true,
      requiredMacroOptions: ['SRC', 'STMT'],
      severityLevel: { hasRequiredMacroOptions: 'error' }
    })
    const contentSrc = '%macro somemacro(var1, var2)/ SRC;'
    expect(hasRequiredMacroOptions.test(contentSrc, configSrcStmt)).toEqual([
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
