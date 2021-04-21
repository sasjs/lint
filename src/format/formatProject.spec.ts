import { formatProject } from './formatProject'
import path from 'path'
import {
  createFile,
  createFolder,
  deleteFolder,
  readFile
} from '@sasjs/utils/file'
import { DefaultLintConfiguration } from '../utils'
import * as getProjectRootModule from '../utils/getProjectRoot'
jest.mock('../utils/getProjectRoot')

describe('formatProject', () => {
  it('should format files in the current project', async () => {
    const content = `%macro somemacro();  \n%put 'hello';\n%mend;`
    const expectedContent = `/**\n  @file\n  @brief <Your brief here>\n  <h4> SAS Macros </h4>\n**/\n%macro somemacro();\n%put 'hello';\n%mend somemacro;`
    await createFolder(path.join(__dirname, 'format-project-test'))
    await createFile(
      path.join(__dirname, 'format-project-test', 'format-project-test.sas'),
      content
    )
    await createFile(
      path.join(__dirname, 'format-project-test', '.sasjslint'),
      JSON.stringify(DefaultLintConfiguration)
    )
    jest
      .spyOn(getProjectRootModule, 'getProjectRoot')
      .mockImplementation(() =>
        Promise.resolve(path.join(__dirname, 'format-project-test'))
      )

    await formatProject()
    const result = await readFile(
      path.join(__dirname, 'format-project-test', 'format-project-test.sas')
    )

    expect(result).toEqual(expectedContent)

    await deleteFolder(path.join(__dirname, 'format-project-test'))
  })

  it('should throw an error when a project root is not found', async () => {
    jest
      .spyOn(getProjectRootModule, 'getProjectRoot')
      .mockImplementationOnce(() => Promise.resolve(''))

    await expect(formatProject()).rejects.toThrowError(
      'SASjs Project Root was not found.'
    )
  })
})
