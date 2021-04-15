import { lintProject } from './lintProject'
import { Severity } from '../types/Severity'
import * as utils from '../utils'
import path from 'path'
jest.mock('../utils')

describe('lintProject', () => {
  it('should identify lint issues in a given project', async () => {
    jest
      .spyOn(utils, 'getProjectRoot')
      .mockImplementationOnce(() => Promise.resolve(path.join(__dirname, '..')))
    const results = await lintProject()

    expect(results.size).toEqual(1)
    const diagnostics = results.get(
      path.join(__dirname, '..', 'Example File.sas')
    )!
    expect(diagnostics.length).toEqual(9)
    expect(diagnostics).toContainEqual({
      message: 'Line contains trailing spaces',
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 2,
      severity: Severity.Warning
    })
    expect(diagnostics).toContainEqual({
      message: 'Line contains trailing spaces',
      lineNumber: 2,
      startColumnNumber: 1,
      endColumnNumber: 2,
      severity: Severity.Warning
    })
    expect(diagnostics).toContainEqual({
      message: 'File name contains spaces',
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    })
    expect(diagnostics).toContainEqual({
      message: 'File name contains uppercase characters',
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    })
    expect(diagnostics).toContainEqual({
      message: 'File missing Doxygen header',
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    })
    expect(diagnostics).toContainEqual({
      message: 'Line contains encoded password',
      lineNumber: 5,
      startColumnNumber: 10,
      endColumnNumber: 18,
      severity: Severity.Error
    })
    expect(diagnostics).toContainEqual({
      message: 'Line is indented with a tab',
      lineNumber: 7,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    })
    expect(diagnostics).toContainEqual({
      message: 'Line has incorrect indentation - 3 spaces',
      lineNumber: 6,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    })
    expect(diagnostics).toContainEqual({
      message: '%mend statement is missing macro name - mf_getuniquelibref',
      lineNumber: 17,
      startColumnNumber: 3,
      endColumnNumber: 9,
      severity: 1
    })
  })

  it('should throw an error when a project root is not found', async () => {
    jest
      .spyOn(utils, 'getProjectRoot')
      .mockImplementationOnce(() => Promise.resolve(''))

    await expect(lintProject()).rejects.toThrowError(
      'SASjs Project Root was not found.'
    )
  })
})
