import { trimComments } from './trimComments'

describe('trimComments', () => {
  it('should return statment', () => {
    expect(
      trimComments(`
      /* some comment */ some code;
      `)
    ).toEqual({
      statement: 'some code;',
      commentStarted: false,
      quoteStarted: ''
    })

    expect(
      trimComments(`
      /*/ some comment */ some code;
      `)
    ).toEqual({
      statement: 'some code;',
      commentStarted: false,
      quoteStarted: ''
    })

    expect(
      trimComments(`
      some code;/*/ some comment */ some code;
      `)
    ).toEqual({
      statement: 'some code; some code;',
      commentStarted: false,
      quoteStarted: ''
    })

    expect(
      trimComments(`/* some comment */
      /* some comment */ CODE_Keyword1 /* some comment */ CODE_Keyword2/* some comment */;/* some comment */
      /* some comment */`)
    ).toEqual({
      statement: 'CODE_Keyword1  CODE_Keyword2;',
      commentStarted: false,
      quoteStarted: ''
    })
  })

  it('should return statment, having multi-line comment', () => {
    expect(
      trimComments(`
        /* some 
        comment */
      some code;
      `)
    ).toEqual({
      statement: 'some code;',
      commentStarted: false,
      quoteStarted: ''
    })
  })

  it('should return statment, having multi-line comment and some code present in comment', () => {
    expect(
      trimComments(`
        /* some 
      some code;
        comment */
      some other code;
      `)
    ).toEqual({
      statement: 'some other code;',
      commentStarted: false,
      quoteStarted: ''
    })
  })

  it('should return empty statment, having only comment', () => {
    expect(
      trimComments(`
        /* some 
      some code;
        comment */
      `)
    ).toEqual({ statement: '', commentStarted: false, quoteStarted: '' })
  })

  it('should return empty statment, having continuity in comment', () => {
    expect(
      trimComments(`
        /* some 
      some code;
      `)
    ).toEqual({ statement: '', commentStarted: true, quoteStarted: '' })
  })

  it('should return statment, having already started comment and ends', () => {
    expect(
      trimComments(
        `
        comment */
      some code;
      `,
        true
      )
    ).toEqual({
      statement: 'some code;',
      commentStarted: false,
      quoteStarted: ''
    })
  })

  it('should return empty statment, having already started comment and continuity in comment', () => {
    expect(
      trimComments(
        `
      some code;
      `,
        true
      )
    ).toEqual({ statement: '', commentStarted: true, quoteStarted: '' })
  })

  it('should treat a comment marker inside a quoted value as data', () => {
    expect(trimComments(`%macro m(a='/*', b);`)).toEqual({
      statement: `%macro m(a='/*', b);`,
      commentStarted: false,
      quoteStarted: ''
    })
  })

  it('should report an unclosed comment without swallowing code from the same line', () => {
    expect(trimComments(`  a = 1   /* note,`)).toEqual({
      statement: 'a = 1',
      commentStarted: true,
      quoteStarted: ''
    })
  })

  it('should carry an open quote into the next line, so a marker inside a string is text', () => {
    const first = trimComments(`x = "ab`)
    expect(first.quoteStarted).toEqual('"')

    const second = trimComments(
      `/* not a comment */ cd";`,
      false,
      false,
      first.quoteStarted
    )
    expect(second.statement).toEqual(`/* not a comment */ cd";`)
    expect(second.commentStarted).toBe(false)
  })

  it('should carry an unterminated quote to the end of the text', () => {
    const result = trimComments(`y = 'oops;`, false, false, '')

    expect(result.quoteStarted).toEqual("'")
    expect(result.statement).toEqual(`y = 'oops;`)
  })
})
