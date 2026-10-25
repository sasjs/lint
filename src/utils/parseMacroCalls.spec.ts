import { LintConfig } from '../types'
import { parseMacroCalls } from './parseMacroCalls'

describe('parseMacroCalls', () => {
  it('should return the name and position of a macro invocation', () => {
    const text = `%put 'hello';`

    expect(parseMacroCalls(text, new LintConfig())).toEqual([
      {
        name: 'put',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 5
      }
    ])
  })

  it('should preserve the case of the macro name', () => {
    const calls = parseMacroCalls(`%MyMacro()`, new LintConfig())

    expect(calls.map((call) => call.name)).toEqual(['MyMacro'])
  })

  it('should track the line and column of each invocation', () => {
    const text = `%put one;\n  %myMacro()`

    expect(parseMacroCalls(text, new LintConfig())).toEqual([
      {
        name: 'put',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 5
      },
      {
        name: 'myMacro',
        lineNumber: 2,
        startColumnNumber: 3,
        endColumnNumber: 11
      }
    ])
  })

  it('should ignore invocations inside block comments', () => {
    const text = `/* %foo */\n%bar();\n/* multi\n%baz\n*/\n%qux();`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['bar', 'qux'])
  })

  it('should ignore invocations inside macro comments', () => {
    const text = `%* %foo;\n%bar();`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['bar'])
  })

  it('should ignore invocations inside comment statements', () => {
    const text = `* %foo;\n%bar();`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['bar'])
  })

  it('should ignore invocations inside single-quoted strings', () => {
    const text = `%put 'abc%def';`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['put'])
  })

  it('should handle an escaped quote inside a single-quoted string', () => {
    const text = `%put 'it''s %foo';`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['put'])
  })

  it('should end an unterminated single-quoted string at the line break', () => {
    const text = `%put 'abc\n%bar();`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['put', 'bar'])
  })

  it('should find invocations inside double-quoted strings, which SAS resolves', () => {
    const text = `%put "abc%mf_foo";`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['put', 'mf_foo'])
  })

  it('should treat an apostrophe inside a double-quoted string as text', () => {
    const text = `%put "don't use %mf_foo";`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['put', 'mf_foo'])
  })

  it('should ignore the argument of a masking function', () => {
    const text = `%put %str(%foo);`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['put'])
  })

  it('should handle the escaped parentheses of a masking function', () => {
    const text = `%put %str(%));`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['put'])
  })

  it('should report the argument of a masking function when asked to', () => {
    const text = `%mp_assert(iftrue=%str(%mf_existds(work.a)=1),desc=x)`

    expect(
      parseMacroCalls(text, new LintConfig(), { includeMasked: true })
    ).toEqual([
      {
        name: 'mp_assert',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 11
      },
      {
        name: 'mf_existds',
        lineNumber: 1,
        startColumnNumber: 24,
        endColumnNumber: 35
      }
    ])
  })

  it('should report the argument of %nrstr when asked to', () => {
    const text = `%put %nrstr(%mf_foo());`

    expect(
      parseMacroCalls(text, new LintConfig(), {
        includeMasked: true
      }).map((call) => call.name)
    ).toEqual(['put', 'mf_foo'])
  })

  it('should still ignore the escapes of a masking function when asked to scan it', () => {
    const text = `%put %str(%));`

    expect(
      parseMacroCalls(text, new LintConfig(), {
        includeMasked: true
      }).map((call) => call.name)
    ).toEqual(['put'])
  })

  it('should not let a quote inside masked text swallow what follows', () => {
    const text = `%mp_assert(iftrue=%str(%mf_a()='x),desc=y)%mf_b()`

    // The apostrophe is masked, so SAS never opens a string with it. A scan
    // that did would miss `%mf_b` - an under-count of uses, which is how the
    // formatter comes to delete a declaration the file needs.
    expect(
      parseMacroCalls(text, new LintConfig(), {
        includeMasked: true
      }).map((call) => call.name)
    ).toEqual(['mp_assert', 'mf_a', 'mf_b'])
  })

  it('should not let a comment marker inside masked text swallow what follows', () => {
    const text = `%put %str(/* %mf_a() */)%mf_b()`

    expect(
      parseMacroCalls(text, new LintConfig(), {
        includeMasked: true
      }).map((call) => call.name)
    ).toEqual(['put', 'mf_a', 'mf_b'])
  })

  it('should not report a label inside masked text', () => {
    const text = `%put %str(%again:)`

    expect(
      parseMacroCalls(text, new LintConfig(), { includeMasked: true })
    ).toEqual([
      {
        name: 'put',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 5
      }
    ])
  })

  it('should ignore invocations inside data sections', () => {
    const text = `data want;\n  datalines;\n%foo\n;\n%bar();`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['bar'])
  })

  it('should handle the four-semicolon terminator of a datalines4 section', () => {
    const text = `data want;\n  datalines4;\n%foo\n;;;;\n%bar();`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['bar'])
  })

  it('should treat an unterminated data section as data to the end of the file', () => {
    const text = `data want;\n  datalines;\n%foo\n%bar();`

    expect(parseMacroCalls(text, new LintConfig())).toEqual([])
  })

  it('should ignore invocations inside a proc lua submit block', () => {
    const text = `proc lua;\n  %foo\nendsubmit;\n%bar();`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['bar'])
  })

  it('should not report a macro statement label', () => {
    const text = `%err:\n  %goto err;`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['goto'])
  })

  it('should return an empty array when there is no text', () => {
    expect(parseMacroCalls('', new LintConfig())).toEqual([])
  })
})
