import { LintConfig } from '../types'
import { reflowComments } from './reflowComments'

const config = (json: any) => new LintConfig(json)

describe('reflowComments', () => {
  it('wraps a comment paragraph and indents the continuation', () => {
    const text = `data _null_;
/* the quick brown fox jumps over the lazy dog and keeps on
  running until it reaches the end of the line */
run;`

    expect(reflowComments(text, config({ maxLineLength: 40 }))).toEqual(
      `data _null_;
/* the quick brown fox jumps over the
  lazy dog and keeps on running until it
  reaches the end of the line */
run;`
    )
  })

  it('normalises the runs of spaces inside the paragraph it rewrites', () => {
    const text = `data _null_;
/* the quick brown fox jumps.  It keeps on running until it
  reaches the end of the line */
run;`

    expect(reflowComments(text, config({ maxLineLength: 40 }))).toEqual(
      `data _null_;
/* the quick brown fox jumps. It keeps
  on running until it reaches the end of
  the line */
run;`
    )
  })

  it('leaves a blank-separated code sample in the comment byte-identical', () => {
    const text = `data _null_;
/* a paragraph that is long enough to need wrapping here

      keep=x y z   label='a';
  and prose after the sample */
run;`

    expect(reflowComments(text, config({ maxLineLength: 40 }))).toEqual(
      `data _null_;
/* a paragraph that is long enough to
  need wrapping here

      keep=x y z   label='a';
  and prose after the sample */
run;`
    )
  })

  it('starts a new paragraph at each Doxygen tag, and wraps a tag with its continuation', () => {
    const text = `data _null_;
/* @param x - a description long enough to need wrapping here
  and a continuation
  @param y - short */
run;`

    expect(reflowComments(text, config({ maxLineLength: 40 }))).toEqual(
      `data _null_;
/* @param x - a description long enough
  to need wrapping here and a
  continuation
  @param y - short */
run;`
    )
  })

  it('leaves @li entries alone, whose continuation would end the list', () => {
    const text = `data _null_;
/* notes:
  @li mf_getuser.sas - returns the current user id from the metadata
  @li mf_trim.sas - trims */
run;`

    expect(reflowComments(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('leaves a list item and the prose around it alone', () => {
    const text = `data _null_;
/* a paragraph that is long enough to need wrapping here
  - first item
  and prose again */
run;`

    expect(reflowComments(text, config({ maxLineLength: 40 }))).toEqual(
      `data _null_;
/* a paragraph that is long enough to
  need wrapping here
  - first item
  and prose again */
run;`
    )
  })

  it('leaves the <h4> SAS Macros </h4> section alone', () => {
    const text = `/**
  @file

  <h4> SAS Macros </h4>
  @li mf_getuser.sas - returns the current user id from the metadata
**/
run;`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toBe(text)
  })

  it('leaves a block holding an @example body alone', () => {
    const text = `/**
  @file
  @example
  data example; set work.a (keep=x y z); run;
**/
run;`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toBe(text)
  })

  it('leaves a @sasjslint tag alone, whose object must stay on its line', () => {
    const text = `/**
  @file
  @sasjslint {"maxLineLength": 40, "noTabs": true, "noXcmd": false}
**/
run;`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toBe(text)
  })

  it('wraps a comment that starts and ends on one line, keeping its marker at the end', () => {
    const text = `data _null_;
  /* the quick brown fox jumps over the lazy dog */
run;`

    expect(reflowComments(text, config({ maxLineLength: 40 }))).toEqual(
      `data _null_;
  /* the quick brown fox jumps over the
    lazy dog */
run;`
    )
  })

  it('leaves a block alone when a line it covers closes it and carries code', () => {
    const text = `data _null_;
/* a comment that starts here and runs
  on to here */ x = 1;
run;`

    expect(reflowComments(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('leaves a one-line comment alone when code follows its marker', () => {
    const text = `data _null_;
  /* the quick brown fox jumps over the lazy dog */ x = 1;
run;`

    expect(reflowComments(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('takes the configured ending for the lines it inserts at the end of a file', () => {
    const text = `data _null_;
/* the quick brown fox jumps over the lazy dog and keeps on
  running until it reaches the end of the line */`

    const output = reflowComments(text, config({ maxLineLength: 40 }))

    expect(output).toEqual(`data _null_;
/* the quick brown fox jumps over the
  lazy dog and keeps on running until it
  reaches the end of the line */`)
    expect(output.endsWith('line */')).toBe(true)
  })

  it('leaves a comment that shares a line with code alone', () => {
    const text = `data _null_; /* a comment long enough that it would be wrapped */
run;`

    expect(reflowComments(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('leaves a comment inside a datalines record alone', () => {
    const text = `data example;
  input line $80.;
  datalines;
/* this record is data, and it is long enough to need wrapping here
;
run;`

    expect(reflowComments(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('leaves a paragraph holding a word longer than the limit alone', () => {
    const text = `/**
  @file
  @brief See https://support.sas.com/documentation/cdl/en/lrdict/64316/HTML/default/viewer.htm
**/
run;`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toBe(text)
  })

  it('wraps a paragraph that holds the closing marker', () => {
    const text = `data _null_;
/* a paragraph long enough to need wrapping at this
  length and ending here */
run;`

    expect(reflowComments(text, config({ maxLineLength: 40 }))).toEqual(
      `data _null_;
/* a paragraph long enough to need
  wrapping at this length and ending
  here */
run;`
    )
  })

  it('leaves an unclosed comment alone, which has no closer to re-emit', () => {
    const text = `data _null_;
/* a paragraph long enough to need wrapping at this length
run;`

    expect(reflowComments(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('measures a header line against the higher of the two limits', () => {
    const text = `/**
  @file
  @brief A brief that fits the header limit but not the code limit
**/
run;`

    // 66 characters: over `maxLineLength` and under `maxHeaderLineLength`.
    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 70 })
      )
    ).toBe(text)
  })

  it('keeps a CRLF file on CRLF when the setting is off', () => {
    const text = `data _null_;\r\n/* the quick brown fox jumps over the lazy dog and keeps on\r\n  running until it reaches the end of the line */\r\nrun;\r\n`

    const output = reflowComments(text, config({ maxLineLength: 40 }))

    expect(output).toContain('\r\n')
    expect(output.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('is idempotent - reflowing its own output changes nothing', () => {
    const text = `data _null_;
/* the quick brown fox jumps over the lazy dog and keeps on
  running until it reaches the end of the line */
run;`
    const configuration = config({ maxLineLength: 40 })

    const once = reflowComments(text, configuration)

    expect(reflowComments(once, configuration)).toBe(once)
  })

  it('does nothing when the limit is off, or the text is empty', () => {
    const text = `data _null_;
/* the quick brown fox jumps over the lazy dog and keeps on
  running until it reaches the end of the line */
run;`
    const configuration = config({ maxLineLength: 0 })

    expect(configuration.maxLineLength).toBe(80)
    expect(reflowComments(text, configuration)).toBe(text)
    expect(reflowComments('', configuration)).toBe('')
  })
})
