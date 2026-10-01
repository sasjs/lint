import { lintText } from './lintText'
import { LintConfig } from '../types'

const longLine = 'x'.repeat(120)

describe('lintText with a header override', () => {
  it('should apply the override to the whole file', async () => {
    const config = new LintConfig({ maxLineLength: 80 })

    const without = await lintText(
      `/**
  @file
**/
${longLine}`,
      config
    )

    const withOverride = await lintText(
      `/**
  @file
  @sasjslint {"maxLineLength": 200}
**/
${longLine}`,
      config
    )

    expect(
      without.some((d) => d.message.startsWith('Line exceeds maximum length'))
    ).toBe(true)
    expect(
      withOverride.some((d) =>
        d.message.startsWith('Line exceeds maximum length')
      )
    ).toBe(false)
  })

  it('should let a file opt out of a rule', async () => {
    const config = new LintConfig({})

    const text = (line: string) => `/**
  @file
${line}
**/
%mf_undeclared()`

    expect(
      (await lintText(text('  @brief x'), config)).some((d) =>
        /not declared/.test(d.message)
      )
    ).toBe(true)

    expect(
      (
        await lintText(
          text('  @sasjslint {"noUndeclaredMacros": false}'),
          config
        )
      ).some((d) => /not declared/.test(d.message))
    ).toBe(false)
  })
})
