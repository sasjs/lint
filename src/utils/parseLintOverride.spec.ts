import { LintConfig } from '../types'
import { applyLintOverride, getLintOverride } from './parseLintOverride'

const withHeader = (line: string) => `/**
  @file
  @brief test
${line}
**/
%mf_trim()`

describe('getLintOverride', () => {
  it('should read an override from a single line', () => {
    expect(
      getLintOverride(
        withHeader('  @sasjslint {"noTabs": false}'),
        new LintConfig()
      )
    ).toEqual({ noTabs: false })
  })

  it('should read an override spread over several lines', () => {
    const text = withHeader(
      '  @sasjslint {\n    "maxLineLength": 200,\n    "noUnusedMacros": false\n  }'
    )

    expect(getLintOverride(text, new LintConfig())).toEqual({
      maxLineLength: 200,
      noUnusedMacros: false
    })
  })

  it('should ignore a brace inside a string', () => {
    const text = withHeader(
      '  @sasjslint {"defaultHeader": "prefix{lineEnding}suffix"}'
    )

    expect(getLintOverride(text, new LintConfig())).toEqual({
      defaultHeader: 'prefix{lineEnding}suffix'
    })
  })

  it('should handle an escaped quote inside a string', () => {
    const text = withHeader('  @sasjslint {"defaultHeader": "a\\"b"}')

    expect(getLintOverride(text, new LintConfig())).toEqual({
      defaultHeader: 'a"b'
    })
  })

  it('should return null when there is no marker', () => {
    expect(
      getLintOverride(withHeader('  @brief x'), new LintConfig())
    ).toBeNull()
  })

  it('should return null when there is no header', () => {
    expect(getLintOverride('%mf_trim()', new LintConfig())).toBeNull()
  })

  it('should return null when there is no text', () => {
    expect(getLintOverride('', new LintConfig())).toBeNull()
  })

  it('should ignore a malformed override', () => {
    expect(
      getLintOverride(withHeader('  @sasjslint {"noTabs": }'), new LintConfig())
    ).toBeNull()
  })

  it('should ignore an unterminated override', () => {
    expect(
      getLintOverride(
        withHeader('  @sasjslint {"noTabs": false'),
        new LintConfig()
      )
    ).toBeNull()
  })

  it('should ignore an override that is not an object', () => {
    expect(
      getLintOverride(withHeader('  @sasjslint ["noTabs"]'), new LintConfig())
    ).toBeNull()
  })

  it('should ignore a marker outside the header', () => {
    const text = `/**
  @file
**/
/* @sasjslint {"noTabs": false} */
%mf_trim()`

    expect(getLintOverride(text, new LintConfig())).toBeNull()
  })
})

describe('applyLintOverride', () => {
  it('should merge the header override over the given configuration', () => {
    const config = new LintConfig({ maxLineLength: 80, noTabs: true })
    const effective = applyLintOverride(
      withHeader('  @sasjslint {"maxLineLength": 200}'),
      config
    )

    expect(effective.maxLineLength).toEqual(200)
    expect(
      effective.lineLintRules.find((rule) => rule.name === 'noTabs')
    ).toBeTruthy()
    expect(config.maxLineLength).toEqual(80)
  })

  it('should return the given configuration when there is no override', () => {
    const config = new LintConfig({})

    expect(applyLintOverride('%mf_trim()', config)).toBe(config)
  })
})
