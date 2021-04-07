import { getColumnNumber } from './getColumnNumber'

describe('getColumnNumber', () => {
  it('should return the column number of the specified string within a line of text', () => {
    expect(getColumnNumber('foo bar', 'bar')).toEqual(5)
  })

  it('should throw an error when the specified string is not found within the text', () => {
    expect(() => getColumnNumber('foo bar', 'baz')).toThrowError(
      "String 'baz' was not found in line 'foo bar'"
    )
  })
})
