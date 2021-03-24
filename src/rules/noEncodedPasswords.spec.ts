import { Severity } from '../types/Severity'
import { noEncodedPasswords } from './noEncodedPasswords'

describe('noEncodedPasswords', () => {
  it('should return an empty array when the line has no encoded passwords', () => {
    const line = "%put 'hello';"
    expect(noEncodedPasswords.test(line, 1)).toEqual([])
  })

  it('should return an array with a single diagnostic when the line has a SASENC password', () => {
    const line = "%put '{SASENC}';  "
    expect(noEncodedPasswords.test(line, 1)).toEqual([
      {
        message: 'Line contains encoded password',
        lineNumber: 1,
        startColumnNumber: 7,
        endColumnNumber: 15,
        severity: Severity.Error
      }
    ])
  })

  it('should return an array with a single diagnostic when the line has an encoded password', () => {
    const line = "%put '{SAS001}';  "
    expect(noEncodedPasswords.test(line, 1)).toEqual([
      {
        message: 'Line contains encoded password',
        lineNumber: 1,
        startColumnNumber: 7,
        endColumnNumber: 15,
        severity: Severity.Error
      }
    ])
  })

  it('should return an array with multiple diagnostics when the line has encoded passwords', () => {
    const line = "%put '{SAS001} {SAS002}';  "
    expect(noEncodedPasswords.test(line, 1)).toEqual([
      {
        message: 'Line contains encoded password',
        lineNumber: 1,
        startColumnNumber: 7,
        endColumnNumber: 15,
        severity: Severity.Error
      },
      {
        message: 'Line contains encoded password',
        lineNumber: 1,
        startColumnNumber: 16,
        endColumnNumber: 24,
        severity: Severity.Error
      }
    ])
  })
})
