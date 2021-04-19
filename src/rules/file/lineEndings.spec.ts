import { LintConfig, Severity } from '../../types'
import { LineEndings } from '../../types/LineEndings'
import { lineEndings } from './lineEndings'

describe('lineEndings', () => {
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
})
