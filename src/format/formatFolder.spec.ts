import { formatFolder } from './formatFolder'
import path from 'path'
import {
  createFile,
  createFolder,
  deleteFolder,
  readFile
} from '@sasjs/utils/file'
import { Diagnostic, LintConfig } from '../types'

describe('formatFolder', () => {
  it('should fix linting issues in a given folder', async () => {
    const content = `%macro somemacro();  \n%put 'hello';\n%mend;`
    const expectedContent = `/**\n  @file\n  @brief <Your brief here>\n  <h4> SAS Macros </h4>\n**/\n%macro somemacro();\n%put 'hello';\n%mend somemacro;`
    const expectedResult = {
      updatedFilePaths: [
        path.join(__dirname, 'format-folder-test', 'format-folder-test.sas')
      ],
      fixedDiagnosticsCount: 3,
      unfixedDiagnostics: new Map<string, Diagnostic[]>([
        [
          path.join(__dirname, 'format-folder-test', 'format-folder-test.sas'),
          []
        ]
      ])
    }
    await createFolder(path.join(__dirname, 'format-folder-test'))
    await createFile(
      path.join(__dirname, 'format-folder-test', 'format-folder-test.sas'),
      content
    )

    const result = await formatFolder(
      path.join(__dirname, 'format-folder-test')
    )
    const formattedContent = await readFile(
      path.join(__dirname, 'format-folder-test', 'format-folder-test.sas')
    )

    expect(formattedContent).toEqual(expectedContent)
    expect(result).toEqual(expectedResult)

    await deleteFolder(path.join(__dirname, 'format-folder-test'))
  })

  it('should fix linting issues in subfolders of a given folder', async () => {
    const content = `%macro somemacro();  \n%put 'hello';\n%mend;`
    const expectedContent = `/**\n  @file\n  @brief <Your brief here>\n  <h4> SAS Macros </h4>\n**/\n%macro somemacro();\n%put 'hello';\n%mend somemacro;`
    const expectedResult = {
      updatedFilePaths: [
        path.join(
          __dirname,
          'format-folder-test',
          'subfolder',
          'format-folder-test.sas'
        )
      ],
      fixedDiagnosticsCount: 3,
      unfixedDiagnostics: new Map<string, Diagnostic[]>([
        [
          path.join(
            __dirname,
            'format-folder-test',
            'subfolder',
            'format-folder-test.sas'
          ),
          []
        ]
      ])
    }

    await createFolder(path.join(__dirname, 'format-folder-test'))
    await createFolder(path.join(__dirname, 'subfolder'))
    await createFile(
      path.join(
        __dirname,
        'format-folder-test',
        'subfolder',
        'format-folder-test.sas'
      ),
      content
    )

    const result = await formatFolder(
      path.join(__dirname, 'format-folder-test')
    )
    const formattedContent = await readFile(
      path.join(
        __dirname,
        'format-folder-test',
        'subfolder',
        'format-folder-test.sas'
      )
    )

    expect(result).toEqual(expectedResult)
    expect(formattedContent).toEqual(expectedContent)

    await deleteFolder(path.join(__dirname, 'format-folder-test'))
  })

  it('should use a custom configuration when provided', async () => {
    const content = `%macro somemacro();  \n%put 'hello';\n%mend;`
    const expectedContent = `/**\n  @file\n  @brief <Your brief here>\n  <h4> SAS Macros </h4>\n**/\n%macro somemacro();\n%put 'hello';\n%mend somemacro;`
    const expectedResult = {
      updatedFilePaths: [
        path.join(__dirname, 'format-folder-test', 'format-folder-test.sas')
      ],
      fixedDiagnosticsCount: 3,
      unfixedDiagnostics: new Map<string, Diagnostic[]>([
        [
          path.join(__dirname, 'format-folder-test', 'format-folder-test.sas'),
          []
        ]
      ])
    }
    await createFolder(path.join(__dirname, 'format-folder-test'))
    await createFile(
      path.join(__dirname, 'format-folder-test', 'format-folder-test.sas'),
      content
    )

    const result = await formatFolder(
      path.join(__dirname, 'format-folder-test'),
      new LintConfig({
        lineEndings: 'crlf',
        hasMacroNameInMend: false,
        hasDoxygenHeader: true,
        noTrailingSpaces: true
      })
    )
    const formattedContent = await readFile(
      path.join(__dirname, 'format-folder-test', 'format-folder-test.sas')
    )

    expect(formattedContent).toEqual(expectedContent)
    expect(result).toEqual(expectedResult)

    await deleteFolder(path.join(__dirname, 'format-folder-test'))
  })

  it('should fix linting issues in subfolders of a given folder', async () => {
    const content = `%macro somemacro();  \n%put 'hello';\n%mend;`
    const expectedContent = `/**\n  @file\n  @brief <Your brief here>\n  <h4> SAS Macros </h4>\n**/\n%macro somemacro();\n%put 'hello';\n%mend somemacro;`
    const expectedResult = {
      updatedFilePaths: [
        path.join(
          __dirname,
          'format-folder-test',
          'subfolder',
          'format-folder-test.sas'
        )
      ],
      fixedDiagnosticsCount: 3,
      unfixedDiagnostics: new Map<string, Diagnostic[]>([
        [
          path.join(
            __dirname,
            'format-folder-test',
            'subfolder',
            'format-folder-test.sas'
          ),
          []
        ]
      ])
    }

    await createFolder(path.join(__dirname, 'format-folder-test'))
    await createFolder(path.join(__dirname, 'subfolder'))
    await createFile(
      path.join(
        __dirname,
        'format-folder-test',
        'subfolder',
        'format-folder-test.sas'
      ),
      content
    )

    const result = await formatFolder(
      path.join(__dirname, 'format-folder-test')
    )
    const formattedContent = await readFile(
      path.join(
        __dirname,
        'format-folder-test',
        'subfolder',
        'format-folder-test.sas'
      )
    )

    expect(result).toEqual(expectedResult)
    expect(formattedContent).toEqual(expectedContent)

    await deleteFolder(path.join(__dirname, 'format-folder-test'))
  })

  it('should not update any files when there are no violations', async () => {
    const content = `/**\n  @file\n  @brief <Your brief here>\n  <h4> SAS Macros </h4>\n**/\n%macro somemacro();\n%put 'hello';\n%mend somemacro;`
    const expectedResult = {
      updatedFilePaths: [],
      fixedDiagnosticsCount: 0,
      unfixedDiagnostics: new Map<string, Diagnostic[]>([
        [
          path.join(__dirname, 'format-folder-test', 'format-folder-test.sas'),
          []
        ]
      ])
    }
    await createFolder(path.join(__dirname, 'format-folder-test'))
    await createFile(
      path.join(__dirname, 'format-folder-test', 'format-folder-test.sas'),
      content
    )

    const result = await formatFolder(
      path.join(__dirname, 'format-folder-test')
    )
    const formattedContent = await readFile(
      path.join(__dirname, 'format-folder-test', 'format-folder-test.sas')
    )

    expect(formattedContent).toEqual(content)
    expect(result).toEqual(expectedResult)

    await deleteFolder(path.join(__dirname, 'format-folder-test'))
  })
})
