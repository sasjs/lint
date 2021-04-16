import { lintFile } from './lintFile'
import { Severity } from '../types/Severity'
import path from 'path'

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
    message: 'Line is indented with a tab',
    lineNumber: 7,
    startColumnNumber: 1,
    endColumnNumber: 1,
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
    severity: 1
  }
]

describe('lintFile', () => {
  it('should identify lint issues in a given file', async () => {
    const results = await lintFile(
      path.join(__dirname, '..', 'Example File.sas')
    )

    expect(results.length).toEqual(expectedDiagnostics.length)
    expect(results).toContainEqual(expectedDiagnostics[0])
    expect(results).toContainEqual(expectedDiagnostics[1])
    expect(results).toContainEqual(expectedDiagnostics[2])
    expect(results).toContainEqual(expectedDiagnostics[3])
    expect(results).toContainEqual(expectedDiagnostics[4])
    expect(results).toContainEqual(expectedDiagnostics[5])
    expect(results).toContainEqual(expectedDiagnostics[6])
    expect(results).toContainEqual(expectedDiagnostics[7])
    expect(results).toContainEqual(expectedDiagnostics[8])
  })
})
