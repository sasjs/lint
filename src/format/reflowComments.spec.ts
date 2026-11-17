import { LintConfig } from '../types'
import { reflowComments } from './reflowComments'

const config = (json: any) => new LintConfig(json)

describe('reflowComments', () => {
  it('wraps the prose of a header that holds a SAS Macros list, leaving the list alone', () => {
    // The list is other rules' data - `noUnusedMacros` and `lowerCaseMacroNames`
    // parse and rewrite it - so it stays byte-identical while the paragraph above
    // it is wrapped like any other.
    const text = `/**
  @brief a header with a long description that runs well past the width
  <h4> SAS Macros </h4>
  @li mf_existds.sas
  @li mf_abort.sas
**/
data _null_;
run;`

    // Header lines are measured against max(maxLineLength, maxHeaderLineLength),
    // so both have to be tightened for this fixture to be over the limit.
    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toEqual(`/**
  @brief a header with a long
  description that runs well past the
  width
  <h4> SAS Macros </h4>
  @li mf_existds.sas
  @li mf_abort.sas
**/
data _null_;
run;`)
  })

  it('leaves the macros section at the next tag, and wraps what follows it', () => {
    const text = `/**
  <h4> SAS Macros </h4>
  @li mf_existds.sas
  @version 9.4
  @brief a description after the list that is long enough to wrap here
**/
data _null_;
run;`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toEqual(`/**
  <h4> SAS Macros </h4>
  @li mf_existds.sas
  @version 9.4
  @brief a description after the list
  that is long enough to wrap here
**/
data _null_;
run;`)
  })

  it('wraps prose around a @sasjslint directive, leaving the directive alone', () => {
    // The directive is one line and adjustLineLength owns it; the prose beside it
    // is prose like any other.
    const text = `/**
  @brief a description that is long enough to be wrapped by this pass
  @sasjslint {"maxLineLength": 150}
**/
data _null_;
run;`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toEqual(`/**
  @brief a description that is long
  enough to be wrapped by this pass
  @sasjslint {"maxLineLength": 150}
**/
data _null_;
run;`)
  })

  it('wraps the prose around an @example body, leaving the body alone', () => {
    const text = `/**
  @brief a description that is long enough to be wrapped by this pass
  @example
    %let x = 1;
  @version 9.4
**/
data _null_;
run;`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toEqual(`/**
  @brief a description that is long
  enough to be wrapped by this pass
  @example
    %let x = 1;
  @version 9.4
**/
data _null_;
run;`)
  })

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

  it('leaves a multi-line @sasjslint object exactly as written', () => {
    // `getLintOverride` reads a balanced object starting at the tag, so an
    // override may span lines. Reflowing its continuation lines as prose can wrap
    // inside a string value, which leaves an object nothing can parse - the file
    // would lose its overrides and the run would look clean.
    const text = `/**
  @brief a description that is long enough to be wrapped by this pass
  @sasjslint {
    "maxLineLength": 150,
    "maxHeaderLineLength": 150,
    "ignoredMacros": ["webout", "mf_abort"]
  }
**/
data _null_;
run;`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toEqual(`/**
  @brief a description that is long
  enough to be wrapped by this pass
  @sasjslint {
    "maxLineLength": 150,
    "maxHeaderLineLength": 150,
    "ignoredMacros": ["webout", "mf_abort"]
  }
**/
data _null_;
run;`)
  })

  it('does not end a @sasjslint object at a brace inside a string', () => {
    // The scan tracks string state and escapes exactly as `getLintOverride`'s
    // reader does: a `}` inside a value, or a `\"` that would otherwise close the
    // string, must not be read as the end of the object.
    const text = `/**
  @brief a description that is long enough to be wrapped by this pass
  @sasjslint {
    "note": "say \\"hi\\" to the } brace",
    "maxLineLength": 150
  }
**/
data _null_;
run;`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toEqual(`/**
  @brief a description that is long
  enough to be wrapped by this pass
  @sasjslint {
    "note": "say \\"hi\\" to the } brace",
    "maxLineLength": 150
  }
**/
data _null_;
run;`)
  })

  it('reserves an object that never closes, to the end of the block', () => {
    // An unclosed object cannot be read, but its lines are still data: reserving
    // the tag line alone reflows the rest as prose, and a wrap inside a string
    // value changes what the object says.
    const text = `/**
  @brief a description that is long enough to wrap at this limit for sure
  @sasjslint {"maxLineLength": 150, "description": "this value continues here
  and here and here with more words that would be wrapped as prose"
**/
data _null_;
run;`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 60, maxHeaderLineLength: 60 })
      )
    ).toEqual(`/**
  @brief a description that is long enough to wrap at this
  limit for sure
  @sasjslint {"maxLineLength": 150, "description": "this value continues here
  and here and here with more words that would be wrapped as prose"
**/
data _null_;
run;`)
  })

  it('wraps the prose above a directive, even when a line mentions the tag', () => {
    // The scan must open only on the reader's own predicate. A `@brief` that
    // mentions the tag used to open it, and every line up to the real directive's
    // closing brace was emitted verbatim - so the prose was silently left unwrapped.
    const text = `/**
  @brief a description that mentions the @sasjslint directive and is long enough to wrap
  @param libin input library
  @sasjslint {
    "maxLineLength": 150
  }
**/
data _null_;
run;`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 60, maxHeaderLineLength: 60 })
      )
    ).toEqual(`/**
  @brief a description that mentions the @sasjslint
  directive and is long enough to wrap
  @param libin input library
  @sasjslint {
    "maxLineLength": 150
  }
**/
data _null_;
run;`)
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

  it('moves a word down when the closing marker would not fit beside it', () => {
    const text = `data _null_;
/* bravo bravo india golf charlie foxtrot */
run;`

    // Greedy alone would leave `  golf charlie foxtrot */`, one over the limit,
    // so the last word moves to a line of its own.
    expect(reflowComments(text, config({ maxLineLength: 24 }))).toEqual(
      `data _null_;
/* bravo bravo india
  golf charlie
  foxtrot */
run;`
    )
  })

  it('leaves the paragraph alone when the marker cannot be made to fit', () => {
    const text = `data _null_;
/* x averylongwordthatcannotfit */
run;`

    expect(reflowComments(text, config({ maxLineLength: 20 }))).toBe(text)
  })

  it('reflows a comment below a record that holds a comment marker', () => {
    const text = `data a;
  input x $;
  datalines;
abc/*def
;
data _null_;
/* the quick brown fox jumps over the lazy dog and keeps on
  running until it reaches the end of the line */
run;`

    expect(reflowComments(text, config({ maxLineLength: 40 }))).toContain(
      '/* the quick brown fox jumps over the\n  lazy dog'
    )
  })

  it('leaves a block alone when a data section starts before its closer', () => {
    // The opener is prose, but the line that closes it also opens a data
    // section - so the block covers a record, and a rewrite could move it.
    const text = `data _null_;
/* a comment that starts here
  and ends on the next line */ cards;
a b c d e f g h i j k l m n o p
;
run;`

    expect(reflowComments(text, config({ maxLineLength: 40 }))).toBe(text)
  })

  it('leaves a paragraph alone when its first word cannot fit the opener line', () => {
    const text = `data _null_;
/* averylongwordthatislong more words here */
run;`

    expect(reflowComments(text, config({ maxLineLength: 20 }))).toBe(text)
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

  it('wraps a starred body line and keeps the marker on every line', () => {
    // A `*` that decorates a block-comment body line reads as a list marker if
    // it is left in the content, so a starred paragraph used to be treated as
    // line-oriented and never wrapped - the line sat over the limit and no pass
    // would shorten it. The marker belongs to the lead, not the text.
    const text = `/**
  @file x
**/

%macro x();
  %let a=1;

    /**
      * First check we are not in the tests/macros folder
      * or in the testsetup services
    */
  %let b=2;
%mend x;
`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toEqual(`/**
  @file x
**/

%macro x();
  %let a=1;

    /**
      * First check we are not in the
      * tests/macros folder or in the
      * testsetup services
    */
  %let b=2;
%mend x;
`)
  })

  it('leaves a bulleted list in a starred comment alone', () => {
    // The decoration is stripped, a real bullet is not: `- item` still reads as
    // a list and every one of its lines stays as written.
    const text = `/**
  @file x
**/

/*
  * - a bullet item that runs well past the width of the configured limit
  * - another bullet
*/
`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toEqual(text)
  })

  it('leaves a bullet list at the margin alone', () => {
    // `*` at the margin of an ordinary comment is the list marker, not
    // decoration: with no marker past the block's indentation the block is
    // undecorated, and every line of it stays as written.
    const text = `/**
  @file x
**/

/*
* item one that runs well past the width of the limit
* item two is here
*/
`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toEqual(text)
  })

  it('keeps emphasis at the start of a line as content', () => {
    // `*emphasis*` has no space after the asterisk, so it is not a marker: the
    // paragraph wraps like prose and no continuation line grows a `*`.
    const text = `/**
  @file x
**/

/*
*emphasis* is what this sentence is about, and it runs past the limit
and continues here
*/
`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toEqual(`/**
  @file x
**/

/*
*emphasis* is what this sentence is
about, and it runs past the limit and
continues here
*/
`)
  })

  it('strips one marker from a decorated line whose text starts with another', () => {
    const text = `/**
  @file x
**/

%macro x();
  %let a=1;

  /*
    * **Note:** this sentence runs past the configured width of the limit
    * and continues here
  */
%mend x;
`

    expect(
      reflowComments(
        text,
        config({ maxLineLength: 40, maxHeaderLineLength: 40 })
      )
    ).toEqual(`/**
  @file x
**/

%macro x();
  %let a=1;

  /*
    * **Note:** this sentence runs past
    * the configured width of the limit
    * and continues here
  */
%mend x;
`)
  })
})
