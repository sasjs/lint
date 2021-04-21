import { formatFile } from './formatFile'
import path from 'path'
import { createFile, deleteFile, readFile } from '@sasjs/utils/file'
import { LintConfig } from '../types'

describe('formatFile', () => {
  it('should fix linting issues in a given file', async () => {
    const content = `%macro somemacro();  \n%put 'hello';\n%mend;`
    const expectedContent = `/**\n  @file\n  @brief <Your brief here>\n  <h4> SAS Macros </h4>\n**/\n%macro somemacro();\n%put 'hello';\n%mend somemacro;`
    await createFile(path.join(__dirname, 'format-file-test.sas'), content)

    await formatFile(path.join(__dirname, 'format-file-test.sas'))
    const result = await readFile(path.join(__dirname, 'format-file-test.sas'))

    expect(result).toEqual(expectedContent)

    await deleteFile(path.join(__dirname, 'format-file-test.sas'))
  })

  it('should use the provided config if available', async () => {
    const content = `%macro somemacro();  \n%put 'hello';\n%mend;`
    const expectedContent = `/**\r\n  @file\r\n  @brief <Your brief here>\r\n  <h4> SAS Macros </h4>\r\n**/\r\n%macro somemacro();\r\n%put 'hello';\r\n%mend somemacro;`
    await createFile(path.join(__dirname, 'format-file-config.sas'), content)

    await formatFile(
      path.join(__dirname, 'format-file-config.sas'),
      new LintConfig({
        lineEndings: 'crlf',
        hasMacroNameInMend: true,
        hasDoxygenHeader: true,
        noTrailingSpaces: true
      })
    )
    const result = await readFile(
      path.join(__dirname, 'format-file-config.sas')
    )

    expect(result).toEqual(expectedContent)

    await deleteFile(path.join(__dirname, 'format-file-config.sas'))
  })
})
