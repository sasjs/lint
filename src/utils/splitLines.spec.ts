import { splitLines } from './splitLines'

describe('splitLines', () => {
  it('should split LF text', () => {
    expect(splitLines('a\nb\nc')).toEqual(['a', 'b', 'c'])
  })

  it('should split CRLF text', () => {
    expect(splitLines('a\r\nb\r\nc')).toEqual(['a', 'b', 'c'])
  })

  it('should split mixed text and leave no carriage returns', () => {
    const lines = splitLines('a\r\nb\nc')

    expect(lines).toEqual(['a', 'b', 'c'])
    expect(lines.some((line) => line.includes('\r'))).toBe(false)
  })

  it('should return an empty array for empty text', () => {
    expect(splitLines('')).toEqual([])
  })

  it('should keep a trailing empty line when the text ends with a terminator', () => {
    expect(splitLines('a\n')).toEqual(['a', ''])
  })
})
