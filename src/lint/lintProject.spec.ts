import { lintProject } from './lintProject'
import { Severity } from '../types/Severity'
import * as getProjectRootModule from '../utils/getProjectRoot'
import path from 'path'
import { createFolder, createFile, readFile, deleteFolder } from '@sasjs/utils'
import { DefaultLintConfiguration } from '../utils'
jest.mock('../utils/getProjectRoot')

const expectedFilesCount = 1
const expectedDiagnostics = [
  {
    message: 'Line contains trailing spaces',
    lineNumber: 1,
    startColumnNumber: 1,
    endColumnNumber: 2,
    severity: Severity.Warning
  },
  {
    message: 'Line contains trailing spaces',
    lineNumber: 2,
    startColumnNumber: 1,
    endColumnNumber: 2,
    severity: Severity.Warning
  },
  {
    message: 'File name contains spaces',
    lineNumber: 1,
    startColumnNumber: 1,
    endColumnNumber: 1,
    severity: Severity.Warning
  },
  {
    message: 'File name contains uppercase characters',
    lineNumber: 1,
    startColumnNumber: 1,
    endColumnNumber: 1,
    severity: Severity.Warning
  },
  {
    message: 'File missing Doxygen header',
    lineNumber: 1,
    startColumnNumber: 1,
    endColumnNumber: 1,
    severity: Severity.Warning
  },
  {
    message: 'Line contains encoded password',
    lineNumber: 5,
    startColumnNumber: 10,
    endColumnNumber: 18,
    severity: Severity.Error
  },
  {
    message: 'Line contains tab indentation',
    lineNumber: 7,
    startColumnNumber: 1,
    endColumnNumber: 2,
    severity: Severity.Warning
  },
  {
    message: 'Line has incorrect indentation - 3 spaces',
    lineNumber: 6,
    startColumnNumber: 1,
    endColumnNumber: 1,
    severity: Severity.Warning
  },
  {
    message: '%mend statement is missing macro name - mf_getuniquelibref',
    lineNumber: 17,
    startColumnNumber: 3,
    endColumnNumber: 9,
    severity: Severity.Warning
  }
]

describe('lintProject', () => {
  it('should identify lint issues in a given project', async () => {
    await createFolder(path.join(__dirname, 'lint-project-test'))
    const content = await readFile(
      path.join(__dirname, '..', 'Example File.sas')
    )
    await createFile(
      path.join(__dirname, 'lint-project-test', 'Example File.sas'),
      content
    )
    await createFile(
      path.join(__dirname, 'lint-project-test', '.sasjslint'),
      JSON.stringify(DefaultLintConfiguration)
    )

    jest
      .spyOn(getProjectRootModule, 'getProjectRoot')
      .mockImplementation(() =>
        Promise.resolve(path.join(__dirname, 'lint-project-test'))
      )
    const results = await lintProject()

    expect(results.size).toEqual(expectedFilesCount)
    const diagnostics = results.get(
      path.join(__dirname, 'lint-project-test', 'Example File.sas')
    )!
    expect(diagnostics.length).toEqual(expectedDiagnostics.length)
    expect(diagnostics).toContainEqual(expectedDiagnostics[0])
    expect(diagnostics).toContainEqual(expectedDiagnostics[1])
    expect(diagnostics).toContainEqual(expectedDiagnostics[2])
    expect(diagnostics).toContainEqual(expectedDiagnostics[3])
    expect(diagnostics).toContainEqual(expectedDiagnostics[4])
    expect(diagnostics).toContainEqual(expectedDiagnostics[5])
    expect(diagnostics).toContainEqual(expectedDiagnostics[6])
    expect(diagnostics).toContainEqual(expectedDiagnostics[7])
    expect(diagnostics).toContainEqual(expectedDiagnostics[8])

    await deleteFolder(path.join(__dirname, 'lint-project-test'))
  })

  it('should throw an error when a project root is not found', async () => {
    jest
      .spyOn(getProjectRootModule, 'getProjectRoot')
      .mockImplementationOnce(() => Promise.resolve(''))

    await expect(lintProject()).rejects.toThrowError(
      'SASjs Project Root was not found.'
    )
  })
})
