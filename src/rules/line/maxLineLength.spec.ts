import { LintConfig, Severity } from '../../types'
import { maxLineLength } from './maxLineLength'

describe('maxLineLength', () => {
  it('should return an empty array when the line is within the specified length', () => {
    const line = "%put 'hello';"
    const config = new LintConfig({ maxLineLength: 60 })
    expect(maxLineLength.test(line, 1, config)).toEqual([])
  })

  it('should return an array with a single diagnostic when the line exceeds the specified length', () => {
    const line = "%put 'hello';"
    const config = new LintConfig({ maxLineLength: 10 })
    expect(maxLineLength.test(line, 1, config)).toEqual([
      {
        message: `Line exceeds maximum length by 3 characters`,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })

  it('should fall back to a default of 80 characters', () => {
    const line =
      'Prow scuttle parrel provost Sail ho shrouds spirits boom mizzenmast yardarm. Pinnace holystone.'
    expect(maxLineLength.test(line, 1)).toEqual([
      {
        message: `Line exceeds maximum length by 15 characters`,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an empty array for lines within the default length', () => {
    const line =
      'Prow scuttle parrel provost Sail ho shrouds spirits boom mizzenmast yard'
    expect(maxLineLength.test(line, 1)).toEqual([])
  })

  it('should return an array with a single diagnostic when the line in header section exceeds the specified length', () => {
    const line = 'This line is from header section'
    const config = new LintConfig({
      maxLineLength: 10,
      maxHeaderLineLength: 15
    })
    expect(maxLineLength.test(line, 1, config, { isHeaderLine: true })).toEqual(
      [
        {
          message: `Line exceeds maximum length by ${
            line.length - config.maxHeaderLineLength
          } characters`,
          lineNumber: 1,
          startColumnNumber: 1,
          endColumnNumber: 1,
          severity: Severity.Warning
        }
      ]
    )
  })

  it('should return an array with a single diagnostic when the line in data section exceeds the specified length', () => {
    const line = 'GROUP_LOGIC:$3. SUBGROUP_LOGIC:$3. SUBGROUP_ID:8.'
    const config = new LintConfig({
      maxLineLength: 10,
      maxDataLineLength: 15
    })
    expect(maxLineLength.test(line, 1, config, { isDataLine: true })).toEqual([
      {
        message: `Line exceeds maximum length by ${
          line.length - config.maxDataLineLength
        } characters`,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })
})
