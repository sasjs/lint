import { LintConfig } from '../types'
import { applyLintOverride } from '../utils/parseLintOverride'
import { adjustLineLength } from './adjustLineLength'

const config = (json: any) => new LintConfig(json)

/**
 * A line with no safe break point: every space it holds is inside a quoted
 * literal, so the wrapper cannot shorten it.
 */
const unbreakable = `  x = cats('a b c d e f g h i j k l m n o p q r');`

describe('adjustLineLength', () => {
  it('writes an exception at the end of the header for a line that cannot be shortened', () => {
    const text = `/**
  @file
**/
${unbreakable}
`

    expect(adjustLineLength(text, config({ maxLineLength: 40 }))).toEqual(`/**
  @file

  @sasjslint {"maxLineLength": 50}
**/
${unbreakable}
`)
  })

  it('raises a directive that already spans several lines, rather than adding a second', () => {
    // `getLintOverride` reads the first directive it finds, so a second one this
    // pass appended is dead: the long line it excused stays reported.
    const text = `/**
  @file
  @sasjslint {
    "maxHeaderLineLength": 60
  }
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;
`

    const output = adjustLineLength(
      text,
      config({ maxLineLength: 40, maxHeaderLineLength: 40 })
    )

    // The whole header: one directive holding the raised limit, and no leftover
    // lines from the object it replaced.
    expect(output).toEqual(`/**
  @file
  @sasjslint {"maxHeaderLineLength": 90}
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;
`)
  })

  it('leaves a multi-line directive alone when it already covers the line', () => {
    // Through the pipeline this pass runs in, `processOnce` hands it the
    // configuration with the file's own override already applied, so a limit that
    // is already high enough raises nothing and the object stays as written.
    const text = `/**
  @file
  @sasjslint {
    "maxHeaderLineLength": 120
  }
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;
`

    expect(
      adjustLineLength(
        text,
        applyLintOverride(
          text,
          config({ maxLineLength: 40, maxHeaderLineLength: 40 })
        )
      )
    ).toEqual(text)
  })

  it('reads the tag case-sensitively, as the reader does', () => {
    // `@SASJSLINT {` is not a directive to `getLintOverride`, so treating one as a
    // range made the pass return the file unchanged - no exception written at all.
    // It is prose to both, so the exception is appended as it was before this pass
    // learned to rewrite a directive.
    const text = `/**
  @file
  @SASJSLINT {"maxHeaderLineLength": 60}
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;
`

    const output = adjustLineLength(
      text,
      config({ maxLineLength: 40, maxHeaderLineLength: 40 })
    )

    expect(output).toContain('@SASJSLINT {"maxHeaderLineLength": 60}')
    expect(output).toContain('  @sasjslint {"maxHeaderLineLength": 90}')
  })

  it('does not read a prose mention of the tag as the directive', () => {
    // The reader requires the tag to start a line with `{` after it. A `@brief`
    // that mentions it is prose: taking it as the range start scans to the real
    // directive's closing brace and replaces every header line in between, which
    // is a silent, permanent deletion of @brief, @param and @version.
    const text = `/**
  @file
  @brief Sends the settlement, and documents the @sasjslint directive here
  @param libin input library
  @version 9.4
  @sasjslint {
    "maxHeaderLineLength": 60
  }
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;
`

    const output = adjustLineLength(
      text,
      applyLintOverride(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    )

    expect(output).toEqual(`/**
  @file
  @brief Sends the settlement, and documents the @sasjslint directive here
  @param libin input library
  @version 9.4
  @sasjslint {"maxHeaderLineLength": 90}
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;
`)
  })

  it('writes the exception when the only mention of the tag is prose', () => {
    // The loose predicate suppressed the write here: a header whose only mention
    // is prose was returned unchanged, without the exception it needs.
    const text = `/**
  @brief Sends the settlement, and documents the @sasjslint directive here
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;
`

    const output = adjustLineLength(
      text,
      config({ maxLineLength: 40, maxHeaderLineLength: 40 })
    )

    expect(output).toContain('@sasjslint {"maxHeaderLineLength": 90}')
    expect(output).toContain('@brief Sends the settlement')
  })

  it('raises maxHeaderLineLength for a header line, leaving maxLineLength alone', () => {
    const text = `/**
  @file
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;
`

    const output = adjustLineLength(
      text,
      config({ maxLineLength: 40, maxHeaderLineLength: 40 })
    )

    expect(output).toContain('  @sasjslint {"maxHeaderLineLength": 90}')
    expect(output).not.toContain('maxLineLength')
  })

  it('raises maxDataLineLength for a data record, which is not code', () => {
    const record = 'a'.repeat(90)
    const text = `/**
  @file
**/
data example;
  input x $;
  datalines;
${record}
;
run;
`

    const output = adjustLineLength(text, config({ maxLineLength: 40 }))

    expect(output).toContain('  @sasjslint {"maxDataLineLength": 90}')
    expect(output).toContain(record)
  })

  it('does not excuse a long body comment, which has no key of its own', () => {
    // Raising `maxLineLength` for a comment would relax every line of code in
    // the file, so a comment the reflow cannot fit stays a warning.
    const text = `/**
  @file
**/
/* see https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm */
run;
`

    expect(adjustLineLength(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('excuses a long line of code that carries a trailing comment', () => {
    // The comment is not what makes this line long, and no pass may break a
    // line that carries one, so it is excused like any other over-long line.
    const text = `/**
  @file
**/
  set work.example (keep=first_name last_name city); /* note */
`

    expect(adjustLineLength(text, config({ maxLineLength: 50 }))).toContain(
      '  @sasjslint {"maxLineLength": 63}'
    )
  })

  it('does not excuse a line the comment alone pushes over the limit', () => {
    const text = `/**
  @file
**/
  x = 1; /* a comment long enough to push the line over the limit */
`

    expect(adjustLineLength(text, config({ maxLineLength: 50 }))).toBe(text)
  })

  it('excuses a data record that contains a comment marker', () => {
    const record = `${'a'.repeat(40)}/*${'b'.repeat(45)}`
    const text = `/**
  @file
**/
data example;
  input x $;
  datalines;
${record}
;
run;
`

    expect(adjustLineLength(text, config({ maxLineLength: 40 }))).toContain(
      '  @sasjslint {"maxDataLineLength": 87}'
    )
  })

  it('excuses a line below a record that holds a comment marker', () => {
    // A record is data: the marker in one opens no comment, so the lines below
    // it are code and are excused like any other.
    const text = `/**
  @file
**/
data a;
  input x $;
  datalines;
abc/*def
;
${unbreakable}
`

    expect(adjustLineLength(text, config({ maxLineLength: 40 }))).toContain(
      '  @sasjslint {"maxLineLength": 50}'
    )
  })

  it('excuses a line below a record that holds an apostrophe', () => {
    const text = `/**
  @file
**/
data a;
  input name $;
  datalines;
O'Brien
;
${unbreakable}
`

    expect(adjustLineLength(text, config({ maxLineLength: 40 }))).toContain(
      '  @sasjslint {"maxLineLength": 50}'
    )
  })

  it('does not excuse a line the wrapper declines on purpose', () => {
    const text = `/**
  @file
**/
  %put NOTE: a message that is quite long indeed and will not be shortened;
%macro example(first_parameter, second_parameter, third_parameter);
%mend example;
%* a comment statement that is long enough to be reported as well ;
`

    expect(adjustLineLength(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('merges into an existing exception, keeping its other keys', () => {
    const text = `/**
  @file
  @sasjslint {"noXcmd": false, "maxLineLength": 40}
**/
${unbreakable}
`

    expect(adjustLineLength(text, config({ maxLineLength: 40 }))).toEqual(`/**
  @file
  @sasjslint {"noXcmd": false, "maxLineLength": 50}
**/
${unbreakable}
`)
  })

  it('never lowers an exception the file already carries', () => {
    const text = `/**
  @file
  @sasjslint {"maxLineLength": 200, "noXcmd": false}
**/
${unbreakable}
`

    expect(adjustLineLength(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('is idempotent - the exception it writes needs no second pass', () => {
    const text = `/**
  @file
**/
${unbreakable}
`
    const configuration = config({ maxLineLength: 40 })

    const once = adjustLineLength(text, configuration)

    expect(adjustLineLength(once, configuration)).toBe(once)
  })

  it('takes the configured ending for the line it writes into an unterminated header', () => {
    const lf = `/**
  @file
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/`
    const crlf = lf.replace(/\n/g, '\r\n')

    const lfOut = adjustLineLength(
      lf,
      config({ maxLineLength: 40, maxHeaderLineLength: 40 })
    )
    const crlfOut = adjustLineLength(
      crlf,
      config({
        maxLineLength: 40,
        maxHeaderLineLength: 40,
        lineEndings: 'crlf'
      })
    )

    expect(lfOut).toContain('\n  @sasjslint {"maxHeaderLineLength": 90}\n**/')
    expect(lfOut.endsWith('**/')).toBe(true)
    expect(crlfOut).toContain(
      '\r\n  @sasjslint {"maxHeaderLineLength": 90}\r\n**/'
    )
    expect(crlfOut.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('indents by two spaces when the header content is not indented', () => {
    const text = `/**
@file
**/
${unbreakable}
`

    expect(adjustLineLength(text, config({ maxLineLength: 40 }))).toBe(`/**
@file

  @sasjslint {"maxLineLength": 50}
**/
${unbreakable}
`)
  })

  it('adds no blank line when the header already ends in one', () => {
    const text = `/**
  @file

**/
${unbreakable}
`

    expect(adjustLineLength(text, config({ maxLineLength: 40 }))).toBe(`/**
  @file

  @sasjslint {"maxLineLength": 50}
**/
${unbreakable}
`)
  })

  it('does nothing when the file has no header to write into', () => {
    const text = `${unbreakable}
`

    expect(adjustLineLength(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('does nothing when the header closes on a line carrying content', () => {
    const text = `/**
  @file **/
${unbreakable}
`

    expect(adjustLineLength(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('reads an escaped quote in the object, and indents a directive at column 0', () => {
    // The scan tracks string state and escapes as `getLintOverride` does, so a
    // `\"` inside a value does not end the object early; a directive written at
    // column 0 takes the header's indent when it is rewritten.
    const text = `/**
@sasjslint {"note": "say \\"hi\\"", "maxHeaderLineLength": 60}
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;
`

    expect(
      adjustLineLength(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toEqual(`/**
  @sasjslint {"note": "say \\"hi\\"", "maxHeaderLineLength": 90}
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;
`)
  })

  it('leaves an unterminated directive alone', () => {
    // An object that never closes is the author's to fix: the linter reports it,
    // and rewriting it would discard what they were trying to say.
    const text = `/**
  @file
  @sasjslint {"maxLineLength": 40
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;
`

    expect(
      adjustLineLength(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toEqual(text)
  })

  it('leaves an exception that does not parse alone', () => {
    const text = `/**
  @file
  @sasjslint {not json}
**/
${unbreakable}
`

    expect(adjustLineLength(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('keeps the text that shares the closing line of the directive', () => {
    // The tag line is rebuilt from the merged object, so anything after the
    // object's closing brace on that line - a trailing comment here - has to be
    // carried through rather than deleted.
    const text = `/**
  @file
  @sasjslint {"maxLineLength": 60}  // see below
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;
`

    expect(
      adjustLineLength(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toEqual(`/**
  @file
  @sasjslint {"maxLineLength": 60, "maxHeaderLineLength": 90}  // see below
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;
`)
  })

  it('keeps the header closer when the directive shares its line', () => {
    // A directive written on the header's closing line: rebuilding the tag line
    // without the text that followed the object would take `**/` with it and
    // leave the comment unterminated.
    const text = `/**
  @file
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
  @sasjslint {"maxLineLength": 60}  **/
run;
`

    expect(
      adjustLineLength(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toEqual(`/**
  @file
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
  @sasjslint {"maxLineLength": 60, "maxHeaderLineLength": 90}  **/
run;
`)
  })

  it('leaves an object that does not close inside the header alone', () => {
    // The reader reads the same span, so it cannot see this object either. The
    // tag must not be rewritten while the rest of the object stays where it is.
    const text = `/**
  @file
  @sasjslint {"maxLineLength": 60
**/
  }
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;
`

    expect(adjustLineLength(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('leaves a directive alone when the reader and this pass disagree about it', () => {
    // `startsDirective` accepts any non-word characters before the tag, so a `{{`
    // in front of it opens a scan this pass counts from, while the reader starts
    // at the tag's own brace and parses an object. The two disagree about where
    // the object ends, so there is no range to rewrite: touching the tag line
    // would delete the `{{` and leave the object the reader saw half-replaced.
    const text = `/**
  @file
  {{ @sasjslint {"maxLineLength": 60}
  @brief https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;
`

    expect(adjustLineLength(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('does nothing when the limit is off, or the text is empty', () => {
    const text = `/**
  @file
**/
${unbreakable}
`
    const configuration = config({ maxLineLength: 0 })

    expect(configuration.maxLineLength).toBe(80)
    expect(adjustLineLength(text, configuration)).toBe(text)
    expect(adjustLineLength('', configuration)).toBe('')
  })
})
