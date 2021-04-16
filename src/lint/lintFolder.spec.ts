import { lintFolder } from './lintFolder'
import { Severity } from '../types/Severity'
import path from 'path'

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

describe('lintFolder', () => {
  it('should identify lint issues in a given folder', async () => {
    const results = await lintFolder(path.join(__dirname, '..'))

    expect(results.size).toEqual(expectedFilesCount)
    const diagnostics = results.get(
      path.join(__dirname, '..', 'Example File.sas')
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
  })
})
