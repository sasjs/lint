import { trimComments } from './trimComments'

describe('trimComments', () => {
  it('should return statment', () => {
    expect(
      trimComments(`
      /* some comment */ some code;
      `)
    ).toEqual({ statement: 'some code;', commentStarted: false })

    expect(
      trimComments(`/* some comment */
      /* some comment */ CODE_Keyword1 /* some comment */ CODE_Keyword2/* some comment */;/* some comment */
      /* some comment */`)
    ).toEqual({
      statement: 'CODE_Keyword1 CODE_Keyword2;',
      commentStarted: false
    })
  })

  it('should return statment, having multi-line comment', () => {
    expect(
      trimComments(`
        /* some 
        comment */
      some code;
      `)
    ).toEqual({ statement: 'some code;', commentStarted: false })
  })

  it('should return statment, having multi-line comment and some code present in comment', () => {
    expect(
      trimComments(`
        /* some 
      some code;
        comment */
      some other code;
      `)
    ).toEqual({ statement: 'some other code;', commentStarted: false })
  })

  it('should return empty statment, having only comment', () => {
    expect(
      trimComments(`
        /* some 
      some code;
        comment */
      `)
    ).toEqual({ statement: '', commentStarted: false })
  })

  it('should return empty statment, having continuity in comment', () => {
    expect(
      trimComments(`
        /* some 
      some code;
      `)
    ).toEqual({ statement: '', commentStarted: true })
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
    ).toEqual({ statement: 'some code;', commentStarted: false })
  })

  it('should return empty statment, having already started comment and continuity in comment', () => {
    expect(
      trimComments(
        `
      some code;
      `,
        true
      )
    ).toEqual({ statement: '', commentStarted: true })
  })
})
