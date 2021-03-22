import { lint, splitText } from './lint'

describe('lint', () => {
  it('should identify trailing spaces', async () => {
    const text = `/**
      @file
    **/
    %put 'hello'; 
        %put 'world';  `
    const results = await lint(text)

    expect(results.length).toEqual(2)
    expect(results[0]).toEqual({
      warning: 'Line contains trailing spaces',
      lineNumber: 4,
      columnNumber: 18
    })
    expect(results[1]).toEqual({
      warning: 'Line contains trailing spaces',
      lineNumber: 5,
      columnNumber: 22
    })
  })

  it('should identify encoded passwords', async () => {
    const text = `/**
      @file
    **/
    %put '{SAS001}';`
    const results = await lint(text)

    expect(results.length).toEqual(1)
    expect(results[0]).toEqual({
      warning: 'Line contains encoded password',
      lineNumber: 4,
      columnNumber: 11
    })
  })

  it('should identify missing doxygen header', async () => {
    const text = `%put 'hello';`
    const results = await lint(text)

    expect(results.length).toEqual(1)
    expect(results[0]).toEqual({
      warning: 'File missing Doxygen header',
      lineNumber: 1,
      columnNumber: 1
    })
  })

  it('should return an empty list with an empty file', async () => {
    const text = `/**
      @file
    **/`
    const results = await lint(text)

    expect(results.length).toEqual(0)
  })
})

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
