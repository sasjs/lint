import { LintConfig, Severity } from '../../types'
import { LineEndings } from '../../types/LineEndings'
import { lineEndings } from './lineEndings'

describe('lineEndings - test', () => {
  it('should return an empty array when the text contains the configured line endings', () => {
    const text = "%put 'hello';\n%put 'world';\n"
    const config = new LintConfig({ lineEndings: LineEndings.LF })
    expect(lineEndings.test(text, config)).toEqual([])
  })

  it('should return an array with a single diagnostic when a line is terminated with a CRLF ending', () => {
    const text = "%put 'hello';\n%put 'world';\r\n"
    const config = new LintConfig({ lineEndings: LineEndings.LF })
    expect(lineEndings.test(text, config)).toEqual([
      {
        message: 'Incorrect line ending - CRLF instead of LF',
        lineNumber: 2,
        startColumnNumber: 13,
        endColumnNumber: 14,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a single diagnostic when a line is terminated with an LF ending', () => {
    const text = "%put 'hello';\n%put 'world';\r\n"
    const config = new LintConfig({ lineEndings: LineEndings.CRLF })
    expect(lineEndings.test(text, config)).toEqual([
      {
        message: 'Incorrect line ending - LF instead of CRLF',
        lineNumber: 1,
        startColumnNumber: 13,
        endColumnNumber: 14,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a diagnostic for each line terminated with an LF ending', () => {
    const text = "%put 'hello';\n%put 'test';\r\n%put 'world';\n"
    const config = new LintConfig({ lineEndings: LineEndings.CRLF })
    expect(lineEndings.test(text, config)).toContainEqual({
      message: 'Incorrect line ending - LF instead of CRLF',
      lineNumber: 1,
      startColumnNumber: 13,
      endColumnNumber: 14,
      severity: Severity.Warning
    })
    expect(lineEndings.test(text, config)).toContainEqual({
      message: 'Incorrect line ending - LF instead of CRLF',
      lineNumber: 3,
      startColumnNumber: 13,
      endColumnNumber: 14,
      severity: Severity.Warning
    })
  })

  it('should return an array with a diagnostic for each line terminated with a CRLF ending', () => {
    const text = "%put 'hello';\r\n%put 'test';\n%put 'world';\r\n"
    const config = new LintConfig({ lineEndings: LineEndings.LF })
    expect(lineEndings.test(text, config)).toContainEqual({
      message: 'Incorrect line ending - CRLF instead of LF',
      lineNumber: 1,
      startColumnNumber: 13,
      endColumnNumber: 14,
      severity: Severity.Warning
    })
    expect(lineEndings.test(text, config)).toContainEqual({
      message: 'Incorrect line ending - CRLF instead of LF',
      lineNumber: 3,
      startColumnNumber: 13,
      endColumnNumber: 14,
      severity: Severity.Warning
    })
  })

  it('should return an array with a diagnostic for lines terminated with a CRLF ending', () => {
    const text =
      "%put 'hello';\r\n%put 'test';\r\n%put 'world';\n%put 'test2';\n%put 'world2';\r\n"
    const config = new LintConfig({ lineEndings: LineEndings.LF })
    expect(lineEndings.test(text, config)).toContainEqual({
      message: 'Incorrect line ending - CRLF instead of LF',
      lineNumber: 1,
      startColumnNumber: 13,
      endColumnNumber: 14,
      severity: Severity.Warning
    })
    expect(lineEndings.test(text, config)).toContainEqual({
      message: 'Incorrect line ending - CRLF instead of LF',
      lineNumber: 2,
      startColumnNumber: 12,
      endColumnNumber: 13,
      severity: Severity.Warning
    })
    expect(lineEndings.test(text, config)).toContainEqual({
      message: 'Incorrect line ending - CRLF instead of LF',
      lineNumber: 5,
      startColumnNumber: 14,
      endColumnNumber: 15,
      severity: Severity.Warning
    })
  })

  it('should return a diagnostic when the file does not end with a newline', () => {
    const text = "%put 'hello';\n%put 'world';"
    const config = new LintConfig({ lineEndings: LineEndings.LF })
    expect(lineEndings.test(text, config)).toEqual([
      {
        message: 'File does not end with a LF line ending',
        lineNumber: 2,
        startColumnNumber: 14,
        endColumnNumber: 15,
        severity: Severity.Warning
      }
    ])
  })

  it('should report a missing final newline as a CRLF ending when configured', () => {
    const text = "%put 'hello';\r\n%put 'world';"
    const config = new LintConfig({ lineEndings: LineEndings.CRLF })
    expect(lineEndings.test(text, config)).toEqual([
      {
        message: 'File does not end with a CRLF line ending',
        lineNumber: 2,
        startColumnNumber: 14,
        endColumnNumber: 15,
        severity: Severity.Warning
      }
    ])
  })

  it('should report both a wrong interior ending and a missing final newline', () => {
    const text = "%put 'hello';\r\n%put 'world';"
    const config = new LintConfig({ lineEndings: LineEndings.LF })
    const diagnostics = lineEndings.test(text, config)
    expect(diagnostics).toContainEqual({
      message: 'Incorrect line ending - CRLF instead of LF',
      lineNumber: 1,
      startColumnNumber: 13,
      endColumnNumber: 14,
      severity: Severity.Warning
    })
    expect(diagnostics).toContainEqual({
      message: 'File does not end with a LF line ending',
      lineNumber: 2,
      startColumnNumber: 14,
      endColumnNumber: 15,
      severity: Severity.Warning
    })
  })

  it('should return an empty array for an empty file', () => {
    const config = new LintConfig({ lineEndings: LineEndings.LF })
    expect(lineEndings.test('', config)).toEqual([])
  })

  it('should report a wrong-style final ending once, not as a missing ending', () => {
    // One byte, one diagnostic: the interior scan owns wrong-style endings.
    const text = "%put 'a';\r\n%put 'b';\n"
    const config = new LintConfig({ lineEndings: LineEndings.CRLF })
    const diagnostics = lineEndings.test(text, config)

    expect(diagnostics).toEqual([
      {
        message: 'Incorrect line ending - LF instead of CRLF',
        lineNumber: 2,
        startColumnNumber: 9,
        endColumnNumber: 10,
        severity: Severity.Warning
      }
    ])
  })

  it('should not report a line past the end of the file', () => {
    const text = "%put 'a';\r\n%put 'b';\n"
    const config = new LintConfig({ lineEndings: LineEndings.CRLF })
    const diagnostics = lineEndings.test(text, config)

    expect(diagnostics.some((d) => d.message.includes('does not end'))).toBe(
      false
    )
    expect(
      Math.max(...diagnostics.map((d) => d.lineNumber))
    ).toBeLessThanOrEqual(2)
  })
})

describe('lineEndings - fix', () => {
  it('should transform line endings to LF', () => {
    const text =
      "%put 'hello';\r\n%put 'test';\r\n%put 'world';\n%put 'test2';\n%put 'world2';\r\n"
    const config = new LintConfig({ lineEndings: LineEndings.LF })

    const formattedText = lineEndings.fix!(text, config)

    expect(formattedText).toEqual(
      "%put 'hello';\n%put 'test';\n%put 'world';\n%put 'test2';\n%put 'world2';\n"
    )
  })

  it('should transform line endings to CRLF', () => {
    const text =
      "%put 'hello';\r\n%put 'test';\r\n%put 'world';\n%put 'test2';\n%put 'world2';\r\n"
    const config = new LintConfig({ lineEndings: LineEndings.CRLF })

    const formattedText = lineEndings.fix!(text, config)

    expect(formattedText).toEqual(
      "%put 'hello';\r\n%put 'test';\r\n%put 'world';\r\n%put 'test2';\r\n%put 'world2';\r\n"
    )
  })

  it('should use LF line endings by default', () => {
    const text =
      "%put 'hello';\r\n%put 'test';\r\n%put 'world';\n%put 'test2';\n%put 'world2';\r\n"

    const formattedText = lineEndings.fix!(text)

    expect(formattedText).toEqual(
      "%put 'hello';\n%put 'test';\n%put 'world';\n%put 'test2';\n%put 'world2';\n"
    )
  })

  it('should append a missing final LF newline', () => {
    const text = "%put 'hello';\n%put 'world';"
    const config = new LintConfig({ lineEndings: LineEndings.LF })
    expect(lineEndings.fix!(text, config)).toEqual(
      "%put 'hello';\n%put 'world';\n"
    )
  })

  it('should append a missing final CRLF newline', () => {
    const text = "%put 'hello';\r\n%put 'world';"
    const config = new LintConfig({ lineEndings: LineEndings.CRLF })
    expect(lineEndings.fix!(text, config)).toEqual(
      "%put 'hello';\r\n%put 'world';\r\n"
    )
  })

  it('should leave an empty file alone', () => {
    const config = new LintConfig({ lineEndings: LineEndings.LF })
    expect(lineEndings.fix!('', config)).toEqual('')
  })

  it('should be idempotent', () => {
    const text = "%put 'world';"
    const config = new LintConfig({ lineEndings: LineEndings.CRLF })
    const once = lineEndings.fix!(text, config)
    expect(lineEndings.fix!(once, config)).toEqual(once)
  })
})
