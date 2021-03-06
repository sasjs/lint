import { lintText } from './lintText'
import { Severity } from '../types/Severity'

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
