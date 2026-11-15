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
  // These tests share fixture folders, so each starts from an empty one.
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
    // name.
    const content = `%macro somemacro();  \n%put 'hello';\n%mend;`
    const expectedContent = `/**\r\n  @file\r\n  @brief <Your brief here>\r\n\r\n  <h4> SAS Macros </h4>\r\n\r\n**/\r\n%macro somemacro();\r\n%put 'hello';\r\n%mend;\r\n`
    const expectedResult = {
      updatedFilePaths: [
        path.join(__dirname, 'format-folder-test', 'format-folder-test.sas')
      ],
      // Measured with the configuration this test passes, so every rule it leaves
      // on reports here - the counts and the formatting have to agree.
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
    // A caller formatting a tree supplies the engine; it reaches every file.
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

  it('reports a refusal that is not an Error by its value', async () => {
    // `reprint` is the caller's function: throwing a string is legal, and the
    // message must still carry what was thrown rather than "undefined".
    const folder = path.join(__dirname, 'format-folder-thrown-string-test')
    await createFolder(folder)
    await createFile(path.join(folder, 'a.sas'), 'data a;\nrun;\n')

    const reprint = async () => {
      throw 'engine refused: not an Error'
    }

    await expect(
      formatFolder(folder, new LintConfig({ hasDoxygenHeader: false }), {
        reprint
      })
    ).rejects.toThrow(/engine refused: not an Error/)

    await deleteFolder(folder)
  })

  it('keeps walking the folder when a subfolder fails', async () => {
    // The subfolder catch is what stops one failing branch of the tree from
    // ending the walk around it - so the proof is a second subfolder, sorted
    // after the failing one, whose file still gets formatted.
    const folder = path.join(__dirname, 'format-folder-subfolder-test')
    await createFolder(folder)
    await createFolder(path.join(folder, 'a-bad'))
    await createFolder(path.join(folder, 'z-good'))
    await createFile(path.join(folder, 'a-bad', 'bad.sas'), 'data bad;\nrun;\n')
    // A defect the rules fix, so "the walk reached this file" is observable.
    await createFile(
      path.join(folder, 'z-good', 'good.sas'),
      'data good;   \nrun;   \n'
    )

    const reprint = async (text: string) => {
      if (text.includes('bad')) throw new Error('the engine refused bad.sas')
      return text
    }

    await expect(
      formatFolder(folder, new LintConfig({ hasDoxygenHeader: false }), {
        reprint
      })
    ).rejects.toThrow(/bad\.sas/)

    const good = await readFile(path.join(folder, 'z-good', 'good.sas'))
    expect(good).toEqual('data good;\nrun;\n')

    await deleteFolder(folder)
  })

  it('formats the rest of a folder when the engine refuses one file', async () => {
    // One refusing file must not decide the fate of the rest: the walk finishes
    // and the failure is raised once, naming the file.
    const folder = path.join(__dirname, 'format-folder-failure-test')
    await createFolder(folder)
    // A defect the rules fix, so "the walk reached this file" is observable.
    await createFile(path.join(folder, 'good.sas'), 'data good;   \nrun;   \n')
    await createFile(path.join(folder, 'bad.sas'), 'data bad;\nrun;\n')

    const reprint = async (text: string) => {
      if (text.includes('bad')) throw new Error('the engine refused /bad.sas')
      return text
    }

    // The aggregate is what distinguishes this from a single file's rejection.
    await expect(
      formatFolder(folder, new LintConfig({ hasDoxygenHeader: false }), {
        reprint
      })
    ).rejects.toThrow(/Could not format 1 file/)

    const good = await readFile(path.join(folder, 'good.sas'))
    expect(good).toEqual('data good;\nrun;\n')

    await deleteFolder(folder)
  })
})
