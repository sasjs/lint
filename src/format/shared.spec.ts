import { LintConfig } from '../types'
import { processText } from './shared'

const config = (json: any) => new LintConfig(json)

const header = `/**
  @file
  @brief a file
**/
`

describe('processText', () => {
  it('reaches a fixed point, so formatting its own output changes nothing', () => {
    // One long literal with no space in it: no pass can shorten the line, so an
    // exception is written - which raises the limit the next run works to. The
    // passes run until the text stops changing, so both calls agree.
    const text =
      header +
      `
data _null_;
  x = "a-single-token-that-is-longer-than-the-limit-and-cannot-break";
run;
`
    const configuration = config({ maxLineLength: 40 })

    const once = processText(text, configuration)
    const twice = processText(once, configuration)

    expect(once).toContain('@sasjslint')
    expect(twice).toBe(once)
  })

  it('keeps a %let value intact through the whole pipeline', () => {
    const text =
      header +
      `
%let exp8=MPE_DERIVED:CALLER:VAR_LOGIC may not call a function that;
`
    const configuration = config({ maxLineLength: 40 })

    const once = processText(text, configuration)

    // Whatever the passes did, the value SAS reads is the value it read before.
    const value = once
      .split('\n')
      .join(' ')
      .replace(/%trim\(\s*\) /g, ' ')
      .match(/%let exp8=(.*?);/)![1]
      .replace(/\s+/g, ' ')
      .trim()

    expect(value).toBe(
      'MPE_DERIVED:CALLER:VAR_LOGIC may not call a function that'
    )
  })

  it('leaves a file that already fits byte-identical', () => {
    const text = header + '\ndata _null_;\n  x = 1;\nrun;\n'
    const configuration = config({ maxLineLength: 80 })

    expect(processText(text, configuration)).toBe(text)
  })
})
