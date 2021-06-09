import { formatText } from './formatText'
import * as getLintConfigModule from '../utils/getLintConfig'
import { LintConfig } from '../types'
jest.mock('../utils/getLintConfig')

describe('formatText', () => {
  it('should format the given text based on configured rules', async () => {
    jest
      .spyOn(getLintConfigModule, 'getLintConfig')
      .mockImplementationOnce(() =>
        Promise.resolve(
          new LintConfig(getLintConfigModule.DefaultLintConfiguration)
        )
      )
    const text = `%macro test;
  %put 'hello';\r\n%mend; `

    const expectedOutput = `/**
  @file
  @brief <Your brief here>
  <h4> SAS Macros </h4>
**/\n%macro test;
  %put 'hello';\n%mend test;`

    const output = await formatText(text)

    expect(output).toEqual(expectedOutput)
  })

  it('should use CRLF line endings when configured', async () => {
    jest
      .spyOn(getLintConfigModule, 'getLintConfig')
      .mockImplementationOnce(() =>
        Promise.resolve(
          new LintConfig({
            ...getLintConfigModule.DefaultLintConfiguration,
            lineEndings: 'crlf'
          })
        )
      )
    const text = `%macro test;\n  %put 'hello';\r\n%mend; `

    const expectedOutput = `/**\r\n  @file\r\n  @brief <Your brief here>\r\n  <h4> SAS Macros </h4>\r\n**/\r\n%macro test;\r\n  %put 'hello';\r\n%mend test;`

    const output = await formatText(text)

    expect(output).toEqual(expectedOutput)
  })
})
