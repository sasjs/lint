import { maskedArgumentEnd, maskingFunctionStart } from './maskingFunction'

describe('maskingFunctionStart', () => {
  it('should match the masking functions only', () => {
    expect(maskingFunctionStart.test('%str(a)')).toBe(true)
    expect(maskingFunctionStart.test('%nrstr(a)')).toBe(true)
    expect(maskingFunctionStart.test('%STR (a)')).toBe(true)
    expect(maskingFunctionStart.test('%quote(a)')).toBe(false)
    expect(maskingFunctionStart.test('%superq(a)')).toBe(false)
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
