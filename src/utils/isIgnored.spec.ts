import os from 'os'
import path from 'path'
import * as fileModule from '@sasjs/utils/file'
import * as getLintConfigModule from './getLintConfig'
import { DefaultLintConfiguration, isIgnored } from '.'
import { getProjectRoot } from './getProjectRoot'
import { LintConfig } from '../types'

jest.mock('./getProjectRoot')
const mockProjectRoot = getProjectRoot as jest.MockedFunction<
  typeof getProjectRoot
>

describe('isIgnored', () => {
  // getProjectRoot() walks up from process.cwd() looking for `.sasjslint`, so a
  // test that relies on it resolves a different root depending on where the suite
  // runs - inside a mutation sandbox the file being linted and the root found
  // disagree, which is what pinned this suite to cwd. The root is fixed here.
  const projectRoot = path.join(os.tmpdir(), 'lint-isignored-root')

  beforeEach(() => mockProjectRoot.mockResolvedValue(projectRoot))

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

    const pathToTest = path.join(projectRoot, 'sasjs/common/init/init.sas')

    const ignored = await isIgnored(pathToTest)

    expect(ignored).toBeTruthy()
  })

  it('should return true if provided path matches any pattern from ignoreList (.sasjslint)', async () => {
    jest
      .spyOn(fileModule, 'fileExists')
      .mockImplementationOnce(async () => false)

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

    const pathToTest = path.join(projectRoot, 'sasjs')

    const ignored = await isIgnored(
      pathToTest,
      new LintConfig(DefaultLintConfiguration)
    )

    expect(ignored).toBeFalsy()
  })

  it('should return false if provided path is equal to projectRoot', async () => {
    const pathToTest = path.join(projectRoot, '')

    const ignored = await isIgnored(
      pathToTest,
      new LintConfig(DefaultLintConfiguration)
    )

    expect(ignored).toBeFalsy()
  })

  it('should return false when the relative path is still absolute', async () => {
    // two paths on different Windows drives make path.relative return an absolute
    // path, which the `ignore` package rejects; the guard has to catch it here. The
    // mock returns a POSIX absolute path so the branch runs on every platform.
    const spy = jest.spyOn(path, 'relative').mockReturnValue('/abs/file.sas')

    await expect(isIgnored(path.join(projectRoot, 'file.sas'))).resolves.toBe(
      false
    )

    spy.mockRestore()
  })

  it('should return false for a path outside the project root', async () => {
    // the ignore package rejects a path that escapes the root, so a caller that
    // passes one gets false instead of a RangeError
    await expect(isIgnored('/somewhere/else/file.sas')).resolves.toBe(false)
  })
})
