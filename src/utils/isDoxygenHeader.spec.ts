import { isDoxygenHeader } from './isDoxygenHeader'

describe('isDoxygenHeader', () => {
  it('should accept a header in the Doxygen form', () => {
    expect(isDoxygenHeader('/**\n  @file\n**/\n%put hello;')).toBe(true)
  })

  it('should accept leading whitespace before the opener', () => {
    expect(isDoxygenHeader('\n\n  /**\n  @file\n**/')).toBe(true)
  })

  it('should accept an indented close line', () => {
    expect(isDoxygenHeader('/**\n  @file\n  **/\n%put hello;')).toBe(true)
  })

  it('should accept a header that uses CRLF line endings', () => {
    expect(isDoxygenHeader('/**\r\n  @file\r\n**/')).toBe(true)
  })

  it('should accept an empty header that spans two lines', () => {
    expect(isDoxygenHeader('/**\n**/')).toBe(true)
  })

  it('should accept content on the opener line when the close has its own', () => {
    expect(isDoxygenHeader('/** @file\n**/\n%put hello;')).toBe(true)
  })

  it('should reject a comment that fits on one line, even in the Doxygen form', () => {
    // A one-line comment has no close line of its own, and no room for a
    // `<h4> SAS Macros </h4>` section.
    expect(isDoxygenHeader('/** @file **/')).toBe(false)
  })

  it('should reject an empty one-line comment', () => {
    expect(isDoxygenHeader('/**/')).toBe(false)
  })

  it('should reject a close written with a single asterisk', () => {
    expect(isDoxygenHeader('/**\n  @file\n*/')).toBe(false)
  })

  it('should reject a close line that carries other text', () => {
    expect(isDoxygenHeader('/**\n  @file\n**/ %put hello;')).toBe(false)
  })

  it('should reject a plain comment', () => {
    expect(isDoxygenHeader('/* some comment */\n%put hello;')).toBe(false)
  })

  it('should reject a multi-line plain comment that holds Doxygen tags', () => {
    expect(isDoxygenHeader('/*\n  @file\n**/\n%put hello;')).toBe(false)
  })

  it('should reject a header that follows a statement', () => {
    expect(isDoxygenHeader('%put hello;\n/**\n  @file\n**/')).toBe(false)
  })

  it('should reject a Doxygen opener that is never closed', () => {
    expect(isDoxygenHeader('/**\n  @file\n%put hello;')).toBe(false)
  })

  it('should reject a close line that belongs to a block which already closed', () => {
    // The first block ends on its content line, so the close line below it is
    // not the header's.
    expect(isDoxygenHeader('/** @file **/\n%put hello;\n**/')).toBe(false)
  })

  it('should reject whitespace-only text', () => {
    expect(isDoxygenHeader('  \n\t\n')).toBe(false)
  })

  it('should reject empty text', () => {
    expect(isDoxygenHeader('')).toBe(false)
  })
})
