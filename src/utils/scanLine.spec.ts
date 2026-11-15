import { cleanState, noScan, scanLine } from './scanLine'

describe('scanLine', () => {
  it('reports every space in plain code as a break point', () => {
    // `  set work.example (keep=a b);`
    //  01 2-4  5 6-9 10 11-17 18 19 20-23 24 25 26 27 28 29
    const scanned = scanLine('  set work.example (keep=a b);', cleanState())

    expect(scanned.positions).toEqual([0, 1, 5, 18, 26])
    expect(scanned.hasComment).toBe(false)
    expect(scanned.code).toBe('  set work.example (keep=a b);')
  })

  it('reports no break point inside a quoted literal', () => {
    const scanned = scanLine('  put "a b c" d;', cleanState())

    // The two spaces inside the literal are its content, not delimiters.
    expect(scanned.positions).toEqual([0, 1, 5, 13])
    expect(scanned.code).toBe('  put         d;')
  })

  it('reports no break point inside a masking call', () => {
    const scanned = scanLine('  %let x = %str(a b);', cleanState())

    // `%str(a b)` is one value, so the space between `a` and `b` is data.
    expect(scanned.positions).toEqual([0, 1, 6, 8, 10])
    expect(scanned.endState.maskedDepth).toBe(0)
  })

  it('reports no break point inside a block comment', () => {
    // The contract on `positions` says every space that is not inside a quoted
    // literal, a masking call or a block comment. A comment's spaces are prose,
    // and no caller wants one: the wrap refuses a comment-bearing line and
    // `reflowComments` owns the text.
    const scanned = scanLine('  x = 1; /* a b c */', cleanState())

    expect(scanned.hasComment).toBe(true)
    expect(scanned.positions).toEqual([0, 1, 3, 5, 8])
    expect(scanned.comments).toEqual([{ start: 9, end: 18 }])
  })

  it('carries an open comment into the next line', () => {
    const opening = scanLine('  x = 1; /* a b', cleanState())

    expect(opening.endState.inComment).toBe(true)
    // An unclosed comment runs to the end of the line.
    expect(opening.comments).toEqual([{ start: 9, end: 15 }])

    const closing = scanLine('  c d */ y = 2;', opening.endState)

    expect(closing.hasComment).toBe(true)
    // The spaces before the closing marker are inside the comment; the ones
    // after it are code again.
    expect(closing.positions).toEqual([8, 10, 12])
    expect(closing.endState.inComment).toBe(false)
  })

  it('does not let a masked apostrophe open a literal', () => {
    const scanned = scanLine("  %let q = %str(%');", cleanState())

    expect(scanned.endState.quote).toBe('')
    expect(scanned.endState.maskedDepth).toBe(0)
  })

  it('reads a data record as nothing at all', () => {
    const scanned = noScan()

    expect(scanned.positions).toEqual([])
    expect(scanned.code).toBe('')
    expect(scanned.hasComment).toBe(false)
    expect(scanned.endState).toEqual(cleanState())
  })
})
