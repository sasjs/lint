import { lintFile } from './lintFile'
import { Severity } from '../types/Severity'
import path from 'path'

const expectedDiagnosticsCount = 9

describe('lintFile', () => {
  it('should identify lint issues in a given file', async () => {
    const results = await lintFile(
      path.join(__dirname, '..', 'Example File.sas')
    )

    expect(results.length).toEqual(expectedDiagnosticsCount)
    expect(results).toContainEqual({
      message: 'Line contains trailing spaces',
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 2,
      severity: Severity.Warning
    })
    expect(results).toContainEqual({
      message: 'Line contains trailing spaces',
      lineNumber: 2,
      startColumnNumber: 1,
      endColumnNumber: 2,
      severity: Severity.Warning
    })
    expect(results).toContainEqual({
      message: 'File name contains spaces',
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    })
    expect(results).toContainEqual({
      message: 'File name contains uppercase characters',
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    })
    expect(results).toContainEqual({
      message: 'File missing Doxygen header',
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    })
    expect(results).toContainEqual({
      message: 'Line contains encoded password',
      lineNumber: 5,
      startColumnNumber: 10,
      endColumnNumber: 18,
      severity: Severity.Error
    })
    expect(results).toContainEqual({
      message: 'Line is indented with a tab',
      lineNumber: 7,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    })
    expect(results).toContainEqual({
      message: 'Line has incorrect indentation - 3 spaces',
      lineNumber: 6,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    })
    expect(results).toContainEqual({
      message: '%mend statement is missing macro name - mf_getuniquelibref',
      lineNumber: 17,
      startColumnNumber: 3,
      endColumnNumber: 9,
      severity: 1
    })
  })
})
