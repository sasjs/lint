import * as fileModule from '@sasjs/utils/file'
import * as getProjectRootModule from './getProjectRoot'
import * as getLintConfigModule from './getLintConfig'
import { DefaultLintConfiguration } from './getLintConfig'
import { LintConfig } from '../types'
import { isIgnored } from './isIgnored'

describe('isIgnored', () => {
  it('should return true if provided path matches the patterns from .gitignore', async () => {
    jest
      .spyOn(getLintConfigModule, 'getLintConfig')
      .mockImplementationOnce(
        async () => new LintConfig(DefaultLintConfiguration)
      )
    jest
      .spyOn(fileModule, 'fileExists')
      .mockImplementationOnce(async () => true)

    jest
      .spyOn(fileModule, 'readFile')
      .mockImplementationOnce(async () => 'sasjs')

    jest
      .spyOn(getProjectRootModule, 'getProjectRoot')
      .mockImplementationOnce(async () => '')

    const ignored = await isIgnored('sasjs')

    expect(ignored).toBeTruthy()
  })

  it('should return true if provided path matches any pattern from ignoreList (.sasjslint)', async () => {
    jest
      .spyOn(fileModule, 'fileExists')
      .mockImplementationOnce(async () => false)

    jest
      .spyOn(getProjectRootModule, 'getProjectRoot')
      .mockImplementationOnce(async () => '')

    const ignored = await isIgnored(
      'sasjs',
      new LintConfig({
        ...DefaultLintConfiguration,
        ignoreList: ['sasjs']
      })
    )

    expect(ignored).toBeTruthy()
  })

  it('should return false if provided path does not matches any pattern from .gitignore and ignoreList (.sasjslint)', async () => {
    jest
      .spyOn(fileModule, 'fileExists')
      .mockImplementationOnce(async () => true)

    jest.spyOn(fileModule, 'readFile').mockImplementationOnce(async () => '')

    jest
      .spyOn(getProjectRootModule, 'getProjectRoot')
      .mockImplementationOnce(async () => '')

    const ignored = await isIgnored(
      'sasjs',
      new LintConfig(DefaultLintConfiguration)
    )

    expect(ignored).toBeFalsy()
  })

  it('should return false if provided path is equal to projectRoot', async () => {
    jest
      .spyOn(getProjectRootModule, 'getProjectRoot')
      .mockImplementationOnce(async () => '')

    const ignored = await isIgnored(
      '',
      new LintConfig(DefaultLintConfiguration)
    )

    expect(ignored).toBeFalsy()
  })
})
