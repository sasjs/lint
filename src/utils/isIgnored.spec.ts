import path from 'path'
import * as fileModule from '@sasjs/utils/file'
import * as getLintConfigModule from './getLintConfig'
import { getProjectRoot, DefaultLintConfiguration, isIgnored } from '.'
import { LintConfig } from '../types'

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

    const projectRoot = await getProjectRoot()
    const pathToTest = path.join(projectRoot, 'sasjs')

    const ignored = await isIgnored(pathToTest)

    expect(ignored).toBeTruthy()
  })

  it('should return true if top level path of provided path is in .gitignore', async () => {
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
      .mockImplementationOnce(async () => 'sasjs/common')

    const projectRoot = await getProjectRoot()
    const pathToTest = path.join(projectRoot, 'sasjs/common/init/init.sas')

    const ignored = await isIgnored(pathToTest)

    expect(ignored).toBeTruthy()
  })

  it('should return true if provided path matches any pattern from ignoreList (.sasjslint)', async () => {
    jest
      .spyOn(fileModule, 'fileExists')
      .mockImplementationOnce(async () => false)

    const projectRoot = await getProjectRoot()
    const pathToTest = path.join(projectRoot, 'sasjs')

    const ignored = await isIgnored(
      pathToTest,
      new LintConfig({
        ...DefaultLintConfiguration,
        ignoreList: ['sasjs']
      })
    )

    expect(ignored).toBeTruthy()
  })

  it('should return true if top level path of provided path is in ignoreList (.sasjslint)', async () => {
    jest
      .spyOn(fileModule, 'fileExists')
      .mockImplementationOnce(async () => false)

    const projectRoot = await getProjectRoot()
    const pathToTest = path.join(projectRoot, 'sasjs/common/init/init.sas')

    const ignored = await isIgnored(
      pathToTest,
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

    const projectRoot = await getProjectRoot()
    const pathToTest = path.join(projectRoot, 'sasjs')

    const ignored = await isIgnored(
      pathToTest,
      new LintConfig(DefaultLintConfiguration)
    )

    expect(ignored).toBeFalsy()
  })

  it('should return false if provided path is equal to projectRoot', async () => {
    const projectRoot = await getProjectRoot()
    const pathToTest = path.join(projectRoot, '')

    const ignored = await isIgnored(
      pathToTest,
      new LintConfig(DefaultLintConfiguration)
    )

    expect(ignored).toBeFalsy()
  })
})
