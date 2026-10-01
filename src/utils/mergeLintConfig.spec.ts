import { mergeLintConfig } from './mergeLintConfig'

describe('mergeLintConfig', () => {
  it('should replace a scalar', () => {
    expect(
      mergeLintConfig({ maxLineLength: 80 }, { maxLineLength: 200 })
    ).toEqual({ maxLineLength: 200 })
  })

  it('should add to an array rather than replace it', () => {
    expect(
      mergeLintConfig(
        { allowedGremlins: ['0x0080'] },
        { allowedGremlins: ['0x3000'] }
      )
    ).toEqual({ allowedGremlins: ['0x0080', '0x3000'] })
  })

  it('should not repeat an array entry the base already lists', () => {
    expect(
      mergeLintConfig(
        { allowedGremlins: ['0x0080'] },
        { allowedGremlins: ['0x0080', '0x3000'] }
      )
    ).toEqual({ allowedGremlins: ['0x0080', '0x3000'] })
  })

  it('should merge objects key by key', () => {
    expect(
      mergeLintConfig(
        { severityLevel: { hasDoxygenHeader: 'warn' } },
        { severityLevel: { noTrailingSpaces: 'error' } }
      )
    ).toEqual({
      severityLevel: { hasDoxygenHeader: 'warn', noTrailingSpaces: 'error' }
    })
  })

  it('should keep the keys the override does not mention', () => {
    expect(
      mergeLintConfig({ maxLineLength: 80, noTabs: true }, { noTabs: false })
    ).toEqual({ maxLineLength: 80, noTabs: false })
  })

  it('should return the override when the base is not an object', () => {
    expect(mergeLintConfig(undefined, { noTabs: false })).toEqual({
      noTabs: false
    })
  })
})
