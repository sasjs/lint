import { lintFolder } from './lintFolder'
import { Severity } from '../types/Severity'
import path from 'path'
import {
  createFile,
  createFolder,
  deleteFolder,
  readFile
} from '@sasjs/utils/file'

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
    message: 'Line contains a tab character (09x)',
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

describe('lintFolder', () => {
  it('should identify lint issues in a given folder', async () => {
    await createFolder(path.join(__dirname, 'lint-folder-test'))
    const content = await readFile(
      path.join(__dirname, '..', 'Example File.sas')
    )
    await createFile(
      path.join(__dirname, 'lint-folder-test', 'Example File.sas'),
      content
    )
    const results = await lintFolder(path.join(__dirname, 'lint-folder-test'))
    expect(results.size).toEqual(expectedFilesCount)
    const diagnostics = results.get(
      path.join(__dirname, 'lint-folder-test', 'Example File.sas')
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

    await deleteFolder(path.join(__dirname, 'lint-folder-test'))
  })

  it('should identify lint issues in subfolders of a given folder', async () => {
    await createFolder(path.join(__dirname, 'lint-folder-test'))
    await createFolder(path.join(__dirname, 'lint-folder-test', 'subfolder'))
    const content = await readFile(
      path.join(__dirname, '..', 'Example File.sas')
    )
    await createFile(
      path.join(__dirname, 'lint-folder-test', 'subfolder', 'Example File.sas'),
      content
    )
    const results = await lintFolder(path.join(__dirname, 'lint-folder-test'))
    expect(results.size).toEqual(expectedFilesCount)
    const diagnostics = results.get(
      path.join(__dirname, 'lint-folder-test', 'subfolder', 'Example File.sas')
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

    await deleteFolder(path.join(__dirname, 'lint-folder-test'))
  })
})
