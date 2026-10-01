import { LintConfig } from '../types'
import { getUnusedLibnames, parseLibnames } from './parseLibnames'

const unused = (
  libref: string,
  lineNumber: number,
  startColumnNumber: number
) => ({
  libref,
  lineNumber,
  startColumnNumber,
  endColumnNumber: startColumnNumber + libref.length
})

describe('parseLibnames', () => {
  it('should return the libref and position of an assignment', () => {
    const text = `libname outData "&dirOut.";`

    expect(parseLibnames(text, new LintConfig())).toEqual([
      unused('outData', 1, 9)
    ])
  })

  it('should track the line and column of each assignment', () => {
    const text = `libname a "x";\n  libname b "y";`

    expect(parseLibnames(text, new LintConfig())).toEqual([
      unused('a', 1, 9),
      unused('b', 2, 11)
    ])
  })

  it('should report a libref assigned more than once once', () => {
    const text = `libname a "x";\nlibname a "y";`

    expect(parseLibnames(text, new LintConfig())).toEqual([unused('a', 1, 9)])
  })

  it('should ignore a statement that deassigns a libref', () => {
    expect(parseLibnames(`libname outData;`, new LintConfig())).toEqual([])
  })

  it('should ignore a statement that clears a libref', () => {
    expect(parseLibnames(`libname outData clear;`, new LintConfig())).toEqual(
      []
    )
  })

  it('should ignore a statement that reports a libref', () => {
    expect(parseLibnames(`libname _all_ list;`, new LintConfig())).toEqual([])
    expect(parseLibnames(`libname outData list;`, new LintConfig())).toEqual([])
  })

  it('should ignore a libref that is not a literal', () => {
    expect(parseLibnames(`libname &lib. "x";`, new LintConfig())).toEqual([])
  })

  it('should ignore an assignment inside a block comment', () => {
    expect(parseLibnames(`/* libname a "x"; */`, new LintConfig())).toEqual([])
  })

  it('should ignore an assignment inside a comment statement', () => {
    expect(parseLibnames(`* libname a "x";`, new LintConfig())).toEqual([])
  })

  it('should ignore an assignment inside a macro comment', () => {
    expect(parseLibnames(`%* libname a "x";`, new LintConfig())).toEqual([])
  })

  it('should ignore an assignment inside a single-quoted string', () => {
    expect(
      parseLibnames(`call execute('libname a "x";');`, new LintConfig())
    ).toEqual([])
  })

  it('should handle an escaped quote inside a single-quoted string', () => {
    expect(
      parseLibnames(`call execute('libname a ''x'';');`, new LintConfig())
    ).toEqual([])
  })

  it('should recover from an unterminated single-quoted string', () => {
    const text = `libname a "x";\n%put 'oops\nmore text`

    expect(parseLibnames(text, new LintConfig())).toEqual([unused('a', 1, 9)])
  })

  it('should return nothing for an empty file', () => {
    expect(parseLibnames('', new LintConfig())).toEqual([])
  })
})

describe('getUnusedLibnames', () => {
  it('should report a libref the file never mentions again', () => {
    const text = `libname outData "&dirOut.";\n%mf_trim()`

    expect(getUnusedLibnames(text, new LintConfig())).toEqual([
      unused('outData', 1, 9)
    ])
  })

  it('should count a libref used as a quoted string argument', () => {
    const text = `libname outData "&dirOut.";\nlibText = pathname("outData", "L");`

    expect(getUnusedLibnames(text, new LintConfig())).toEqual([])
  })

  it('should count a libref used unquoted', () => {
    const text = `libname TESTWORK "&work";\n%let dir = %sysfunc(pathname(TESTWORK));`

    expect(getUnusedLibnames(text, new LintConfig())).toEqual([])
  })

  it('should count a libref used as an option value', () => {
    const text = `libname path2 "&sasjswork/path2";\nproc format library=path2;`

    expect(getUnusedLibnames(text, new LintConfig())).toEqual([])
  })

  it('should count a libref used in fmtsearch', () => {
    const text = `libname path2 "&x";\noptions insert=(fmtsearch=(path1 path2));`

    expect(getUnusedLibnames(text, new LintConfig())).toEqual([])
  })

  it('should count a libref passed to a macro', () => {
    const text = `libname castest cas caslib=&testcaslib;\n%let rc=%mfv_getcaslib(castest);`

    expect(getUnusedLibnames(text, new LintConfig())).toEqual([])
  })

  it('should count a statement that deassigns the libref as a use', () => {
    const text = `libname outData "x";\nlibname outData;`

    expect(getUnusedLibnames(text, new LintConfig())).toEqual([])
  })

  it('should be case insensitive', () => {
    const text = `libname OutData "x";\ndata outdata.member; run;`

    expect(getUnusedLibnames(text, new LintConfig())).toEqual([])
  })

  it('should not count a mention inside a comment', () => {
    const text = `libname outData "x";\n/* outData is used by the autoexec */`

    expect(getUnusedLibnames(text, new LintConfig())).toEqual([
      unused('outData', 1, 9)
    ])
  })

  it('should not count a mention inside a single-quoted string', () => {
    const text = `libname outData "x";\n%put 'outData';`

    expect(getUnusedLibnames(text, new LintConfig())).toEqual([
      unused('outData', 1, 9)
    ])
  })

  it('should not match a longer name that contains the libref', () => {
    const text = `libname a "x";\ndata aa; run;`

    expect(getUnusedLibnames(text, new LintConfig())).toEqual([
      unused('a', 1, 9)
    ])
  })

  it('should handle a one-character libref', () => {
    const text = `libname _ "&dirOut.";\n%mf_trim()`

    expect(getUnusedLibnames(text, new LintConfig())).toEqual([
      unused('_', 1, 9)
    ])
  })

  it('should return nothing for an empty file', () => {
    expect(getUnusedLibnames('', new LintConfig())).toEqual([])
  })

  it('should return nothing when the file assigns no libref', () => {
    expect(getUnusedLibnames(`data x;\nrun;`, new LintConfig())).toEqual([])
  })
})
