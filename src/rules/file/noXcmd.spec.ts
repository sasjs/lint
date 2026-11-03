import { LintConfig } from '../../types'
import { Severity } from '../../types/Severity'
import { noXcmd } from './noXcmd'

const config = new LintConfig({})

/** The diagnostics of this rule alone, without the rest of the rule set. */
const findings = (value: string, lintConfig: LintConfig = config) =>
  noXcmd.test(value, lintConfig)

describe('noXcmd', () => {
  it('reports nothing in a program that stays inside SAS', () => {
    const content = `
data want;
  x = 1;
  keep x;
  call missing(of _numeric_);
  length pipe $10;
  pipe = "a";
  if x = 1 then y = 2;
run;
options noxcmd;
filename pipe "/tmp/pipe.txt";
filename myref "/tmp/a.txt";

%let x="a";
%let b=%sysfunc(sysrc());
%macro system();
  %put a user macro, not the SAS function;
%mend;`

    expect(findings(content)).toEqual([])
  })

  it('reports every construct that needs XCMD, with the line and span of each', () => {
    const content = `%macro demo();
  options xcmd;
  data _null_;
    rc = system('ls');
  run;
  data _null_;
    infile "ls -l" pipe;
    input;
  run;
  x "ls";
  %sysexec ls;
  %let a=%sysfunc(system(ls));
%mend;`

    expect(findings(content)).toEqual([
      {
        message: 'OS command requires XCMD: options xcmd',
        lineNumber: 2,
        startColumnNumber: 11,
        endColumnNumber: 14,
        severity: Severity.Warning
      },
      {
        message: 'OS command requires XCMD: system(...)',
        lineNumber: 4,
        startColumnNumber: 10,
        endColumnNumber: 16,
        severity: Severity.Warning
      },
      {
        message: 'OS command requires XCMD: pipe',
        lineNumber: 7,
        startColumnNumber: 20,
        endColumnNumber: 23,
        severity: Severity.Warning
      },
      {
        message: 'OS command requires XCMD: x statement',
        lineNumber: 10,
        startColumnNumber: 3,
        endColumnNumber: 3,
        severity: Severity.Warning
      },
      {
        message: 'OS command requires XCMD: %sysexec',
        lineNumber: 11,
        startColumnNumber: 3,
        endColumnNumber: 10,
        severity: Severity.Warning
      },
      {
        message: 'OS command requires XCMD: %sysfunc(system(...))',
        lineNumber: 12,
        startColumnNumber: 10,
        endColumnNumber: 25,
        severity: Severity.Warning
      }
    ])
  })

  it('reports call system as one construct rather than also as a system() call', () => {
    const content = `data _null_;
  call system('ls');
run;`

    expect(findings(content)).toEqual([
      {
        message: 'OS command requires XCMD: call system',
        lineNumber: 2,
        startColumnNumber: 3,
        endColumnNumber: 14,
        severity: Severity.Warning
      }
    ])
  })

  it('reports call system with a space before the parenthesis', () => {
    expect(findings(`data _null_; call system ('ls'); run;`)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: call system',
        lineNumber: 1,
        startColumnNumber: 14,
        endColumnNumber: 26
      })
    ])
  })

  it('reports the %sysfunc form of sysrc as nothing, because it is not a command', () => {
    expect(findings(`%let b=%sysfunc(sysrc());`)).toEqual([])
  })

  it('reports systask command', () => {
    expect(findings(`systask command 'ls';`)).toEqual([
      {
        message: 'OS command requires XCMD: systask command',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 15,
        severity: Severity.Warning
      }
    ])
  })

  it('does not report an x on a continuation line of a multi-line statement', () => {
    expect(findings(`proc sql;\n  select\n    x from t;\nquit;`)).toEqual([])
    expect(
      findings(
        `proc sql;\n  create table y as\n  select\n    x,y\n  from t;\nquit;`
      )
    ).toEqual([])
  })

  it('stops the span at the end of the line a wrapped construct starts on', () => {
    const result = findings(`data _null_;\n  call\n  system('ls');\nrun;`)

    expect(result).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: call system',
        lineNumber: 2,
        startColumnNumber: 3,
        endColumnNumber: 6
      })
    ])
  })

  it('reports an x statement whose command is not quoted', () => {
    expect(findings(`x dir;`)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: x statement',
        startColumnNumber: 1,
        endColumnNumber: 1
      })
    ])
    expect(findings(`x &cmd;`)).toHaveLength(1)
    expect(findings(`  x   ls -l;`)).toHaveLength(1)
  })

  it('does not mistake an assignment or a sum statement for an x command', () => {
    expect(findings(`x = 1;`)).toEqual([])
    expect(findings(`x = "a";`)).toEqual([])
    expect(findings(`x=1;`)).toEqual([])
    expect(findings(`x + 1;`)).toEqual([])
    expect(findings(`x;`)).toEqual([])
  })

  it('reports an x statement that follows another statement on the line', () => {
    expect(findings(`data _null_; run; x 'ls';`)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: x statement',
        startColumnNumber: 19,
        endColumnNumber: 19
      })
    ])
  })

  it('does not report a data set whose options follow its name', () => {
    expect(findings(`data want; set work.system(keep=x); run;`)).toEqual([])
    expect(findings(`proc sort data=system(where=(x=1)); run;`)).toEqual([])
    expect(findings(`data _null_; set system(keep=x); run;`)).toEqual([])
    expect(
      findings(`proc sql; create table x as select * from system; quit;`)
    ).toEqual([])
  })

  it('still reports an assignment from the system function', () => {
    expect(findings(`data _null_; rc = system('ls'); run;`)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: system(...)'
      })
    ])
  })

  it('reports a function whose parenthesis wraps to the next line', () => {
    expect(findings(`data _null_;\n  rc = system\n  ('ls');\nrun;`)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: system(...)'
      })
    ])
    expect(findings(`%let a=%sysfunc\n  (system\n  (ls));`)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: %sysfunc(system(...))'
      })
    ])
  })

  it('does not report a user macro named system', () => {
    expect(findings(`%system(ls);`)).toEqual([])
  })

  it('reports nothing for an infile with no quoted path', () => {
    expect(findings(`data _null_; infile myref; input; run;`)).toEqual([])
  })

  it('reports %sysexec but not a user macro whose name ends in sysexec', () => {
    expect(findings(`%mf_sysexec(myfile);`)).toEqual([])
    expect(findings(`%sysexec %str(ls);`)).toEqual([
      expect.objectContaining({ message: 'OS command requires XCMD: %sysexec' })
    ])
  })

  it('reports options xcmd only in its positive form', () => {
    expect(findings(`options xcmd;`)).toHaveLength(1)
    expect(findings(`options noxcmd;`)).toEqual([])
    expect(findings(`options mprint noxcmd;`)).toEqual([])
    expect(findings(`options mprint xcmd;`)).toEqual([
      expect.objectContaining({
        startColumnNumber: 16,
        endColumnNumber: 19
      })
    ])
  })

  it('reports a filename pipe, and an infile pipe that follows a path', () => {
    expect(findings(`filename myref pipe "ls";`)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: pipe',
        startColumnNumber: 16
      })
    ])
    expect(findings(`filename myref pipe;`)).toHaveLength(1)
    expect(findings(`data _null_; infile "ls" pipe; run;`)).toHaveLength(1)
  })

  it('reports an infile pipe whose statement continues onto the next line', () => {
    const content = `data _null_;
  infile " &path/sas-make-folder 2>&1"
    pipe lrecl=10000;
  input;
run;`

    expect(findings(content)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: pipe',
        lineNumber: 3,
        startColumnNumber: 5,
        endColumnNumber: 8
      })
    ])
  })

  it('reports call, systask and the pipe path when the statement wraps', () => {
    expect(findings(`data _null_;\n  call\n  system('ls');\nrun;`)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: call system',
        lineNumber: 2
      })
    ])

    expect(findings(`systask\n  command 'ls';`)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: systask command',
        lineNumber: 1
      })
    ])

    expect(findings(`data _null_; infile &cmd pipe; input; run;`)).toEqual([
      expect.objectContaining({ message: 'OS command requires XCMD: pipe' })
    ])
    expect(findings(`data _null_; infile &cmd; input; run;`)).toEqual([])
  })

  it('reports nothing for a fileref or a variable that is simply named pipe', () => {
    expect(findings(`filename pipe "/tmp/a.txt";`)).toEqual([])
    expect(findings(`data _null_; length pipe $4; pipe = 'a'; run;`)).toEqual(
      []
    )
  })

  it('reports nothing inside a quoted value', () => {
    const content = `data _null_;
  put "x ""ls -l"";";
  put 'call system("ls")';
  msg = "%sysexec ls";
run;`

    expect(findings(content)).toEqual([])
  })

  it('reports nothing inside a block comment, including one over several lines', () => {
    const content = `/**
  @file
  @brief Mentions x "cmd"; and call system('x') in prose.
  An example: options xcmd; would need XCMD, and %sysexec too.
**/
/* %sysexec ls;
   x 'ls';
   options xcmd; */
data want;
  x = 1;
run;`

    expect(findings(content)).toEqual([])
  })

  it('reports nothing inside a comment statement, but keeps an asterisk in code', () => {
    const content = `data _null_;
  * x "not a command";
  * %sysexec also not one;
  y = 2 * 3;
run;
%macro m();
  %* x "a macro comment";
  %put ok;
%mend;`

    expect(findings(content)).toEqual([])
  })

  it('reports nothing in a datalines payload, indented or not', () => {
    const content = `data _null_;
  datalines;
x "ls"; call system('x'); %sysexec x; options xcmd;
;
run;
data _null_;
datalines4;
options xcmd; filename f pipe "ls";
;;;;
run;`

    expect(findings(content)).toEqual([])
  })

  it('reads a datalines payload as data even when it unbalances the scanner', () => {
    const content = `data _null_;
  datalines;
O'Brien /* a name and a slash-star in data
;
run;
x "ls";`

    expect(findings(content)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: x statement',
        lineNumber: 6
      })
    ])
  })

  it('reads a payload whose terminator is the last line of the file', () => {
    // No trailing newline: the terminator line IS the end of the file.
    const content = [
      'x "ls";',
      'data _null_;',
      '  datalines;',
      "call system('ls');",
      ';'
    ].join('\n')

    expect(findings(content)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: x statement',
        lineNumber: 1
      })
    ])
  })

  it('keeps scanning after a datalines statement with no payload terminator', () => {
    // A payload this scan cannot delimit is left alone, so its content reads as
    // code - the trade for reading data before comments. What must not happen
    // is blanking to the end of the file, which would hide everything after it.
    const content = `data _null_;
  datalines;
x "ls";`

    expect(findings(content)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: x statement',
        lineNumber: 3
      })
    ])
  })

  it('does not let a datalines keyword at a line start inside a comment swallow code', () => {
    // The keyword stands at column 1 inside a header comment, and a later line
    // beginning `;` is a null statement. Reading the statement off the raw text
    // would open a phantom payload there and blank the command in between.
    const content = `/**
datalines;
**/
data want;
  x "ls";
run;
;`

    expect(findings(content)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: x statement',
        lineNumber: 5
      })
    ])
  })

  it('ends a wrapped span before the CR of a CRLF file', () => {
    const content = "data _null_;\r\n  call\r\n  system('ls');\r\nrun;\r\n"

    expect(findings(content)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: call system',
        lineNumber: 2,
        startColumnNumber: 3,
        endColumnNumber: 6
      })
    ])
  })

  it('reports a command that follows a comment statement on the same line', () => {
    expect(findings(`* note; x "ls";`)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: x statement',
        startColumnNumber: 9
      })
    ])
    expect(findings(`%* note; options xcmd;`)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: options xcmd',
        startColumnNumber: 18
      })
    ])
  })

  it('reports a command that follows the end of a datalines payload', () => {
    const content = `data _null_;
  datalines;
x "ls";
;
run;
x "ls";`

    expect(findings(content)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: x statement',
        lineNumber: 6
      })
    ])
  })

  it('takes its severity from the config, and defaults to a warning', () => {
    const errorConfig = new LintConfig({ severityLevel: { noXcmd: 'error' } })

    expect(findings(`x "ls";`)[0].severity).toBe(Severity.Warning)
    expect(findings(`x "ls";`, errorConfig)[0].severity).toBe(Severity.Error)
  })

  it('returns nothing for empty text', () => {
    expect(findings('')).toEqual([])
  })

  it('reports a command without a config, as the rule set is not required', () => {
    expect(noXcmd.test(`x "ls";`)).toEqual([
      expect.objectContaining({
        message: 'OS command requires XCMD: x statement'
      })
    ])
  })
})
