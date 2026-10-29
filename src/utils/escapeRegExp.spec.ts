import { escapeRegExp } from './escapeRegExp'

describe('escapeRegExp', () => {
  it('should leave a plain string alone', () => {
    expect(escapeRegExp('%macro')).toEqual('%macro')
  })

  it('should escape the characters a RegExp reads as syntax', () => {
    expect(escapeRegExp('a.b*c(d)e[f]g{h}i|j+k?l^m$n\\o')).toEqual(
      'a\\.b\\*c\\(d\\)e\\[f\\]g\\{h\\}i\\|j\\+k\\?l\\^m\\$n\\\\o'
    )
  })

  it('should make a string match itself inside a RegExp', () => {
    const value = 'a.b*c(d)'

    expect(new RegExp(escapeRegExp(value)).exec(`x ${value} y`)![0]).toEqual(
      value
    )
  })
})
