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

**/\n%macro test();
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

    const expectedOutput = `/**\r\n  @file\r\n  @brief <Your brief here>\r\n\r\n  <h4> SAS Macros </h4>\r\n\r\n**/\r\n%macro test();\r\n  %put 'hello';\r\n%mend test;\r\n`

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

  it('should honour a header override', async () => {
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
  @sasjslint {"noUnusedMacros": false}

  <h4> SAS Macros </h4>
  @li mf_unused.sas

**/
%mf_used()`

    const output = await formatText(text)

    // noUndeclaredMacros still adds mf_used; noUnusedMacros is off for this
    // file, so mf_unused stays.
    expect(output).toContain('@li mf_used.sas')
    expect(output).toContain('@li mf_unused.sas')
  })

  it('reprints first and applies the rules to its output', async () => {
    // The engine is the caller's: lint carries no SAS printer of its own. What
    // this asserts is the contract - called once, with the configured casing, and
    // before the rules, so a trailing space the engine leaves is still removed.
    const calls: Array<{ text: string; keywordCase: string }> = []
    const reprint = async (text: string, options: { keywordCase: string }) => {
      calls.push({ text, keywordCase: options.keywordCase })
      return 'data foo;   \nrun;'
    }

    const output = await formatText(
      'DATA foo;   \nRUN;',
      new LintConfig({ keywordCase: 'lower', hasDoxygenHeader: false }),
      { reprint }
    )

    expect(calls).toEqual([
      { text: 'DATA foo;   \nRUN;', keywordCase: 'lower' }
    ])
    expect(output).toEqual('data foo;\nrun;')
  })

  it('does not reprint when no engine is supplied', async () => {
    // The behaviour a caller without @sasjs/sas-language sees, unchanged.
    const text = 'data foo;\nrun;\n'
    const output = await formatText(
      text,
      new LintConfig({ hasDoxygenHeader: false }),
      {}
    )
    expect(output).toEqual('data foo;\nrun;\n')
  })

  it('lets a reprint rejection through', async () => {
    // The engine names what it could not do; swallowing that would return a
    // buffer that looks formatted and is not.
    const reprint = async () => {
      throw new Error('SAS language data is missing: /nope/pubsdata/Procedures')
    }

    await expect(
      formatText('data foo;\nrun;\n', new LintConfig({}), { reprint })
    ).rejects.toThrow(/data is missing/)
  })
})
