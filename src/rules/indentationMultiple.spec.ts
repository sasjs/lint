import { LintConfig, Severity } from '../types'
import { indentationMultiple } from './indentationMultiple'

describe('indentationMultiple', () => {
  it('should return an empty array when the line is indented by two spaces', () => {
    const line = "  %put 'hello';"
    const config = new LintConfig({ indentationMultiple: 2 })
    expect(indentationMultiple.test(line, 1, config)).toEqual([])
  })

  it('should return an empty array when the line is indented by a multiple of 2 spaces', () => {
    const line = "      %put 'hello';"
    const config = new LintConfig({ indentationMultiple: 2 })
    expect(indentationMultiple.test(line, 1, config)).toEqual([])
  })

  it('should return an empty array when the line is not indented', () => {
    const line = "%put 'hello';"
    const config = new LintConfig({ indentationMultiple: 2 })
    expect(indentationMultiple.test(line, 1, config)).toEqual([])
  })

  it('should return an array with a single diagnostic when the line is indented incorrectly', () => {
    const line = "   %put 'hello';"
    const config = new LintConfig({ indentationMultiple: 2 })
    expect(indentationMultiple.test(line, 1, config)).toEqual([
      {
        message: `Line has incorrect indentation - 3 spaces`,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a single diagnostic when the line is indented incorrectly', () => {
    const line = "  %put 'hello';"
    const config = new LintConfig({ indentationMultiple: 3 })
    expect(indentationMultiple.test(line, 1, config)).toEqual([
      {
        message: `Line has incorrect indentation - 2 spaces`,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })

  it('should fall back to a default of 2 spaces', () => {
    const line = " %put 'hello';"
    expect(indentationMultiple.test(line, 1)).toEqual([
      {
        message: `Line has incorrect indentation - 1 space`,
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an empty array for lines within the default indentation', () => {
    const line = "  %put 'hello';"
    expect(indentationMultiple.test(line, 1)).toEqual([])
  })
})
