import { splitText } from './shared'

describe('splitText', () => {
  it('should return an empty array when text is falsy', () => {
    const lines = splitText('')

    expect(lines.length).toEqual(0)
  })

  it('should return an array of lines from text', () => {
    const lines = splitText(`line 1\nline 2`)

    expect(lines.length).toEqual(2)
    expect(lines[0]).toEqual('line 1')
    expect(lines[1]).toEqual('line 2')
  })

  it('should work with CRLF line endings', () => {
    const lines = splitText(`line 1\r\nline 2`)

    expect(lines.length).toEqual(2)
    expect(lines[0]).toEqual('line 1')
    expect(lines[1]).toEqual('line 2')
  })
})
