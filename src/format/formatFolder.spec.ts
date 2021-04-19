import { formatFolder } from './formatFolder'
import path from 'path'
import {
  createFile,
  createFolder,
  deleteFolder,
  readFile
} from '@sasjs/utils/file'

describe('formatFolder', () => {
  it('should fix linting issues in a given folder', async () => {
    const content = `%macro somemacro();  \n%put 'hello';\n%mend;`
    const expectedContent = `/**\n  @file\n  @brief <Your brief here>\n  <h4> SAS Macros </h4>\n**/\n%macro somemacro();\n%put 'hello';\n%mend somemacro;\n`
    await createFolder(path.join(__dirname, 'format-folder-test'))
    await createFile(
      path.join(__dirname, 'format-folder-test', 'format-folder-test.sas'),
      content
    )

    await formatFolder(path.join(__dirname, 'format-folder-test'))
    const result = await readFile(
      path.join(__dirname, 'format-folder-test', 'format-folder-test.sas')
    )

    expect(result).toEqual(expectedContent)

    await deleteFolder(path.join(__dirname, 'format-folder-test'))
  })

  it('should fix linting issues in subfolders of a given folder', async () => {
    const content = `%macro somemacro();  \n%put 'hello';\n%mend;`
    const expectedContent = `/**\n  @file\n  @brief <Your brief here>\n  <h4> SAS Macros </h4>\n**/\n%macro somemacro();\n%put 'hello';\n%mend somemacro;\n`
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

    await formatFolder(path.join(__dirname, 'format-folder-test'))
    const result = await readFile(
      path.join(
        __dirname,
        'format-folder-test',
        'subfolder',
        'format-folder-test.sas'
      )
    )

    expect(result).toEqual(expectedContent)

    await deleteFolder(path.join(__dirname, 'format-folder-test'))
  })
})
