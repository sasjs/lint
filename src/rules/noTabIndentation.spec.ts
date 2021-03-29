import { Severity } from '../types/Severity'
import { noTabIndentation } from './noTabIndentation'

describe('noTabs', () => {
  it('should return an empty array when the line is not indented with a tab', () => {
    const line = "%put 'hello';"
    expect(noTabIndentation.test(line, 1)).toEqual([])
  })

  it('should return an array with a single diagnostic when the line is indented with a tab', () => {
    const line = "\t%put 'hello';"
    expect(noTabIndentation.test(line, 1)).toEqual([
      {
        message: 'Line is indented with a tab',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })
})
