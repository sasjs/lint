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

  it('should keep the column in step after a single-quoted string', () => {
    const text = `%put 'a' %mf_a()`

    // the quote branch has its own counter step; a missed one shifts every
    // later column on the line
    expect(parseMacroCalls(text, new LintConfig())).toEqual([
      {
        name: 'put',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 5
      },
      {
        name: 'mf_a',
        lineNumber: 1,
        startColumnNumber: 10,
        endColumnNumber: 15
      }
    ])
  })

  it('should keep the column in step after a double-quoted string', () => {
    const text = `%put "a" %mf_b()`

    expect(
      parseMacroCalls(text, new LintConfig()).map(
        (call) => call.startColumnNumber
      )
    ).toEqual([1, 10])
  })

  it('should report a masked invocation that ends the argument', () => {
    const text = `%put %str(%mf_a)`

    // the token is the last thing before the closing parenthesis: an off-by-one
    // in the argument scan loses it
    expect(
      parseMacroCalls(text, new LintConfig(), {
        includeMasked: true
      }).map((call) => call.name)
    ).toEqual(['put', 'mf_a'])
  })

  it('should report a masked invocation when the argument is never closed', () => {
    const text = `%put %str(%mf_a`

    expect(
      parseMacroCalls(text, new LintConfig(), {
        includeMasked: true
      }).map((call) => call.name)
    ).toEqual(['put', 'mf_a'])
  })

  it('should scan past the parenthesis escape inside masked text', () => {
    const text = `%put %str(%( %mf_a)`

    // `%(` is a literal parenthesis, not a delimiter, so the scan continues
    expect(
      parseMacroCalls(text, new LintConfig(), {
        includeMasked: true
      }).map((call) => call.name)
    ).toEqual(['put', 'mf_a'])
  })

  it('should read a masked invocation nested in parentheses', () => {
    const text = `%put %str(a(b)%mf_a())`

    expect(
      parseMacroCalls(text, new LintConfig(), {
        includeMasked: true
      }).map((call) => call.name)
    ).toEqual(['put', 'mf_a'])
  })

  it('should ignore a proc lua block that is never closed', () => {
    const text = `proc lua;%mf_never()`

    // the block is entered only when an `endsubmit` closes it, so a stray
    // `proc lua;` cannot swallow the rest of the file
    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['mf_never'])
  })

  it('should scan code after a data section that ends at the last line', () => {
    const text = `data want;\ndatalines;\n%foo\n;\n%bar()`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['bar'])
  })

  it('should ignore a comment statement and scan what follows', () => {
    const text = `* %mf_commented;%mf_after()`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['mf_after'])
  })

  it('should skip a masked argument that contains nested parentheses', () => {
    const text = `%put %str(a(b)%mf_hidden())`

    // the argument ends at the parenthesis that closes the one opened by %str,
    // not at the first `)` inside it - ending early would report %mf_hidden
    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['put'])
  })

  it('should end a masked argument at the parenthesis a `%(` escape does not open', () => {
    const text = `%put %str(a%(b)%mf_hidden())`

    // `%(` is a literal parenthesis, so the `)` after `b` is the one that closes
    // %str - the invocation after it is code, not masked text. A scan that
    // counts the escaped parenthesis as an opening one would swallow it.
    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual(['put', 'mf_hidden'])
  })

  it('should keep the column in step across an escaped quote', () => {
    const text = `%put 'it''s' %mf_a()`

    // `''` is one quote character; a scan that ends the string at the first
    // apostrophe reports %mf_a from the wrong place, or not at all
    expect(
      parseMacroCalls(text, new LintConfig()).map(
        (call) => call.startColumnNumber
      )
    ).toEqual([1, 14])
  })

  it('should treat a comment statement that is never closed as a comment', () => {
    const text = `* %mf_commented`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual([])
  })

  it('should treat a data section that ends at the end of the file as data', () => {
    const text = `data a;\ndatalines;\n%foo\n;`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual([])
  })

  it('should not read a `*` after a masking function as a comment statement', () => {
    const text = `%put %str(x) * %mf_not_a_comment;`

    // the `*` starts a comment statement only at the start of a statement, and a
    // masking function leaves the scan mid-statement
    expect(
      parseMacroCalls(text, new LintConfig()).map(
        (call) => `${call.name}@${call.startColumnNumber}`
      )
    ).toEqual(['put@1', 'mf_not_a_comment@16'])
  })

  it('should read a comment statement after a proc lua block', () => {
    const text = `proc lua;
print('x')
endsubmit;
* %mf_in_comment;`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual([])
  })

  it('should read a comment statement after a data section', () => {
    const text = `data a;
datalines;
%x
;
* %mf_in_comment;`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual([])
  })

  it('should read a data section after a comment statement', () => {
    const text = `* a;
data b;
datalines;
%x
;`

    expect(
      parseMacroCalls(text, new LintConfig()).map((call) => call.name)
    ).toEqual([])
  })

  it('should end a data section on a terminator line with trailing spaces', () => {
    const text = `data a;
datalines;
%foo
;   
%bar()`

    expect(
      parseMacroCalls(text, new LintConfig()).map(
        (call) => `${call.name}@${call.lineNumber}:${call.startColumnNumber}`
      )
    ).toEqual(['bar@5:1'])
  })

  it('should scan masked text that starts with a parenthesis escape', () => {
    const text = `%put %str(%(%mf_a)`

    expect(
      parseMacroCalls(text, new LintConfig(), {
        includeMasked: true
      }).map((call) => `${call.name}@${call.startColumnNumber}`)
    ).toEqual(['put@1', 'mf_a@13'])
  })

  it('should report a masked invocation on the line it sits on', () => {
    const text = `%mp_assert(
  iftrue=%str(
    %mf_a(work.x)
  )
)`

    expect(
      parseMacroCalls(text, new LintConfig(), {
        includeMasked: true
      }).map(
        (call) => `${call.name}@${call.lineNumber}:${call.startColumnNumber}`
      )
    ).toEqual(['mp_assert@1:1', 'mf_a@3:5'])
  })

  it('should not report an invocation twice when it follows a masked call', () => {
    const text = `%put %str(x)%mf_after()`

    // the masked region ends at the `)` of %str(, so the call that follows it is
    // scanned once by the main loop - a region that runs one character too far
    // would also pick it up as masked text and report it twice
    expect(
      parseMacroCalls(text, new LintConfig(), {
        includeMasked: true
      }).map((call) => `${call.name}@${call.startColumnNumber}`)
    ).toEqual(['put@1', 'mf_after@13'])
  })

  it('should not enter a proc lua block on an endsubmit that precedes it', () => {
    const text = `/* endsubmit; */
proc lua;
%mf_after()`

    // the lookahead must search what follows `proc lua;`, not the whole file: an
    // `endsubmit` in an earlier comment does not close a block that follows it
    expect(
      parseMacroCalls(text, new LintConfig()).map(
        (call) => `${call.name}@${call.lineNumber}`
      )
    ).toEqual(['mf_after@3'])
  })

  it('should end a multi-line data section at its terminator', () => {
    const text = `data a;
datalines;
%x
%y
;
%bar()`

    expect(
      parseMacroCalls(text, new LintConfig()).map(
        (call) => `${call.name}@${call.lineNumber}`
      )
    ).toEqual(['bar@6'])
  })

  it('should keep the column in step across an apostrophe inside double quotes', () => {
    const text = `%put "it's" %mf_a()`

    // the apostrophe is ordinary text here, and the branch that steps over it has
    // no advanceTo to recover the column
    expect(
      parseMacroCalls(text, new LintConfig()).map(
        (call) => `${call.name}@${call.startColumnNumber}`
      )
    ).toEqual(['put@1', 'mf_a@13'])
  })

  it('should keep an escaped quote inside a single-quoted string', () => {
    const text = `%put 'it''s %mf_a' %mf_b()`

    // `''` is one quote character, so the string runs to the quote before %mf_b:
    // %mf_a is masked text, %mf_b is the invocation
    expect(
      parseMacroCalls(text, new LintConfig()).map(
        (call) => `${call.name}@${call.startColumnNumber}`
      )
    ).toEqual(['put@1', 'mf_b@20'])
  })

  it('should skip both parenthesis escapes inside masked text', () => {
    const text = `%put %str(a%(b%)%mf_a)`

    expect(
      parseMacroCalls(text, new LintConfig(), {
        includeMasked: true
      }).map((call) => `${call.name}@${call.startColumnNumber}`)
    ).toEqual(['put@1', 'mf_a@17'])
  })

  it('should step over a bare percent sign inside masked text', () => {
    // a percent that is not the start of a name is ordinary text, and the scan
    // has to move past it rather than run the name branch
    expect(
      parseMacroCalls('%put %str(100% sure)', new LintConfig(), {
        includeMasked: true
      }).map((call) => call.name)
    ).toEqual(['put'])

    expect(
      parseMacroCalls('%put %str(50% of it then %mf_a)', new LintConfig(), {
        includeMasked: true
      }).map((call) => `${call.name}@${call.startColumnNumber}`)
    ).toEqual(['put@1', 'mf_a@26'])
  })

  it('should return an empty array when there is no text', () => {
    expect(parseMacroCalls('', new LintConfig())).toEqual([])
  })
})
