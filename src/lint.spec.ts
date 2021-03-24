import { lintFile, lintText, splitText } from './lint'
import { Severity } from './types/Severity'
import path from 'path'

describe('lintText', () => {
  it('should identify trailing spaces', async () => {
    const text = `/**
      @file
    **/
    %put 'hello'; 
        %put 'world';  `
    const results = await lintText(text)

    expect(results.length).toEqual(2)
    expect(results[0]).toEqual({
      message: 'Line contains trailing spaces',
      lineNumber: 4,
      startColumnNumber: 18,
      endColumnNumber: 18,
      severity: Severity.Warning
    })
    expect(results[1]).toEqual({
      message: 'Line contains trailing spaces',
      lineNumber: 5,
      startColumnNumber: 22,
      endColumnNumber: 23,
      severity: Severity.Warning
    })
  })

  it('should identify encoded passwords', async () => {
    const text = `/**
      @file
    **/
    %put '{SAS001}';`
    const results = await lintText(text)

    expect(results.length).toEqual(1)
    expect(results[0]).toEqual({
      message: 'Line contains encoded password',
      lineNumber: 4,
      startColumnNumber: 11,
      endColumnNumber: 19,
      severity: Severity.Error
    })
  })

  it('should identify missing doxygen header', async () => {
    const text = `%put 'hello';`
    const results = await lintText(text)

    expect(results.length).toEqual(1)
    expect(results[0]).toEqual({
      message: 'File missing Doxygen header',
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    })
  })

  it('should return an empty list with an empty file', async () => {
    const text = `/**
      @file
    **/`
    const results = await lintText(text)

    expect(results.length).toEqual(0)
  })
})

describe('lintFile', () => {
  it('should identify lint issues in a given file', async () => {
    const results = await lintFile(path.join(__dirname, 'example file.sas'))

    expect(results.length).toEqual(5)
    expect(results).toContainEqual({
      message: 'Line contains trailing spaces',
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 2,
      severity: Severity.Warning
    })
    expect(results).toContainEqual({
      message: 'Line contains trailing spaces',
      lineNumber: 2,
      startColumnNumber: 1,
      endColumnNumber: 2,
      severity: Severity.Warning
    })
    expect(results).toContainEqual({
      message: 'File name contains spaces',
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    })
    expect(results).toContainEqual({
      message: 'File missing Doxygen header',
      lineNumber: 1,
      startColumnNumber: 1,
      endColumnNumber: 1,
      severity: Severity.Warning
    })
    expect(results).toContainEqual({
      message: 'Line contains encoded password',
      lineNumber: 5,
      startColumnNumber: 11,
      endColumnNumber: 19,
      severity: Severity.Error
    })
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
