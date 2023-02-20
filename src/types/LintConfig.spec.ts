import { LineEndings } from './LineEndings'
import { LintConfig } from './LintConfig'
import { LintRuleType } from './LintRuleType'
import { Severity } from './Severity'

describe('LintConfig', () => {
  it('should create an instance with default values when no configuration is provided', () => {
    const config = new LintConfig()
    expect(config).toBeTruthy()
  })

  it('should create an instance with the noTrailingSpaces flag off', () => {
    const config = new LintConfig({ noTrailingSpaces: false })

    expect(config).toBeTruthy()
    expect(config.lineLintRules.length).toBeGreaterThan(0)
    expect(config.fileLintRules.length).toBeGreaterThan(0)
    expect(
      config.lineLintRules.find((rule) => rule.name === 'noTrailingSpaces')
    ).toBeUndefined()
  })

  it('should create an instance with the noEncodedPasswords flag off', () => {
    const config = new LintConfig({ noEncodedPasswords: false })

    expect(config).toBeTruthy()
    expect(config.lineLintRules.length).toBeGreaterThan(0)
    expect(config.fileLintRules.length).toBeGreaterThan(0)
    expect(
      config.lineLintRules.find((rule) => rule.name === 'noEncodedPasswords')
    ).toBeUndefined()
  })

  it('should create an instance with the maxLineLength flag off by setting value to 0', () => {
    const config = new LintConfig({ maxLineLength: 0 })

    expect(config).toBeTruthy()
    expect(config.lineLintRules.length).toBeGreaterThan(0)
    expect(config.fileLintRules.length).toBeGreaterThan(0)
    expect(
      config.lineLintRules.find((rule) => rule.name === 'maxLineLength')
    ).toBeUndefined()
  })

  it('should create an instance with the maxLineLength flag off by setting value to a negative number', () => {
    const config = new LintConfig({ maxLineLength: -1 })

    expect(config).toBeTruthy()
    expect(config.lineLintRules.length).toBeGreaterThan(0)
    expect(config.fileLintRules.length).toBeGreaterThan(0)
    expect(
      config.lineLintRules.find((rule) => rule.name === 'maxLineLength')
    ).toBeUndefined()
  })

  it('should create an instance with the hasDoxygenHeader flag off', () => {
    const config = new LintConfig({ hasDoxygenHeader: false })

    expect(config).toBeTruthy()
    expect(config.lineLintRules.length).toBeGreaterThan(0)
    expect(config.fileLintRules.length).toBeGreaterThan(0)
    expect(
      config.fileLintRules.find((rule) => rule.name === 'hasDoxygenHeader')
    ).toBeUndefined()
  })

  it('should create an instance with the hasMacroNameInMend flag off', () => {
    const config = new LintConfig({ hasMacroNameInMend: false })

    expect(config).toBeTruthy()
    expect(config.lineLintRules.length).toBeGreaterThan(0)
    expect(config.fileLintRules.length).toBeGreaterThan(0)
    expect(
      config.fileLintRules.find((rule) => rule.name === 'hasMacroNameInMend')
    ).toBeUndefined()
  })

  it('should create an instance with the noNestedMacros flag off', () => {
    const config = new LintConfig({ noNestedMacros: false })

    expect(config).toBeTruthy()
    expect(config.lineLintRules.length).toBeGreaterThan(0)
    expect(config.fileLintRules.length).toBeGreaterThan(0)
    expect(
      config.fileLintRules.find((rule) => rule.name === 'noNestedMacros')
    ).toBeUndefined()
  })

  it('should create an instance with the hasMacroParentheses flag off', () => {
    const config = new LintConfig({ hasMacroParentheses: false })

    expect(config).toBeTruthy()
    expect(config.lineLintRules.length).toBeGreaterThan(0)
    expect(config.fileLintRules.length).toBeGreaterThan(0)
    expect(
      config.fileLintRules.find((rule) => rule.name === 'hasMacroParentheses')
    ).toBeUndefined()
  })

  it('should create an instance with the indentation multiple set', () => {
    const config = new LintConfig({ indentationMultiple: 5 })

    expect(config).toBeTruthy()
    expect(config.indentationMultiple).toEqual(5)
  })

  it('should create an instance with the indentation multiple turned off', () => {
    const config = new LintConfig({ indentationMultiple: 0 })

    expect(config).toBeTruthy()
    expect(config.indentationMultiple).toEqual(0)
  })

  it('should create an instance with the line endings set to LF', () => {
    const config = new LintConfig({ lineEndings: 'lf' })

    expect(config).toBeTruthy()
    expect(config.lineEndings).toEqual(LineEndings.LF)
  })

  it('should create an instance with the line endings set to CRLF', () => {
    const config = new LintConfig({ lineEndings: 'crlf' })

    expect(config).toBeTruthy()
    expect(config.lineEndings).toEqual(LineEndings.CRLF)
  })

  it('should create an instance with the severityLevel config', () => {
    const config = new LintConfig({
      severityLevel: {
        hasDoxygenHeader: 'warn',
        maxLineLength: 'error',
        noTrailingSpaces: 'error'
      }
    })

    expect(config).toBeTruthy()
    expect(config.severityLevel).toEqual({
      hasDoxygenHeader: Severity.Warning,
      maxLineLength: Severity.Error,
      noTrailingSpaces: Severity.Error
    })
  })

  it('should create an instance with the line endings set to LF by default', () => {
    const config = new LintConfig({})

    expect(config).toBeTruthy()
    expect(config.lineEndings).toEqual(LineEndings.LF)
  })

  it('should throw an error with an invalid value for line endings', () => {
    expect(() => new LintConfig({ lineEndings: 'test' })).toThrowError(
      `Invalid value for lineEndings: can be ${LineEndings.LF} or ${LineEndings.CRLF}`
    )
  })

  it('should create an instance with all flags set', () => {
    const config = new LintConfig({
      noTrailingSpaces: true,
      noEncodedPasswords: true,
      hasDoxygenHeader: true,
      noSpacesInFileNames: true,
      lowerCaseFileNames: true,
      maxLineLength: 80,
      noTabIndentation: true,
      indentationMultiple: 2,
      hasMacroNameInMend: true,
      noNestedMacros: true,
      hasMacroParentheses: true,
      noGremlins: true,
      lineEndings: 'lf'
    })

    expect(config).toBeTruthy()
    expect(config.lineLintRules.length).toEqual(6)
    expect(config.lineLintRules[0].name).toEqual('noTrailingSpaces')
    expect(config.lineLintRules[0].type).toEqual(LintRuleType.Line)
    expect(config.lineLintRules[1].name).toEqual('noEncodedPasswords')
    expect(config.lineLintRules[1].type).toEqual(LintRuleType.Line)
    expect(config.lineLintRules[2].name).toEqual('noTabs')
    expect(config.lineLintRules[2].type).toEqual(LintRuleType.Line)
    expect(config.lineLintRules[3].name).toEqual('maxLineLength')
    expect(config.lineLintRules[3].type).toEqual(LintRuleType.Line)
    expect(config.lineLintRules[4].name).toEqual('indentationMultiple')
    expect(config.lineLintRules[4].type).toEqual(LintRuleType.Line)
    expect(config.lineLintRules[5].name).toEqual('noGremlins')
    expect(config.lineLintRules[5].type).toEqual(LintRuleType.Line)

    expect(config.fileLintRules.length).toEqual(6)
    expect(config.fileLintRules[0].name).toEqual('lineEndings')
    expect(config.fileLintRules[0].type).toEqual(LintRuleType.File)
    expect(config.fileLintRules[1].name).toEqual('hasDoxygenHeader')
    expect(config.fileLintRules[1].type).toEqual(LintRuleType.File)
    expect(config.fileLintRules[2].name).toEqual('hasMacroNameInMend')
    expect(config.fileLintRules[2].type).toEqual(LintRuleType.File)
    expect(config.fileLintRules[3].name).toEqual('noNestedMacros')
    expect(config.fileLintRules[3].type).toEqual(LintRuleType.File)
    expect(config.fileLintRules[4].name).toEqual('hasMacroParentheses')
    expect(config.fileLintRules[4].type).toEqual(LintRuleType.File)
    expect(config.fileLintRules[5].name).toEqual('strictMacroDefinition')
    expect(config.fileLintRules[5].type).toEqual(LintRuleType.File)

    expect(config.pathLintRules.length).toEqual(2)
    expect(config.pathLintRules[0].name).toEqual('noSpacesInFileNames')
    expect(config.pathLintRules[0].type).toEqual(LintRuleType.Path)
    expect(config.pathLintRules[1].name).toEqual('lowerCaseFileNames')
    expect(config.pathLintRules[1].type).toEqual(LintRuleType.Path)
  })
})
