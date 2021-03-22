import { LintConfig } from '../types/LintConfig'
import { getLintConfig } from './getLintConfig'

describe('getLintConfig', () => {
  it('should get the lint config', async () => {
    const config = await getLintConfig()

    expect(config).toBeInstanceOf(LintConfig)
  })
})
