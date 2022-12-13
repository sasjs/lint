import { Severity } from '../../types/Severity'
import { noTabs } from './noTabs'

describe('noTabs', () => {
  it('should return an empty array when the line is not indented with a tab', () => {
    const line = "%put 'hello';"
    expect(noTabs.test(line, 1)).toEqual([])
  })

  it('should return an array with a single diagnostic when the line is indented with a tab', () => {
    const line = "\t%put 'hello';"
    expect(noTabs.test(line, 1)).toEqual([
      {
        message: 'Line contains tab indentation',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 2,
        severity: Severity.Warning
      }
    ])
  })
})
