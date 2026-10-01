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

    const expectedOutput = `/**\r\n  @file\r\n  @brief <Your brief here>\r\n\r\n  <h4> SAS Macros </h4>\r\n\r\n**/\r\n%macro test;\r\n  %put 'hello';\r\n%mend test;`

    const output = await formatText(text)

    expect(output).toEqual(expectedOutput)
  })

  it('should add undeclared macros to the header', async () => {
    jest
      .spyOn(getLintConfigModule, 'getLintConfig')
      .mockImplementationOnce(() =>
        Promise.resolve(
          new LintConfig(getLintConfigModule.DefaultLintConfiguration)
        )
      )
    const text = `%mf_b()\n%mf_a()`

    const expectedOutput = `/**
  @file
  @brief <Your brief here>

  <h4> SAS Macros </h4>
  @li mf_a.sas
  @li mf_b.sas

**/
%mf_b()
%mf_a()`

    const output = await formatText(text)

    expect(output).toEqual(expectedOutput)
  })

  it('should remove unused macros from the header', async () => {
    jest
      .spyOn(getLintConfigModule, 'getLintConfig')
      .mockImplementationOnce(() =>
        Promise.resolve(
          new LintConfig(getLintConfigModule.DefaultLintConfiguration)
        )
      )
    const text = `/**
  @file
  @brief test
  <h4> SAS Macros </h4>
  @li mf_unused.sas
**/
%mf_used()`

    const expectedOutput = `/**
  @file
  @brief test

  <h4> SAS Macros </h4>
  @li mf_used.sas

**/
%mf_used()`

    const output = await formatText(text)

    expect(output).toEqual(expectedOutput)
  })
})
