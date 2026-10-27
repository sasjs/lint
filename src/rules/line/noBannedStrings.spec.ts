import { LintConfig, Severity } from '../../types'
import { defaultBannedStrings } from '../../utils'
import { noBannedStrings } from './noBannedStrings'

describe('noBannedStrings', () => {
  it('should return an empty array when the line has no banned string', () => {
    const line = '/* computes the totals */'
    expect(noBannedStrings.test(line, 1)).toEqual([])
  })

  it('should report a log lookalike in a comment', () => {
    const line = '/* error here */'
    expect(noBannedStrings.test(line, 1)).toEqual([
      {
        message: 'Line contains a banned string: "error "',
        lineNumber: 1,
        startColumnNumber: 4,
        endColumnNumber: 10,
        severity: Severity.Warning
      }
    ])
  })

  it('should report a log lookalike in code, not only in comments', () => {
    const line = "filename out 'c:\\warning: file.txt';"
    const diagnostics = noBannedStrings.test(line, 7)

    expect(diagnostics.length).toEqual(1)
    expect(diagnostics[0].message).toEqual(
      'Line contains a banned string: "warning:"'
    )
    expect(diagnostics[0].lineNumber).toEqual(7)
  })

  it('should match case insensitively by default', () => {
    const lines = [
      '/* ERROR: lost */',
      '/* Error: lost */',
      '/* error: lost */'
    ]

    lines.forEach((line) => {
      const diagnostics = noBannedStrings.test(line, 1)

      expect(diagnostics.length).toEqual(1)
      expect(diagnostics[0].startColumnNumber).toEqual(4)
      expect(diagnostics[0].endColumnNumber).toEqual(10)
      expect(diagnostics[0].severity).toEqual(Severity.Warning)
      // The message quotes the text as written, so the case is preserved there.
      expect(diagnostics[0].message.toLowerCase()).toEqual(
        'line contains a banned string: "error:"'
      )
    })
  })

  it('should not report a word that merely starts with a banned string', () => {
    const lines = [
      'if error_flag then do;',
      'length errors $200;',
      'set saserror;',
      '/* the warningx option */'
    ]

    lines.forEach((line) => expect(noBannedStrings.test(line, 1)).toEqual([]))
  })

  it('should match from anywhere in a word, as the entry is only text', () => {
    // The trailing space of `error ` is satisfied by the space before the `=`,
    // so an identifier that ends the word reports. This is the documented cost
    // of matching the entry as text rather than anchoring it to a word start.
    const diagnostics = noBannedStrings.test('saserror = 1;', 1)

    expect(diagnostics.length).toEqual(1)
    expect(diagnostics[0].startColumnNumber).toEqual(4)
    expect(diagnostics[0].message).toEqual(
      'Line contains a banned string: "error "'
    )
  })

  it('should report both the identifier and the literal on a line', () => {
    const diagnostics = noBannedStrings.test("saserror = 'error ';", 1)

    expect(
      diagnostics.map((diagnostic) => diagnostic.startColumnNumber)
    ).toEqual([4, 13])
  })

  it('should still ignore a banned string with no trailing delimiter', () => {
    expect(noBannedStrings.test('put saserror=;', 1)).toEqual([])
  })

  it('should not report the per-file override line', () => {
    const lines = [
      '  @sasjslint {"bannedStrings": ["todo", "error "]}',
      '  **@sasjslint {"bannedStrings": ["warning:"]}'
    ]

    lines.forEach((line) => expect(noBannedStrings.test(line, 1)).toEqual([]))
  })

  it('should still report a header line that is not the override', () => {
    const line = '  @brief Returns the error message as text'

    expect(noBannedStrings.test(line, 1).length).toEqual(1)
  })

  it('should require the trailing space to be there', () => {
    // At the end of a line the trailing space of `error ` is not present.
    expect(noBannedStrings.test('/* the error', 1)).toEqual([])
    expect(noBannedStrings.test('/* the error*/', 1)).toEqual([])
    // A space after the word is what the entry asks for, so this one reports.
    expect(noBannedStrings.test('/* the error */', 1).length).toEqual(1)
  })

  it('should report every occurrence on a line, in column order', () => {
    const line = '/* error one, warning: two */'
    const diagnostics = noBannedStrings.test(line, 3)

    expect(
      diagnostics.map((diagnostic) => diagnostic.startColumnNumber)
    ).toEqual([4, 15])
    expect(diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Line contains a banned string: "error "',
      'Line contains a banned string: "warning:"'
    ])
  })

  it('should report the longest configured string once when they overlap', () => {
    const config = new LintConfig({ bannedStrings: ['error', 'error:'] })
    const diagnostics = noBannedStrings.test('/* error: lost */', 1, config)

    expect(diagnostics.length).toEqual(1)
    expect(diagnostics[0].message).toEqual(
      'Line contains a banned string: "error:"'
    )
  })

  it('should treat a configured string literally, not as a regular expression', () => {
    const config = new LintConfig({ bannedStrings: ['{sas001}', '(c)'] })
    const diagnostics = noBannedStrings.test(
      '/* {SAS001} and (c) */',
      1,
      config
    )

    expect(diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Line contains a banned string: "{SAS001}"',
      'Line contains a banned string: "(c)"'
    ])
  })

  it('should not report source data', () => {
    const line = 'error circumstances'

    expect(
      noBannedStrings.test(line, 1, undefined, { isDataLine: true })
    ).toEqual([])
  })

  it('should honour severityLevel', () => {
    const config = new LintConfig({
      severityLevel: { noBannedStrings: 'error' }
    })

    expect(
      noBannedStrings.test('/* error here */', 1, config)[0].severity
    ).toEqual(Severity.Error)
  })

  it('should not report anything when the list is cleared', () => {
    const config = new LintConfig({ bannedStrings: [] })

    expect(config.bannedStrings).toEqual([])
    expect(noBannedStrings.test('/* error here */', 1, config)).toEqual([])
  })

  it('should ship the log lookalikes as the default list', () => {
    expect(defaultBannedStrings).toEqual([
      'error ',
      'error:',
      'warning ',
      'warning:'
    ])
  })
})
