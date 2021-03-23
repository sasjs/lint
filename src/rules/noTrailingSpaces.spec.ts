import { noTrailingSpaces } from './noTrailingSpaces'

describe('noTrailingSpaces', () => {
  it('should return an empty array when the line has no trailing spaces', () => {
    const line = "%put 'hello';"
    expect(noTrailingSpaces.test(line, 1)).toEqual([])
  })

  it('should return an array with a single diagnostic when the line has trailing spaces', () => {
    const line = "%put 'hello';  "
    expect(noTrailingSpaces.test(line, 1)).toEqual([
      {
        warning: 'Line contains trailing spaces',
        lineNumber: 1,
        columnNumber: 14
      }
    ])
  })
})
