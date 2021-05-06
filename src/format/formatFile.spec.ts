import { formatFile } from './formatFile'
import path from 'path'
import { createFile, deleteFile, readFile } from '@sasjs/utils/file'
import { LintConfig } from '../types'

describe('formatFile', () => {
  it('should fix linting issues in a given file', async () => {
    const content = `%macro somemacro();  \n%put 'hello';\n%mend;`
    const expectedContent = `/**\n  @file\n  @brief <Your brief here>\n  <h4> SAS Macros </h4>\n**/\n%macro somemacro();\n%put 'hello';\n%mend somemacro;`
    await createFile(path.join(__dirname, 'format-file-test.sas'), content)
    const expectedResult = {
      updatedFilePaths: [path.join(__dirname, 'format-file-test.sas')],
      fixedDiagnosticsCount: 3,
      unfixedDiagnostics: []
    }

    const result = await formatFile(
      path.join(__dirname, 'format-file-test.sas')
    )
    const formattedContent = await readFile(
      path.join(__dirname, 'format-file-test.sas')
    )

    expect(result).toEqual(expectedResult)
    expect(formattedContent).toEqual(expectedContent)

    await deleteFile(path.join(__dirname, 'format-file-test.sas'))
  })

  it('should use the provided config if available', async () => {
    const content = `%macro somemacro();  \n%put 'hello';\n%mend;`
    const expectedContent = `/**\r\n  @file\r\n  @brief <Your brief here>\r\n  <h4> SAS Macros </h4>\r\n**/\r\n%macro somemacro();\r\n%put 'hello';\r\n%mend;`
    const expectedResult = {
      updatedFilePaths: [path.join(__dirname, 'format-file-config.sas')],
      fixedDiagnosticsCount: 2,
      unfixedDiagnostics: [
        {
          endColumnNumber: 7,
          lineNumber: 8,
          message: '%mend statement is missing macro name - somemacro',
          severity: 1,
          startColumnNumber: 1
        }
      ]
    }
    await createFile(path.join(__dirname, 'format-file-config.sas'), content)

    const result = await formatFile(
      path.join(__dirname, 'format-file-config.sas'),
      new LintConfig({
        lineEndings: 'crlf',
        hasMacroNameInMend: false,
        hasDoxygenHeader: true,
        noTrailingSpaces: true
      })
    )
    const formattedContent = await readFile(
      path.join(__dirname, 'format-file-config.sas')
    )

    expect(result).toEqual(expectedResult)
    expect(formattedContent).toEqual(expectedContent)

    await deleteFile(path.join(__dirname, 'format-file-config.sas'))
  })

  it('should not update any files if there are no formatting violations', async () => {
    const content = `/**\r\n  @file\r\n  @brief <Your brief here>\r\n  <h4> SAS Macros </h4>\r\n**/\r\n%macro somemacro();\r\n%put 'hello';\r\n%mend somemacro;`
    const expectedResult = {
      updatedFilePaths: [],
      fixedDiagnosticsCount: 0,
      unfixedDiagnostics: []
    }
    await createFile(
      path.join(__dirname, 'format-file-no-violations.sas'),
      content
    )

    const result = await formatFile(
      path.join(__dirname, 'format-file-no-violations.sas'),
      new LintConfig({
        lineEndings: 'crlf',
        hasMacroNameInMend: true,
        hasDoxygenHeader: true,
        noTrailingSpaces: true
      })
    )
    const formattedContent = await readFile(
      path.join(__dirname, 'format-file-no-violations.sas')
    )

    expect(result).toEqual(expectedResult)
    expect(formattedContent).toEqual(content)

    await deleteFile(path.join(__dirname, 'format-file-no-violations.sas'))
  })
})
