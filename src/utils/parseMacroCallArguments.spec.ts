import { parseMacroCallArguments } from './parseMacroCallArguments'
import { parseMacroCalls } from './parseMacroCalls'

/** The argument region of the first call in the text. */
const firstCall = (text: string) => {
  const [call] = parseMacroCalls(text)
  if (!call) throw new Error(`no call in ${text}`)

  return parseMacroCallArguments(text, call)
}

describe('parseMacroCallArguments', () => {
  it('returns null for an empty text', () => {
    expect(
      parseMacroCallArguments('', {
        name: 'x',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 3
      })
    ).toBeNull()
  })

  it('returns null for a name with no argument list', () => {
    expect(firstCall('%foo\n%put done;')).toBeNull()
  })

  it('reads two keyword parameters', () => {
    const args = firstCall('%kw(a=1, b=2);')!

    expect(args.unclosed).toBeNull()
    expect(args.parameters.map((p) => p.text)).toEqual(['a=1', ' b=2'])
    expect(args.parameters.map((p) => p.isKeyword)).toEqual([true, true])
    expect(args.afterClose).toEqual(';')
  })

  it('reads positional parameters, which are not keyword ones', () => {
    const args = firstCall('%pos(one, two);')!

    expect(args.parameters.map((p) => p.isKeyword)).toEqual([false, false])
  })

  it('keeps a comma inside a quoted value in one parameter', () => {
    const args = firstCall('%kw(a="one, two", b=2);')!

    expect(args.parameters.map((p) => p.text)).toEqual(['a="one, two"', ' b=2'])
  })

  it('keeps a comma inside a %str mask in one parameter', () => {
    const args = firstCall('%kw(a=%str(one, two), b=2);')!

    expect(args.parameters).toHaveLength(2)
  })

  it('treats %( and %) as literal parenthesis inside a mask', () => {
    const args = firstCall('%kw(a=%str(%(x, y%)), b=2);')!

    expect(args.parameters).toHaveLength(2)
  })

  it('follows nested parenthesis inside a mask', () => {
    const args = firstCall('%kw(a=%str(f(x)), b=2);')!

    expect(args.parameters).toHaveLength(2)
  })

  it('ignores a comment between parameters', () => {
    const args = firstCall('%kw(a=1, /* note, with a comma */ b=2);')!

    expect(args.parameters).toHaveLength(2)
    expect(args.parameters[1].isKeyword).toBe(true)
  })

  it('records the parameters of a call split over lines', () => {
    const args = firstCall('%kw(\n  a=1,\n  b=2\n);')!

    expect(args.parameters.map((p) => p.text.trim())).toEqual(['a=1', 'b=2'])
  })

  it('reports an unclosed quote', () => {
    expect(firstCall("%kw(a='one, b=2);")!.unclosed).toEqual('quote')
  })

  it('reports an unclosed parenthesis', () => {
    expect(firstCall('%kw(a=(one, b=2);')!.unclosed).toEqual('parenthesis')
  })

  it('reports an unterminated comment', () => {
    expect(firstCall('%kw(a=one /* note, b=2);')!.unclosed).toEqual('comment')
  })

  it('returns -1 for the closing parenthesis of a call that does not close', () => {
    const args = firstCall('%kw(a=one)')

    // A balanced call closes: the parenthesis after `one` belongs to it.
    expect(args!.unclosed).toBeNull()
    expect(args!.parameters.map((p) => p.text)).toEqual(['a=one'])
  })

  it('reads a call that puts whitespace before its argument list', () => {
    const args = firstCall('%kw (a=1);')!

    expect(args.parameters.map((p) => p.text)).toEqual(['a=1'])
  })
})
