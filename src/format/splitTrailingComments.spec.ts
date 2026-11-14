import { LintConfig } from '../types'
import { processText } from './shared'
import { splitTrailingComments } from './splitTrailingComments'

const config = (json: any) => new LintConfig(json)

describe('splitTrailingComments', () => {
  it('lifts a trailing comment onto the line below the code', () => {
    const text = `    , var /* variable name from which to return the format */`

    expect(splitTrailingComments(text, config({ maxLineLength: 40 }))).toBe(
      `    , var\n    /* variable name from which to return the format */`
    )
  })

  it('keeps the indentation of the code it came from', () => {
    const text = `  %if (&rc eq -1) %then %do; /* read past end of data */`

    expect(splitTrailingComments(text, config({ maxLineLength: 40 }))).toBe(
      `  %if (&rc eq -1) %then %do;\n  /* read past end of data */`
    )
  })

  it('leaves a line that fits the limit alone', () => {
    const text = `  x = 1; /* note */`

    expect(splitTrailingComments(text, config({ maxLineLength: 80 }))).toBe(
      text
    )
  })

  it('leaves a comment that has a line to itself alone', () => {
    const text = `/* a comment that is long enough to need reflowing by the next pass */`

    expect(splitTrailingComments(text, config({ maxLineLength: 40 }))).toBe(
      text
    )
  })

  it('does not split a comment marker inside a literal', () => {
    const text = `  url = "http://example.com/*path*/";`

    expect(splitTrailingComments(text, config({ maxLineLength: 20 }))).toBe(
      text
    )
  })

  it('leaves a datalines record alone, where the text is data', () => {
    const text = `cards;
aaaa /* this is data, not a comment */ bbbb
;`

    expect(splitTrailingComments(text, config({ maxLineLength: 20 }))).toBe(
      text
    )
  })

  it('leaves the text alone when the rule is switched off', () => {
    const text = `  x = 1; /* a comment that pushes the line past the limit */`

    expect(
      splitTrailingComments(text, new LintConfig({ maxLineLength: 0 }))
    ).toBe(text)
  })

  it('does nothing to empty text', () => {
    expect(splitTrailingComments('', config({ maxLineLength: 80 }))).toBe('')
  })

  it('lets the following passes finish the job on both halves', () => {
    const text = `  , var /* variable name from which to return the format */`

    const output = processText(
      text,
      new LintConfig({ maxLineLength: 40, indentationMultiple: 2 })
    )

    // The code fits once the comment is out of its way, and the comment is now
    // a line of its own that `reflowComments` owns.
    expect(output).toContain(', var')
    expect(output.split('\n').every((line) => line.length <= 40)).toBe(true)
  })

  it('is idempotent - formatting its own output changes nothing', () => {
    const text = `    , var /* variable name from which to return the format */`
    const configuration = new LintConfig({ maxLineLength: 40 })

    const once = splitTrailingComments(text, configuration)

    expect(splitTrailingComments(once, configuration)).toBe(once)
  })
})
