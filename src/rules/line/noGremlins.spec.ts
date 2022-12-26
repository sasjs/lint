import { Severity } from '../../types/Severity'
import { noGremlins } from './noGremlins'

describe('noTabs', () => {
  it('should return an empty array when the line does not have any gremlin', () => {
    const line = "%put 'hello';"
    expect(noGremlins.test(line, 1)).toEqual([])
  })

  it('should return a diagnostic array when the line contains gremlins', () => {
    const line = "–  ‘ %put 'hello';"
    const diagnostics = noGremlins.test(line, 1)
    expect(diagnostics.length).toEqual(2)
  })
})
