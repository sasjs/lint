import * as fileModule from '@sasjs/utils/file'
import { LintConfig } from '../types/LintConfig'
import { getLintConfig } from './getLintConfig'

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
    expect(config.fileLintRules.length).toEqual(1)
    expect(config.lineLintRules.length).toEqual(4)
    expect(config.pathLintRules.length).toEqual(2)
  })
})
