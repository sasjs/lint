import { lintFolder } from './lintFolder'
import { Severity } from '../types/Severity'
import path from 'path'

describe('lintFolder', () => {
  it('should identify lint issues in a given folder', async () => {
    const results = await lintFolder(path.join(__dirname, '..'))

    expect(results.size).toEqual(1)
    const diagnostics = results.get(
      path.join(__dirname, '..', 'Example File.sas')
    )!
    expect(diagnostics.length).toEqual(8)
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
  })
})
