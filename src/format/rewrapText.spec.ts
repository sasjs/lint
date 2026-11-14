import { LintConfig } from '../types'
import { rewrapText } from './rewrapText'

const config = (json: any) => new LintConfig(json)

describe('rewrapText', () => {
  it('wraps a long statement at the last space that fits', () => {
    const text = `data _null_;
  set work.example (keep=first_name last_name age city country);
run;`

    const output = rewrapText(
      text,
      config({ maxLineLength: 40, lineEndings: 'lf' })
    )

    expect(output).toEqual(`data _null_;
  set work.example (keep=first_name
    last_name age city country);
run;`)
  })

  it('leaves a file whose lines all fit unchanged, byte for byte', () => {
    const text = `data _null_;\r\n  set work.example;\r\nrun;`

    expect(rewrapText(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('indents a continuation by the next multiple of indentationMultiple', () => {
    const text = `data _null_;
    set work.example (keep=first_name last_name age city country);
run;`

    const output = rewrapText(
      text,
      config({ maxLineLength: 40, indentationMultiple: 4 })
    )

    expect(output).toEqual(`data _null_;
    set work.example (keep=first_name
        last_name age city country);
run;`)
  })

  it('never indents a continuation off a multiple, whatever the line uses', () => {
    const text = `data _null_;
  set work.example (keep=first_name last_name age city country);
run;`

    // A two-space line under `indentationMultiple: 4` would take six spaces
    // from a naive "indent plus the multiple", and the wrap would then be the
    // thing that reports an indentation violation.
    const output = rewrapText(
      text,
      config({ maxLineLength: 40, indentationMultiple: 4 })
    )

    expect(output).toEqual(`data _null_;
  set work.example (keep=first_name
    last_name age city country);
run;`)
    // The line's own two spaces stay as they are - the pass has no business
    // restyling them - while the continuation it writes is a multiple of four.
    expect(output.split('\n')[2]).toBe('    last_name age city country);')
  })

  it('never breaks inside a quoted literal, and leaves the line when the literal alone is too long', () => {
    const text = `data _null_;
  x = "alpha beta gamma delta epsilon zeta eta theta";
run;`

    // Breaking before the literal would move it whole, but the literal is
    // longer than the limit, so the wrapped file still holds a line the rule
    // reports. The line stays as written rather than trading one diagnostic
    // for another.
    expect(rewrapText(text, config({ maxLineLength: 20 }))).toBe(text)
  })

  it('carries an open literal across lines, so a later line is not breakable', () => {
    const text = `data _null_;
  x = "alpha beta
gamma delta epsilon zeta eta theta iota kappa";
run;`

    // The second line is one string continued from the first: every one of its
    // spaces is inside the literal.
    expect(rewrapText(text, config({ maxLineLength: 20 }))).toBe(text)
  })

  it('leaves a line whose longest token exceeds the limit alone', () => {
    const text = `/**
  @file
  @brief See the documentation
  https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
data _null_;
run;`

    expect(
      rewrapText(text, config({ maxLineLength: 40, maxHeaderLineLength: 40 }))
    ).toBe(text)
  })

  it('does not break inside %str quoting, where a newline becomes token text', () => {
    // Without the mask, this line has a safe space at 26 and would be wrapped;
    // the whole argument is one masked value, so it stays on its line.
    const text = `%put %str(aaa bbb ccc ddd eee fff ggg hhh iii jjj);`

    expect(rewrapText(text, config({ maxLineLength: 30 }))).toBe(text)
  })

  it('counts the parentheses inside a mask, so nesting ends where it ends', () => {
    const text = `x = %str(a (b) c d e f g h i j k l m n o p q);`

    expect(rewrapText(text, config({ maxLineLength: 20 }))).toBe(text)
  })

  it('treats %quote and %unquote as data too', () => {
    const quoted = `%let v = %quote(a b c d e f g h i j k l m n);`
    const unquoted = `%let v = %unquote(a b c d e f g h i j k l m n);`

    expect(rewrapText(quoted, config({ maxLineLength: 20 }))).toBe(quoted)
    expect(rewrapText(unquoted, config({ maxLineLength: 20 }))).toBe(unquoted)
  })

  it('leaves header prose alone, because a paragraph is wrapped as a whole or not at all', () => {
    const text = `/**
  @file
  @brief A brief that is long enough to be wrapped by the formatter
  and continues on the next line, which is the case that goes wrong
**/
data _null_;
run;`

    expect(rewrapText(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('leaves a code line with a trailing comment alone', () => {
    const text = `data _null_;
  set work.example (keep=first_name last_name age city country); /* note */`

    expect(rewrapText(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('leaves a %put statement alone, whose newline is a line of log output', () => {
    const text = `%put NOTE: the macro could not find the requested table and stopped;`

    expect(rewrapText(text, config({ maxLineLength: 20 }))).toBe(text)
  })

  it('leaves the &mD.put form alone, which resolves to %put at execution', () => {
    const text = `%&mD.put NOTE: Creating direct (non META) connection to &libref;`

    expect(rewrapText(text, config({ maxLineLength: 20 }))).toBe(text)
  })

  it('leaves put and putlog statements alone, where a newline is an output line', () => {
    const putlog = `    putlog "reading" libds= rc= count= anything else that runs long;`
    const put = `  put "value" a b c d e f g h i j k l m n o p q r s t u v;`

    expect(rewrapText(putlog, config({ maxLineLength: 20 }))).toBe(putlog)
    expect(rewrapText(put, config({ maxLineLength: 20 }))).toBe(put)
  })

  it('leaves a put statement opened on a previous line alone to its semicolon', () => {
    const text = `data _null_;
  put aaaaaa bbbbbb cccccc
    dddddd eeeeee ffffff gggggg hhhhhh iiiiii jjjjjj;
run;`

    // The second line is more of the same put statement, so a break in it is
    // another output line as well.
    expect(rewrapText(text, config({ maxLineLength: 20 }))).toBe(text)
  })

  it('leaves a put in a THEN branch alone, and wraps the next statement', () => {
    const text = `data _null_;
  if found then put "one" two three four five six seven eight nine ten;
  set work.example (keep=first_name last_name age city country);
run;`

    const output = rewrapText(text, config({ maxLineLength: 40 }))

    expect(output.split('\n')[1]).toBe(
      '  if found then put "one" two three four five six seven eight nine ten;'
    )
    expect(output).toContain('  set work.example (keep=first_name\n')
  })

  it('leaves datalines records and the statement that opens them alone', () => {
    const text = `data example;
  input id $;
  DATALINES;
alpha beta gamma delta epsilon zeta eta theta iota kappa
;
run;`

    // The `DATALINES` statement is indented and upper case, which SAS accepts;
    // a newline inside the record would end it and lose the rest of the values.
    expect(rewrapText(text, config({ maxLineLength: 20 }))).toBe(text)
  })

  it('leaves the @sasjslint line alone, whose JSON must stay on its line', () => {
    const text = `/**
  @file
  @sasjslint {"maxLineLength": 40, "maxHeaderLineLength": 40, "noTabs": true}
**/
data _null_;
run;`

    const output = rewrapText(
      text,
      config({ maxLineLength: 40, maxHeaderLineLength: 40 })
    )

    expect(output).toContain(
      '@sasjslint {"maxLineLength": 40, "maxHeaderLineLength": 40, "noTabs": true}'
    )
  })

  it('leaves macro declarations alone, which the macro rules read as one statement', () => {
    const declaration = `%macro example(first_parameter, second_parameter, third_parameter);`
    const mend = `%mend example;`

    expect(rewrapText(declaration, config({ maxLineLength: 40 }))).toBe(
      declaration
    )
    expect(rewrapText(mend, config({ maxLineLength: 10 }))).toBe(mend)
  })

  it('leaves the <h4> SAS Macros </h4> section alone', () => {
    const text = `/**
  @file

  <h4> SAS Macros </h4>
  @li mf_getuser.sas - returns the current user id from the metadata
**/
data _null_;
run;`

    const output = rewrapText(text, config({ maxLineLength: 40 }))

    expect(output).toContain(
      '  @li mf_getuser.sas - returns the current user id from the metadata'
    )
  })

  it('does nothing when the limit is switched off, which leaves the default in place', () => {
    const text = `data _null_;
  set work.example (keep=first_name last_name age city country);
run;`
    const configuration = config({ maxLineLength: 0 })

    // The rule is absent from the config, while the property keeps its default.
    expect(configuration.maxLineLength).toBe(80)
    expect(rewrapText(text, configuration)).toBe(text)
    expect(rewrapText('', configuration)).toBe('')
  })

  it('falls back to a two-space continuation when indentationMultiple is off', () => {
    const text = `data _null_;
  set work.example (keep=first_name last_name age city country);
run;`

    const output = rewrapText(
      text,
      config({ maxLineLength: 40, indentationMultiple: 0 })
    )

    expect(output.split('\n')[2]).toBe('    last_name age city country);')
  })

  it('leaves a line the indentation alone pushes over the limit', () => {
    // The content is 39 characters and fits; every continuation it could be
    // broken into carries more indentation than the line does, so no break
    // shortens anything. The warning stands for the author.
    const text = `data _null_;\n${'  '}${'a'.repeat(39)}\nrun;`

    expect(rewrapText(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('leaves a line whose only excess is trailing spaces to the trailing-space fix', () => {
    const text = `data _null_;
  x = 1;${' '.repeat(40)}
run;`

    // Wrapping here would emit a blank continuation line; `noTrailingSpaces`
    // resolves the same diagnostic in the line phase of the same pass.
    expect(rewrapText(text, config({ maxLineLength: 20 }))).toBe(text)
  })

  it('is idempotent - formatting its own output changes nothing', () => {
    const text = `data _null_;
  set work.example (keep=first_name last_name age city country street town);
run;`
    const configuration = config({ maxLineLength: 40 })

    const once = rewrapText(text, configuration)

    expect(rewrapText(once, configuration)).toBe(once)
  })

  it('wraps a long line in the middle of a file without touching its neighbours', () => {
    const text = `data one;
  set work.example (keep=first_name last_name age city country state);
run;
data two;
run;`

    const output = rewrapText(text, config({ maxLineLength: 40 }))
    const lines = output.split('\n')

    expect(lines[0]).toBe('data one;')
    expect(lines[lines.length - 1]).toBe('run;')
    expect(output).toContain('data two;')
    expect(lines.every((line) => line.length <= 40)).toBe(true)
  })

  it('keeps a CRLF file on CRLF when the setting is off', () => {
    const text = `data _null_;\r\n  set work.example (keep=first_name last_name age city country);\r\nrun;\r\n`

    // `lineEndings` is absent, so nothing has normalised the terminators: the
    // wrap must insert the file's own ending rather than rewrite the file's.
    const output = rewrapText(text, config({ maxLineLength: 40 }))

    expect(output).toContain('\r\n')
    expect(output.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('gives the break in an unterminated final line the configured ending', () => {
    const text = `data _null_;\n  set work.example (keep=first_name last_name age city country);`

    const output = rewrapText(text, config({ maxLineLength: 40 }))

    expect(output).toEqual(`data _null_;
  set work.example (keep=first_name
    last_name age city country);`)
  })
})
