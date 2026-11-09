import { LintConfig } from '../types/LintConfig'
import { Severity } from '../types/Severity'
import { getSeverity } from './getSeverity'

describe('getSeverity', () => {
  it('should fall back to the built-in severity when there is no configuration', () => {
    expect(
      getSeverity(undefined, 'noTrailingSpaces', Severity.Warning)
    ).toEqual(Severity.Warning)
  })

  it('should fall back to the built-in severity when the rule has no entry', () => {
    const config = new LintConfig({})

    expect(getSeverity(config, 'noTrailingSpaces', Severity.Warning)).toEqual(
      Severity.Warning
    )
    expect(getSeverity(config, 'noEncodedPasswords', Severity.Error)).toEqual(
      Severity.Error
    )
  })

  it('should prefer the rule entry over the default', () => {
    const config = new LintConfig({
      severityLevel: { default: 'error', noTrailingSpaces: 'warn' }
    })

    expect(getSeverity(config, 'noTrailingSpaces', Severity.Warning)).toEqual(
      Severity.Warning
    )
  })

  it('should prefer the default over the built-in severity', () => {
    const config = new LintConfig({ severityLevel: { default: 'error' } })

    expect(getSeverity(config, 'noTrailingSpaces', Severity.Warning)).toEqual(
      Severity.Error
    )
    expect(getSeverity(config, 'someRuleAddedLater', Severity.Warning)).toEqual(
      Severity.Error
    )
  })

  it('should apply a warn default to a rule that is an error by default', () => {
    const config = new LintConfig({ severityLevel: { default: 'warn' } })

    expect(getSeverity(config, 'noEncodedPasswords', Severity.Error)).toEqual(
      Severity.Warning
    )
  })
})
