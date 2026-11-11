import { getIndex } from './getIndex'
import { getPosition } from './getPosition'

describe('getIndex', () => {
  it('reads a position on the first line', () => {
    expect(getIndex('%macro x;\n%mend;', 1, 8)).toEqual(7)
  })

  it('reads a position on a later line of a LF file', () => {
    expect(getIndex('%macro x;\n%mend;', 2, 1)).toEqual(10)
  })

  it('reads a position on a later line of a CRLF file', () => {
    // The terminator is two characters, so a \n-only count lands one short per
    // preceding line - the reason this helper exists.
    expect(getIndex('%macro x;\r\n%mend;', 2, 1)).toEqual(11)
  })

  it('clamps a position before the start of the file', () => {
    expect(getIndex('abc', 0, 0)).toEqual(0)
  })

  it('returns the position past the end for a line beyond the file', () => {
    expect(getIndex('abc\ndef', 9, 1)).toEqual(7)
  })

  it('round-trips with getPosition', () => {
    const text = 'a\r\nbb\r\nccc'
    const index = getIndex(text, 3, 2)

    expect(getPosition(text, index)).toEqual({
      lineNumber: 3,
      columnNumber: 2
    })
  })
})
