import * as fileModule from '@sasjs/utils/file'
import { readFileSync } from 'fs'
import { join } from 'path'
import { LintConfig } from '../types/LintConfig'
import { DefaultLintConfiguration, getLintConfig } from './getLintConfig'

const expectedFileLintRulesCount = 7
const expectedLineLintRulesCount = 6
const expectedPathLintRulesCount = 2

describe('getLintConfig', () => {
  it('should get the lint config', async () => {
    const config = await getLintConfig()

    expect(config).toBeInstanceOf(LintConfig)
  })

  it('should get the default config when a .sasjslint file is unavailable', async () => {
    jest
      .spyOn(fileModule, 'readFile')
      .mockImplementationOnce(() => Promise.reject())

    const config = await getLintConfig()

    expect(config).toBeInstanceOf(LintConfig)
    expect(config.fileLintRules.length).toEqual(expectedFileLintRulesCount)
    expect(config.lineLintRules.length).toEqual(expectedLineLintRulesCount)
    expect(config.pathLintRules.length).toEqual(expectedPathLintRulesCount)
  })
})

describe('DefaultLintConfiguration', () => {
  it('should list every setting the configuration reads', () => {
    const accessed = new Set<string>()
    const probe = new Proxy(
      {},
      {
        get: (_target, key) => {
          if (typeof key !== 'string') {
            return undefined
          }

          accessed.add(key)

          // Values that let the constructor take every branch, so the probe
          // also sees the settings that are only read conditionally.
          switch (key) {
            case 'allowedGremlins':
            case 'ignoreList':
              return []
            case 'requiredMacroOptions':
              return ['probe']
            case 'severityLevel':
              return {}
            case 'lineEndings':
              return 'off'
            default:
              return 1
          }
        }
      }
    )

    new LintConfig(probe as any)

    // `noTabIndentation` is the documented alias of `noTabs`, so the default
    // configuration carries the canonical name only.
    const settings = [...accessed].filter((key) => key !== 'noTabIndentation')

    expect(settings.sort()).toEqual(
      Object.keys(DefaultLintConfiguration).sort()
    )
  })

  it('should match the example in the README', () => {
    const readme = readFileSync(
      join(__dirname, '..', '..', 'README.md'),
      'utf-8'
    )
    const block = readme.match(
      /these are also the defaults[^\n]*\n\n```json\n([\s\S]*?)\n```/
    )

    expect(block).not.toBeNull()
    expect(JSON.parse(block![1])).toEqual(DefaultLintConfiguration)
  })

  it('should match the default in the schema', () => {
    const schema = JSON.parse(
      readFileSync(
        join(__dirname, '..', '..', 'sasjslint-schema.json'),
        'utf-8'
      )
    )

    expect(schema.default).toEqual(DefaultLintConfiguration)
  })

  it('should apply the same rules whether or not a .sasjslint file exists', () => {
    const ruleNames = (config: LintConfig) =>
      [
        ...config.fileLintRules.map((rule) => rule.name),
        ...config.lineLintRules.map((rule) => rule.name),
        ...config.pathLintRules.map((rule) => rule.name)
      ].sort()

    expect(ruleNames(new LintConfig({}))).toEqual(
      ruleNames(new LintConfig(DefaultLintConfiguration))
    )
  })

  it('should accept the documented defaults with hasRequiredMacroOptions enabled', () => {
    expect(
      () =>
        new LintConfig({
          ...DefaultLintConfiguration,
          hasRequiredMacroOptions: true
        })
    ).not.toThrow()
  })
})
