import { LintConfig } from '../../types'
import { Severity } from '../../types/Severity'
import { noUnusedLibnames } from './noUnusedLibnames'

const text = `libname outData "&dirOut.";\n%mf_trim()`

const expectedMessage = `Libref 'outData' is assigned but never used in this file - remove the LIBNAME statement, or list the libref in 'ignoredLibnames'`

describe('noUnusedLibnames', () => {
  it('should be off by default', () => {
    const config = new LintConfig({})

    expect(
      config.fileLintRules.find((rule) => rule.name === 'noUnusedLibnames')
    ).toBeUndefined()
  })

  it('should be enabled by the setting', () => {
    const config = new LintConfig({ noUnusedLibnames: true })

    expect(
      config.fileLintRules.find((rule) => rule.name === 'noUnusedLibnames')
    ).toBeTruthy()
  })

  it('should report an unused libref at its assignment', () => {
    const config = new LintConfig({ noUnusedLibnames: true })

    expect(noUnusedLibnames.test(text, config)).toEqual([
      {
        message: expectedMessage,
        lineNumber: 1,
        startColumnNumber: 9,
        endColumnNumber: 16,
        severity: Severity.Warning
      }
    ])
  })

  it('should not report a libref listed in ignoredLibnames', () => {
    const config = new LintConfig({
      noUnusedLibnames: true,
      ignoredLibnames: ['outData']
    })

    expect(noUnusedLibnames.test(text, config)).toEqual([])
  })

  it('should match the ignore list case insensitively', () => {
    const config = new LintConfig({
      noUnusedLibnames: true,
      ignoredLibnames: ['OUTDATA']
    })

    expect(noUnusedLibnames.test(text, config)).toEqual([])
  })

  it('should report each unused libref', () => {
    const config = new LintConfig({ noUnusedLibnames: true })

    expect(
      noUnusedLibnames.test(`libname a "x";\nlibname b "y";`, config)
    ).toEqual([
      {
        message: expectedMessage.replace('outData', 'a'),
        lineNumber: 1,
        startColumnNumber: 9,
        endColumnNumber: 10,
        severity: Severity.Warning
      },
      {
        message: expectedMessage.replace('outData', 'b'),
        lineNumber: 2,
        startColumnNumber: 9,
        endColumnNumber: 10,
        severity: Severity.Warning
      }
    ])
  })

  it('should honour a severity level', () => {
    const config = new LintConfig({
      noUnusedLibnames: true,
      severityLevel: { noUnusedLibnames: 'error' }
    })

    expect(noUnusedLibnames.test(text, config)[0].severity).toEqual(
      Severity.Error
    )
  })

  it('should have no fix', () => {
    expect(noUnusedLibnames.fix).toBeUndefined()
  })

  it('should return nothing for an empty file', () => {
    const config = new LintConfig({ noUnusedLibnames: true })

    expect(noUnusedLibnames.test('', config)).toEqual([])
  })
})
