import { LintConfig } from './LintConfig'
import { LintRuleType } from './LintRuleType'

describe('LintConfig', () => {
  it('should create an empty instance', () => {
    const config = new LintConfig()

    expect(config).toBeTruthy()
    expect(config.fileLintRules.length).toEqual(0)
    expect(config.lineLintRules.length).toEqual(0)
  })

  it('should create an instance with the noTrailingSpaces flag set', () => {
    const config = new LintConfig({ noTrailingSpaces: true })

    expect(config).toBeTruthy()
    expect(config.lineLintRules.length).toEqual(1)
    expect(config.lineLintRules[0].name).toEqual('noTrailingSpaces')
    expect(config.lineLintRules[0].type).toEqual(LintRuleType.Line)
    expect(config.fileLintRules.length).toEqual(0)
  })

  it('should create an instance with the noEncodedPasswords flag set', () => {
    const config = new LintConfig({ noEncodedPasswords: true })

    expect(config).toBeTruthy()
    expect(config.lineLintRules.length).toEqual(1)
    expect(config.lineLintRules[0].name).toEqual('noEncodedPasswords')
    expect(config.lineLintRules[0].type).toEqual(LintRuleType.Line)
    expect(config.fileLintRules.length).toEqual(0)
  })

  it('should create an instance with the hasDoxygenHeader flag set', () => {
    const config = new LintConfig({ hasDoxygenHeader: true })

    expect(config).toBeTruthy()
    expect(config.lineLintRules.length).toEqual(0)
    expect(config.fileLintRules.length).toEqual(1)
    expect(config.fileLintRules[0].name).toEqual('hasDoxygenHeader')
    expect(config.fileLintRules[0].type).toEqual(LintRuleType.File)
  })

  it('should create an instance with the hasMacroNameInMend flag set', () => {
    const config = new LintConfig({ hasMacroNameInMend: true })

    expect(config).toBeTruthy()
    expect(config.lineLintRules.length).toEqual(0)
    expect(config.fileLintRules.length).toEqual(1)
    expect(config.fileLintRules[0].name).toEqual('hasMacroNameInMend')
    expect(config.fileLintRules[0].type).toEqual(LintRuleType.File)
  })

  it('should create an instance with the hasMacroNameInMend flag off', () => {
    const config = new LintConfig({ hasMacroNameInMend: false })

    expect(config).toBeTruthy()
    expect(config.lineLintRules.length).toEqual(0)
    expect(config.fileLintRules.length).toEqual(0)
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
      hasMacroNameInMend: true
    })

    expect(config).toBeTruthy()
    expect(config.lineLintRules.length).toEqual(5)
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

    expect(config.fileLintRules.length).toEqual(2)
    expect(config.fileLintRules[0].name).toEqual('hasDoxygenHeader')
    expect(config.fileLintRules[0].type).toEqual(LintRuleType.File)
    expect(config.fileLintRules[1].name).toEqual('hasMacroNameInMend')
    expect(config.fileLintRules[1].type).toEqual(LintRuleType.File)

    expect(config.pathLintRules.length).toEqual(2)
    expect(config.pathLintRules[0].name).toEqual('noSpacesInFileNames')
    expect(config.pathLintRules[0].type).toEqual(LintRuleType.Path)
    expect(config.pathLintRules[1].name).toEqual('lowerCaseFileNames')
    expect(config.pathLintRules[1].type).toEqual(LintRuleType.Path)
  })
})
