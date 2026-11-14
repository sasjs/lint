import { LintConfig } from '../types'
import { rewrapText } from './rewrapText'

const config = (json: any) => new LintConfig(json)

/**
 * The text as SAS reads it: a `%trim(` carrying nothing but the newline and the
 * indentation of a break resolves to no characters at all, and the blank after
 * the closing `)` is the one the break replaced. Substituting it back has to
 * give the line the pass started with.
 */
const withoutTrim = (text: string): string =>
  text.replace(/%trim\(\s*\) /g, ' ')

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

  it('does not break inside %sysfunc, whose arguments reach a DATA step function', () => {
    // Measured on a live engine: breaking this line wrote
    // `Content-Type:   application/csv` - the newline and the continuation
    // indent became part of the text the macro was writing.
    const text = `%let rc=%sysfunc(fput(&fid,%str(&header_name): %str(&header_value)));`
    const quoted = `%let x=%qsysfunc(fput(&fid,%str(&name): %str(&value)));`

    expect(rewrapText(text, config({ maxLineLength: 40 }))).toBe(text)
    expect(rewrapText(quoted, config({ maxLineLength: 40 }))).toBe(quoted)
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

  it('prefers a break that does not leave a macro keyword at the end of a line', () => {
    const text = `  %if &condition ne 1 %then %let name=value;`

    expect(rewrapText(text, config({ maxLineLength: 30 }))).toEqual(
      `  %if &condition ne 1
    %then %let name=value;`
    )
  })

  it('leaves a line alone when the only break would strand a keyword', () => {
    const text = `  %let abcdefghijklmnopqrstuvwxyz = 1;`

    // The one space that fits sits after `%let`, and the tail has no break of
    // its own, so no wrap of this line fits the limit.
    expect(rewrapText(text, config({ maxLineLength: 20 }))).toBe(text)
  })

  it('leaves a code line with a trailing comment alone', () => {
    const text = `data _null_;
  set work.example (keep=first_name last_name age city country); /* note */`

    expect(rewrapText(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('breaks a %put with %trim, which swallows the newline it creates', () => {
    const text = `%put NOTE: the macro could not find the requested table and stopped;`
    const output = rewrapText(text, config({ maxLineLength: 60 }))

    expect(output).toBe(
      `%put NOTE: the macro could not find the requested%trim(\n  ) table and stopped;`
    )
    expect(withoutTrim(output)).toBe(text)
  })

  it('breaks the &mD.put form the same way, since it resolves to %put', () => {
    const text = `%&mD.put NOTE: Creating direct (non META) connection to &libref;`
    const output = rewrapText(text, config({ maxLineLength: 60 }))

    expect(output).toContain('%trim(\n')
    expect(withoutTrim(output)).toBe(text)
  })

  it('breaks put and putlog, whose newline is an output line, without adding one', () => {
    const putlog = `    putlog "reading" libds= rc= count= anything else that runs long;`
    const put = `  put "value" a b c d e f g h i j k l m n o p q r s t u v w x y z;`

    ;[putlog, put].forEach((line) => {
      const output = rewrapText(line, config({ maxLineLength: 60 }))

      expect(output).toContain('%trim(\n')
      expect(withoutTrim(output)).toBe(line)
      expect(output.split('\n').every((piece) => piece.length <= 60)).toBe(true)
    })
  })

  it('breaks a put statement opened on a previous line too', () => {
    const text = `data _null_;
  put aaaaaa bbbbbb cccccc
    dddddd eeeeee ffffff gggggg hhhhhh iiiiii jjjjjj;
run;`

    const output = rewrapText(text, config({ maxLineLength: 40 }))

    // The second line is more of the same put statement, and it keeps its own
    // indentation while gaining the %trim that keeps the line count.
    expect(output.split('\n')[2]).toMatch(/^    dddddd .*%trim\($/)
    expect(withoutTrim(output)).toBe(text)
  })

  it('breaks a put in a THEN branch, and wraps the next statement', () => {
    const text = `data _null_;
  if found then put "one" two three four five six seven eight nine ten;
  set work.example (keep=first_name last_name age city country);
run;`

    const output = rewrapText(text, config({ maxLineLength: 40 }))

    expect(output.split('\n')[1]).toMatch(
      /^  if found then put "one".*%trim\($/
    )
    // The statement the pass inserts resolves back to the one line it was,
    // even though a later line was wrapped the ordinary way.
    expect(withoutTrim(output).split('\n')[1]).toBe(
      '  if found then put "one" two three four five six seven eight nine ten;'
    )
    expect(output).toContain('  set work.example (keep=first_name\n')
  })

  it('does not let a masked apostrophe open a literal', () => {
    // `%str(%')` is how a single quote is written, so the apostrophe is masked
    // text; reading it as the start of a literal would carry a phantom string
    // over every line below it and switch the pass off for the rest of the file.
    const text = `%let q = %str(%');
data _null_;
  set work.example (keep=first_name last_name age city country);
run;`

    expect(rewrapText(text, config({ maxLineLength: 40 }))).toEqual(
      `%let q = %str(%');
data _null_;
  set work.example (keep=first_name
    last_name age city country);
run;`
    )
  })

  it('wraps a line below a literal holding a data-section keyword', () => {
    // `a;cards;` inside a string is a statement boundary the scanner must not
    // see, or the lines below it are read as a data record and never wrapped.
    const text = `data _null_;
  x = "a;cards;";
  set work.example (keep=first_name last_name city);
run;`

    expect(rewrapText(text, config({ maxLineLength: 40 }))).toEqual(
      `data _null_;
  x = "a;cards;";
  set work.example (keep=first_name
    last_name city);
run;`
    )
  })

  it('leaves a data section alone when its opener follows another statement', () => {
    // A newline inside a record ends it, so wrapping these lines would give SAS
    // four records of the wrong width in place of the two it reads.
    const text = `data example;
  input name $ amount; cards;
Alice_Anderson 100 200 300
Bob_Brown 400 500 600
;
run;`

    expect(rewrapText(text, config({ maxLineLength: 20 }))).toBe(text)
  })

  it('wraps a line below a record that holds a comment marker', () => {
    const text = `data a;
  input x $;
  datalines;
abc/*def
;
data _null_;
  set work.example (keep=first_name last_name age city country);
run;`

    expect(rewrapText(text, config({ maxLineLength: 40 }))).toContain(
      '  set work.example (keep=first_name\n    last_name age city country);'
    )
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

  it('breaks a macro declaration before its parameter commas', () => {
    const declaration = `%macro example(first_parameter, second_parameter, third_parameter);`
    const mend = `%mend example;`

    expect(rewrapText(declaration, config({ maxLineLength: 40 }))).toBe(
      `%macro example(first_parameter\n  , second_parameter, third_parameter);`
    )
    // `%mend` has no parameters to break at.
    expect(rewrapText(mend, config({ maxLineLength: 10 }))).toBe(mend)
  })

  it('leaves a declaration it cannot read as one statement alone', () => {
    const noClose = `%macro example(first_parameter, second_parameter;`
    const noParameters = `%macro example();`
    const oneLongParameter = `%macro example(a_parameter_that_is_longer_than_the_limit);`
    // Neither the first piece nor a continuation can hold this parameter.
    const oneLongContinuation = `%macro example(a, b_parameter_that_is_way_too_long);`

    ;[noClose, noParameters, oneLongParameter, oneLongContinuation].forEach(
      (line) => {
        expect(rewrapText(line, config({ maxLineLength: 30 }))).toBe(line)
      }
    )
  })

  it('breaks a declaration only at a comma between parameters', () => {
    // The comma inside `%str(` is part of a default value, and the comma
    // inside the nested call belongs to that call.
    const text = `%macro example(one=%str(a,b), two=%scan(&list,1,%str(,)), three=3);`

    const output = rewrapText(text, config({ maxLineLength: 40 }))

    expect(output).toBe(
      `%macro example(one=%str(a,b)\n  , two=%scan(&list,1,%str(,)), three=3\n  );`
    )
  })

  it('puts the terminator on a line of its own when it will not fit', () => {
    const text = `%macro example(first_parameter, second_parameter);`

    expect(rewrapText(text, config({ maxLineLength: 30 }))).toBe(
      `%macro example(first_parameter\n  , second_parameter);`
    )
  })

  it('fits a declaration piece that lands exactly on the limit', () => {
    // The continuation `  , ` plus this parameter is exactly 30 characters, and
    // the terminator would take it past the limit.
    const tailDoesNotFit = `%macro example(a, bbbbbbbbbbbbbbbbbbbbbbbbbb);`

    expect(rewrapText(tailDoesNotFit, config({ maxLineLength: 30 }))).toBe(
      `%macro example(a\n  , bbbbbbbbbbbbbbbbbbbbbbbbbb\n  );`
    )

    // Here the continuation and the terminator together are exactly 30, so both
    // take the same line.
    const exactlyTheLimit = `%macro example(a, cccccccccccccccccccccccc);`

    expect(rewrapText(exactlyTheLimit, config({ maxLineLength: 30 }))).toBe(
      `%macro example(a\n  , cccccccccccccccccccccccc);`
    )
  })

  it('keeps every piece within the limit, at any limit', () => {
    const statements = [
      `  set work.example (keep=first_name last_name age city country state);`,
      `  put "value" a b c d e f g h i j k l m n o p q r s t u v w x y z;`,
      `  %put NOTE: the macro could not find the requested table and stopped;`,
      `%macro example(first_parameter, second_parameter, third_parameter);`,
      `  %let numbers = 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20;`
    ]

    ;[20, 24, 30, 34, 40, 44, 50, 60].forEach((limit) => {
      statements.forEach((line) => {
        const output = rewrapText(line, config({ maxLineLength: limit }))

        // A line the pass declines leaves every piece as it was, which is the
        // documented rule; a line it rewrites must fit.
        if (output === line) return

        expect(output.split('\n').every((piece) => piece.length <= limit)).toBe(
          true
        )

        // Nothing is dropped and nothing is added, apart from the whitespace a
        // break replaces and the `%str( )` that carries it.
        expect(withoutTrim(output).replace(/\s+/g, '')).toBe(
          line.replace(/\s+/g, '')
        )
      })
    })
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
