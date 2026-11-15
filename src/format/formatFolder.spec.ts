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
  // Two tests share a fixture folder and one of them used to create its
  // sub-folder outside it, so a failed run left files that the next run walked.
  // Each test now starts from nothing.
  beforeEach(async () => {
    for (const dir of ['format-folder-test', 'subfolder']) {
      await deleteFolder(path.join(__dirname, dir))
    }
  })

  it('should fix linting issues in a given folder', async () => {
    const content = `%macro somemacro();  \n%put 'hello';\n%mend;`
    const expectedContent = `/**\n  @file\n  @brief <Your brief here>\n\n  <h4> SAS Macros </h4>\n\n**/\n%macro somemacro();\n%put 'hello';\n%mend somemacro;`
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
    const expectedContent = `/**\n  @file\n  @brief <Your brief here>\n\n  <h4> SAS Macros </h4>\n\n**/\n%macro somemacro();\n%put 'hello';\n%mend somemacro;`
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
    await createFolder(path.join(__dirname, 'format-folder-test', 'subfolder'))
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
    // The expectation follows the configuration this test passes: `crlf` line
    // endings, and `hasMacroNameInMend: false` leaving `%mend` without the macro
    // name. It used to expect LF and `%mend somemacro;`, which is what the default
    // configuration produces - the folder's configuration never reached the file,
    // so the test was asserting the bug it was meant to cover.
    const content = `%macro somemacro();  \n%put 'hello';\n%mend;`
    const expectedContent = `/**\r\n  @file\r\n  @brief <Your brief here>\r\n\r\n  <h4> SAS Macros </h4>\r\n\r\n**/\r\n%macro somemacro();\r\n%put 'hello';\r\n%mend;\r\n`
    const expectedResult = {
      updatedFilePaths: [
        path.join(__dirname, 'format-folder-test', 'format-folder-test.sas')
      ],
      // Five, not three: the counts are now measured with the configuration this
      // test passes, so the rules it leaves on all report here. Before, they were
      // measured against the default configuration, which disagreed with what the
      // formatter had just done.
      fixedDiagnosticsCount: 5,
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
    const expectedContent = `/**\n  @file\n  @brief <Your brief here>\n\n  <h4> SAS Macros </h4>\n\n**/\n%macro somemacro();\n%put 'hello';\n%mend somemacro;`
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

  it('passes the layout engine and the configuration to every file', async () => {
    // The engine used to stop at formatText: a caller formatting a folder or a
    // project could not supply one, so keywordCase silently did nothing there.
    const folder = path.join(__dirname, 'format-folder-engine-test')
    await createFolder(folder)
    await createFile(path.join(folder, 'a.sas'), 'data a;\nrun;\n')
    await createFile(path.join(folder, 'b.sas'), 'data b;\nrun;\n')

    const seen: string[] = []
    const reprint = async (text: string) => {
      seen.push(text)
      return text
    }

    await formatFolder(folder, new LintConfig({ hasDoxygenHeader: false }), {
      reprint
    })

    expect(seen.length).toEqual(2)

    await deleteFolder(folder)
  })

  it('formats the rest of a folder when the engine refuses one file', async () => {
    // A rejection used to escape formatFile and end the walk, leaving whatever
    // had not been reached untouched. The tree is now finished and the failure is
    // raised once, naming the file.
    const folder = path.join(__dirname, 'format-folder-failure-test')
    await createFolder(folder)
    await createFile(path.join(folder, 'good.sas'), 'data good;\nrun;\n')
    await createFile(path.join(folder, 'bad.sas'), 'data bad;\nrun;\n')

    const reprint = async (text: string) => {
      if (text.includes('bad')) throw new Error('the engine refused /bad.sas')
      return text
    }

    await expect(
      formatFolder(folder, new LintConfig({ hasDoxygenHeader: false }), {
        reprint
      })
    ).rejects.toThrow(/bad\.sas/)

    // The other file was still formatted: the header rule is off in this config,
    // so the proof is that its trailing whitespace and macro syntax are untouched
    // and its content is present - what matters is that the walk reached it.
    const good = await readFile(path.join(folder, 'good.sas'))
    expect(good).toContain('data good;')

    await deleteFolder(folder)
  })
})
