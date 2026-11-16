import {
  argumentTextFunctionNames,
  dataMaskingFunctionStart,
  maskedArgumentEnd,
  maskingFunctionStart
} from './maskingFunction'

describe('maskingFunctionStart', () => {
  it('should match the legacy lexical boundaries', () => {
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

  it('should keep the %q* forms out of the mask set and in the argument-text set', () => {
    const argumentText = new RegExp(
      `^(?:${argumentTextFunctionNames})\\s*\\(`,
      'i'
    )

    expect(maskingFunctionStart.test('%qscan(a)')).toBe(false)
    expect(argumentText.test('qscan(a)')).toBe(true)
    expect(argumentText.test('nrstr(a)')).toBe(true)
  })

  it('should not match a call that does not mask its argument', () => {
    expect(maskingFunctionStart.test('%sysfunc(a)')).toBe(false)
    expect(maskingFunctionStart.test('%mf_foo(a)')).toBe(false)
    // The prefix is `nr` or nothing: SAS defines neither the `r`- nor the
    // `n`-only forms, and a user macro with one of those names masks nothing.
    expect(maskingFunctionStart.test('%rstr(a)')).toBe(false)
    expect(maskingFunctionStart.test('%rquote(a)')).toBe(false)
    expect(maskingFunctionStart.test('%rbquote(a)')).toBe(false)
    expect(maskingFunctionStart.test('%rsuperq(a)')).toBe(false)
    expect(maskingFunctionStart.test('%nstr(a)')).toBe(false)
    expect(maskingFunctionStart.test('%nquote(a)')).toBe(false)
    expect(maskingFunctionStart.test('%nbquote(a)')).toBe(false)
    expect(maskingFunctionStart.test('%nsuperq(a)')).toBe(false)
    expect(maskingFunctionStart.test('%nunquote(a)')).toBe(false)
  })
})

describe('dataMaskingFunctionStart', () => {
  it('distinguishes masking calls from the existing unquote boundaries', () => {
    for (const name of [
      'str',
      'nrstr',
      'bquote',
      'nrbquote',
      'quote',
      'nrquote',
      'superq',
      'nrsuperq'
    ]) {
      expect(dataMaskingFunctionStart.test(`%${name} (a)`)).toBe(true)
    }
    expect(maskingFunctionStart.test('%unquote (a)')).toBe(true)
    expect(dataMaskingFunctionStart.test('%unquote (a)')).toBe(false)
    expect(dataMaskingFunctionStart.test('%nrunquote (a)')).toBe(false)
    expect(dataMaskingFunctionStart.test('%qscan(a)')).toBe(false)
    expect(dataMaskingFunctionStart.test('%STRANGE(a)')).toBe(false)
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
