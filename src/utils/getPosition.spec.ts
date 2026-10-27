import { getPosition } from './getPosition'

describe('getPosition', () => {
  it('should report the first character of the file', () => {
    expect(getPosition('/**', 0)).toEqual({ lineNumber: 1, columnNumber: 1 })
  })

  it('should report a column on the first line', () => {
    expect(getPosition('%put hello;', 5)).toEqual({
      lineNumber: 1,
      columnNumber: 6
    })
  })

  it('should report the first column of a later line', () => {
    const text = 'line 1\nline 2\nline 3'

    expect(getPosition(text, text.indexOf('line 3'))).toEqual({
      lineNumber: 3,
      columnNumber: 1
    })
  })

  it('should report a column on a later line', () => {
    const text = 'line 1\nline 2\nline 3'

    expect(getPosition(text, text.indexOf('line 2') + 5)).toEqual({
      lineNumber: 2,
      columnNumber: 6
    })
  })

  it('should count lines in a file with CRLF endings', () => {
    const text = 'line 1\r\nline 2\r\nline 3'

    expect(getPosition(text, text.indexOf('line 3'))).toEqual({
      lineNumber: 3,
      columnNumber: 1
    })
  })
})
