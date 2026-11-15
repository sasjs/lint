import { maskedArgumentEnd, maskingFunctionStart } from './maskingFunction'

describe('maskingFunctionStart', () => {
  it('should match every call whose argument is masked', () => {
    const masked = [
      '%str',
      '%nrstr',
      '%bquote',
      '%nrbquote',
      '%superq',
      '%nrsuperq',
      '%quote',
      '%nrquote',
      '%unquote'
    ]

    masked.forEach((name) =>
      expect(maskingFunctionStart.test(`${name}(a)`)).toBe(true)
    )
    expect(maskingFunctionStart.test('%STR (a)')).toBe(true)
  })

  it('should not match a call that does not mask its argument', () => {
    expect(maskingFunctionStart.test('%sysfunc(a)')).toBe(false)
    expect(maskingFunctionStart.test('%mf_foo(a)')).toBe(false)
    // The prefix is `n`, `nr` or nothing: SAS defines no `r`-prefixed masking
    // call, and a user macro with one of those names masks nothing.
    expect(maskingFunctionStart.test('%rstr(a)')).toBe(false)
    expect(maskingFunctionStart.test('%rquote(a)')).toBe(false)
    expect(maskingFunctionStart.test('%rbquote(a)')).toBe(false)
    expect(maskingFunctionStart.test('%rsuperq(a)')).toBe(false)
  })
})

describe('maskedArgumentEnd', () => {
  const end = (text: string) => {
    const start = maskingFunctionStart.exec(text)![0].length
    return text.slice(maskedArgumentEnd(text, start))
  }

  it('should return the text after the closing parenthesis', () => {
    expect(end('%str( ab ); more')).toEqual('; more')
  })

  it('should follow nested parentheses', () => {
    expect(end('%str(%sysfunc(pathname(work))) x')).toEqual(' x')
  })

  it('should not treat the escaped parentheses as delimiters', () => {
    expect(end('%str(%() code')).toEqual(' code')
    expect(end('%str(%)) code')).toEqual(' code')
  })

  it('should consume the rest of the text when the argument is never closed', () => {
    expect(end('%str( unclosed')).toEqual('')
  })
})
