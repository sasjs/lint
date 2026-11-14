import { LintConfig } from '../types'
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

  it('leaves an exception that does not parse alone', () => {
    const text = `/**
  @file
  @sasjslint {not json}
**/
${unbreakable}
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
