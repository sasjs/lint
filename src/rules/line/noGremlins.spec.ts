import { noGremlins, charFromHex } from './noGremlins'
import { LintConfig } from '../../types'

describe('noTabs', () => {
  it('should return an empty array when the line does not have any gremlin', () => {
    const line = "%put 'hello';"
    expect(noGremlins.test(line, 1)).toEqual([])
  })

  it('should return a diagnostic array when the line contains gremlins', () => {
    const line = `${charFromHex('0x0080')} ${charFromHex(
      '0x3000'
    )} %put 'hello';`
    const diagnostics = noGremlins.test(line, 1)
    expect(diagnostics.length).toEqual(2)
  })

  it('should return an empty array when the line contains gremlins but those gremlins are allowed', () => {
    const config = new LintConfig({ allowedGremlins: ['0x0080', '0x3000'] })
    const line = `${charFromHex('0x0080')} ${charFromHex(
      '0x3000'
    )} %put 'hello';`
    const diagnostics = noGremlins.test(line, 1, config)
    expect(diagnostics.length).toEqual(0)
  })
})
