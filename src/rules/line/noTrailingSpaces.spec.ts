import { LintConfig } from '../../types/LintConfig'
import { Severity } from '../../types/Severity'
import { noTrailingSpaces } from './noTrailingSpaces'

describe('noTrailingSpaces', () => {
  it('should return an empty array when the line has no trailing spaces', () => {
    const line = "%put 'hello';"
    expect(noTrailingSpaces.test(line, 1)).toEqual([])
  })

  it('should return an array with a single diagnostic when the line has trailing spaces', () => {
    const line = "%put 'hello';  "
    expect(noTrailingSpaces.test(line, 1)).toEqual([
      {
        message: 'Line contains trailing spaces',
        lineNumber: 1,
        startColumnNumber: 14,
        endColumnNumber: 15,
        severity: Severity.Warning
      }
    ])
  })

  it('should report at the default severity when severityLevel.default is set', () => {
    const config = new LintConfig({ severityLevel: { default: 'error' } })
    const line = "%put 'hello';  "

    expect(noTrailingSpaces.test(line, 1, config)[0].severity).toEqual(
      Severity.Error
    )
  })

  it('should keep a rule entry above the default', () => {
    const config = new LintConfig({
      severityLevel: { default: 'error', noTrailingSpaces: 'warn' }
    })
    const line = "%put 'hello';  "

    expect(noTrailingSpaces.test(line, 1, config)[0].severity).toEqual(
      Severity.Warning
    )
  })
})
