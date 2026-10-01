import { LintConfig } from '../../types'
import { Severity } from '../../types/Severity'
import { noSingleAsteriskComments } from './noSingleAsteriskComments'

const message = 'Line contains a single asterisk comment'

describe('noSingleAsteriskComments', () => {
  it('should return an empty array when a file has no single asterisk comments', () => {
    const content = `/* a regular comment */
data _null_;
  x = 1;
run;`

    expect(noSingleAsteriskComments.test(content)).toEqual([])
  })

  it('should flag a single asterisk comment', () => {
    expect(noSingleAsteriskComments.test('* some text;')).toEqual([
      {
        message,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 2,
        severity: Severity.Warning
      }
    ])
  })

  it('should flag an indented single asterisk comment', () => {
    expect(noSingleAsteriskComments.test('  * some text;')).toEqual([
      {
        message,
        lineNumber: 1,
        startColumnNumber: 3,
        endColumnNumber: 4,
        severity: Severity.Warning
      }
    ])
  })

  it('should flag a multi-line single asterisk comment at its opening asterisk', () => {
    const content = `*
multiline
text;`

    expect(noSingleAsteriskComments.test(content)).toEqual([
      {
        message,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 2,
        severity: Severity.Warning
      }
    ])
  })

  it('should flag a box comment once, at the first asterisk', () => {
    const content = `*---------------------------------------*
| This uses one comment statement |
| to draw a box. |
*---------------------------------------*;`

    expect(noSingleAsteriskComments.test(content)).toEqual([
      {
        message,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 2,
        severity: Severity.Warning
      }
    ])
  })

  it('should flag a single asterisk comment at the end of a statement', () => {
    expect(
      noSingleAsteriskComments.test('libname x (work); * some text;')
    ).toEqual([
      {
        message,
        lineNumber: 1,
        startColumnNumber: 19,
        endColumnNumber: 20,
        severity: Severity.Warning
      }
    ])
  })

  it('should flag a single asterisk comment in the middle of a statement', () => {
    const content = `run; *walk
; run;`

    expect(noSingleAsteriskComments.test(content)).toEqual([
      {
        message,
        lineNumber: 1,
        startColumnNumber: 6,
        endColumnNumber: 7,
        severity: Severity.Warning
      }
    ])
  })

  it('should flag an empty single asterisk comment', () => {
    expect(noSingleAsteriskComments.test('*; run;')).toEqual([
      {
        message,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 2,
        severity: Severity.Warning
      }
    ])
  })

  it('should flag a single asterisk comment inside a macro', () => {
    expect(noSingleAsteriskComments.test('%macro x; * %mend;')).toEqual([
      {
        message,
        lineNumber: 1,
        startColumnNumber: 11,
        endColumnNumber: 12,
        severity: Severity.Warning
      }
    ])
  })

  it('should flag a single asterisk comment that contains a block comment', () => {
    expect(noSingleAsteriskComments.test('* /* ignored also */ ;')).toEqual([
      {
        message,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 2,
        severity: Severity.Warning
      }
    ])
  })

  it('should flag each single asterisk comment in a file', () => {
    const content = `* first;
data _null_;
  x = 1;
run;
* second;`

    expect(noSingleAsteriskComments.test(content)).toContainEqual({
      message,
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 2,
      severity: Severity.Warning
    })
    expect(noSingleAsteriskComments.test(content)).toContainEqual({
      message,
      lineNumber: 5,
      startColumnNumber: 1,
      endColumnNumber: 2,
      severity: Severity.Warning
    })
  })

  it('should not flag an asterisk inside a string literal', () => {
    const content = `data _null_;
  string='no*no;no';
  string="not*this;either";
run;`

    expect(noSingleAsteriskComments.test(content)).toEqual([])
  })

  it('should not flag an asterisk that follows an escaped quote in a string literal', () => {
    const content = `data _null_;
  x='it''s a *test;';
run;`

    expect(noSingleAsteriskComments.test(content)).toEqual([])
  })

  it('should not flag an asterisk inside a %str() or %nrstr() block', () => {
    const content = `%let x=%str(afraid *not; sir);
%let y=%nrstr(try*again;please);`

    expect(noSingleAsteriskComments.test(content)).toEqual([])
  })

  it('should not flag an asterisk inside a %put statement', () => {
    expect(noSingleAsteriskComments.test('%put not * today;;')).toEqual([])
  })

  it('should not flag a macro comment', () => {
    expect(
      noSingleAsteriskComments.test('%* this one is totally normal;')
    ).toEqual([])
  })

  it('should not flag an asterisk inside a proc lua block', () => {
    const content = `proc lua;
  submit;
  -- hi *mum;
  endsubmit;
run;`

    expect(noSingleAsteriskComments.test(content)).toEqual([])
  })

  it('should not flag a statement-level asterisk inside a proc lua submit block', () => {
    expect(
      noSingleAsteriskComments.test(
        'proc lua; submit; local a=1; * x; endsubmit; run;'
      )
    ).toEqual([])
  })

  it('should not flag a statement-level asterisk inside a multi-line proc lua block', () => {
    const content = `proc lua;
  submit;
  local a = 1;
  * x;
  endsubmit;
run;`

    expect(noSingleAsteriskComments.test(content)).toEqual([])
  })

  it('should not flag a statement-level asterisk inside a proc groovy block', () => {
    const content = `proc groovy;
  submit;
  def a = 1;
  * x;
  endsubmit;
run;`

    expect(noSingleAsteriskComments.test(content)).toEqual([])
  })

  it('should resume scanning after a proc lua block', () => {
    const content = `proc lua;
  submit;
  * x;
  endsubmit;
run;
* a real comment;`

    expect(noSingleAsteriskComments.test(content)).toEqual([
      {
        message,
        lineNumber: 6,
        startColumnNumber: 1,
        endColumnNumber: 2,
        severity: Severity.Warning
      }
    ])
  })

  it('should still flag a comment inside a proc iml submit block, which holds SAS code', () => {
    const content = `proc iml;
  submit;
  * a real comment;
  endsubmit;
run;`

    expect(noSingleAsteriskComments.test(content)).toEqual([
      {
        message,
        lineNumber: 3,
        startColumnNumber: 3,
        endColumnNumber: 4,
        severity: Severity.Warning
      }
    ])
  })

  it('should not flag multiplication or exponentiation in a data step', () => {
    const content = `data;
  a * b;
  b ** a;
run;`

    expect(noSingleAsteriskComments.test(content)).toEqual([])
  })

  it('should not flag a wildcard asterisk in SQL', () => {
    const content = `proc sql;
  select * from sashelp.cars;
  select /* */ * from sashelp.class;
  select a.*, b.* from a,b;
quit;`

    expect(noSingleAsteriskComments.test(content)).toEqual([])
  })

  it('should not flag an asterisk that is not at the start of a statement', () => {
    expect(noSingleAsteriskComments.test('%macro x;(*)%mend;%x;')).toEqual([])
  })

  it('should ignore a string that is left unterminated at the end of a line', () => {
    const content = `data _null_;
  x = 'oops;
  y = 1;
run;`

    expect(noSingleAsteriskComments.test(content)).toEqual([])
  })

  it('should handle tab indentation and CRLF line endings', () => {
    expect(noSingleAsteriskComments.test('\t* comment;\r\n')).toEqual([
      {
        message,
        lineNumber: 1,
        startColumnNumber: 2,
        endColumnNumber: 3,
        severity: Severity.Warning
      }
    ])
  })

  it('should respect the configured severity', () => {
    const config = new LintConfig({
      noSingleAsteriskComments: true,
      severityLevel: { noSingleAsteriskComments: 'error' }
    })

    expect(noSingleAsteriskComments.test('* some text;', config)).toEqual([
      {
        message,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 2,
        severity: Severity.Error
      }
    ])
  })

  it('should not flag an asterisk inside a datalines block', () => {
    const content = `data a;
  input x $;
  datalines;
*not a comment;
a;b;
;
run;`

    expect(noSingleAsteriskComments.test(content)).toEqual([])
  })

  it('should not flag an asterisk inside a cards4 block', () => {
    const content = `data a;
  input x $;
  cards4;
*hello;
;;;;
run;`

    expect(noSingleAsteriskComments.test(content)).toEqual([])
  })

  it('should not flag an asterisk in a data section that starts on the same line', () => {
    expect(
      noSingleAsteriskComments.test(
        'data a; input x $; cards4; *hello; ;;;; run;'
      )
    ).toEqual([])
  })

  it('should resume scanning after a data section', () => {
    const content = `data a;
  input x $;
  datalines;
*not a comment;
;
* a real comment;
run;`

    expect(noSingleAsteriskComments.test(content)).toEqual([
      {
        message,
        lineNumber: 6,
        startColumnNumber: 1,
        endColumnNumber: 2,
        severity: Severity.Warning
      }
    ])
  })

  it('should treat a comment body as opaque, so an apostrophe does not hide the next comment', () => {
    const content = `* don't do this;
* second comment;`

    expect(noSingleAsteriskComments.test(content)).toEqual([
      {
        message,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 2,
        severity: Severity.Warning
      },
      {
        message,
        lineNumber: 2,
        startColumnNumber: 1,
        endColumnNumber: 2,
        severity: Severity.Warning
      }
    ])
  })

  it('should not flag an asterisk inside a %str() with nested parentheses', () => {
    const content = `%let x=%str(keep (this) *not;);`

    expect(noSingleAsteriskComments.test(content)).toEqual([])
  })

  it('should not flag an asterisk inside a %str() whose argument continues past a %-escaped paren', () => {
    const content = `%let x=%str(a%);
* b);`

    expect(noSingleAsteriskComments.test(content)).toEqual([])
  })
})
