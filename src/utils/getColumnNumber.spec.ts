import { getColumnNumber } from './getColumnNumber'

describe('getColumnNumber', () => {
  it('should return the column number of the specified string within a line of text', () => {
    expect(getColumnNumber('foo bar', 'bar')).toEqual(5)
  })

  it('should throw an error when the specified string is not found within the text', () => {
    expect(() => getColumnNumber('foo bar', 'baz')).toThrow(
      "String 'baz' was not found in line 'foo bar'"
    )
  })

  it('should find the text without regard to case when asked', () => {
    expect(getColumnNumber('  %MACRO foo();', '%macro', true)).toEqual(3)
  })

  it('should match the case of the text by default', () => {
    expect(() => getColumnNumber('  %MACRO foo();', '%macro')).toThrow(
      "String '%macro' was not found in line '  %MACRO foo();'"
    )
  })

  it('should report a column into the line as written, not into a folded copy', () => {
    // `İ` lowercases to two code units, so an offset measured on the folded
    // copy would point one character right of the keyword.
    expect(getColumnNumber('İ %MACRO foo();', '%macro', true)).toEqual(3)
  })
})
