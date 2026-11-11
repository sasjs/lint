import { LintConfig } from '../../types'
import { Severity } from '../../types/Severity'
import { noMalformedMacroCalls } from './noMalformedMacroCalls'

/**
 * Every case was run on a live SAS 9.4 engine (sas.4gl.io, 2026-11-11) and the
 * expectation is what the engine did with it - see the matrix in the PR. A case
 * whose expectation is `null` must stay silent here, because the engine accepts
 * it and the values arrive intact.
 */
const cases: { id: string; sas: string; expect: string | null }[] = [
  { id: 'W01', sas: '%kw(a=1, b=2);', expect: null },
  { id: 'W02', sas: '%pos(one, two);', expect: null },
  { id: 'W03', sas: '%pos(one, b=two);', expect: null },
  { id: 'W04', sas: '%kw(a=one two three, b=2);', expect: null },
  { id: 'W05', sas: '%kw(a="one, two", b=2);', expect: null },
  { id: 'W06', sas: '%kw(a=%str(one, two), b=2);', expect: null },
  { id: 'W07', sas: '%kw(a=%sysfunc(pathname(work)), b=2);', expect: null },
  {
    id: 'W08',
    sas: '%kw(a=1, b=2,);',
    expect: 'an empty parameter follows a comma'
  },
  { id: 'W09', sas: '%kw(\n  a=1,\n  b=2\n);', expect: null },
  { id: 'W10', sas: '%pos(one two three);', expect: null },
  { id: 'W11', sas: "%kw(a=%str(%'), b=2);", expect: null },
  { id: 'W12', sas: '%kw(a=1, /* note */ b=2);', expect: null },
  { id: 'W13', sas: '%kw(a=one\n  two, b=2);', expect: null },
  { id: 'W14', sas: '%kw(a=%pos(x, y), b=2);', expect: null },

  {
    id: 'B01',
    sas: "%kw(a=Check the library's lines, b=2);",
    expect: 'unclosed quote'
  },
  { id: 'B02', sas: '%kw(a="one, b=2);', expect: 'unclosed quote' },
  { id: 'B03', sas: "%kw(a='one, b=2);", expect: 'unclosed quote' },
  { id: 'B04', sas: '%kw(a=(one, b=2);', expect: 'unclosed parenthesis' },
  { id: 'B05', sas: '%kw(a=one), b=2);', expect: null },
  {
    id: 'B06',
    sas: '%kw(a=one /* note, b=2);',
    expect: 'unterminated comment'
  },
  {
    id: 'B07',
    sas: '%kw(a=Check the library is wide, wider than 80);',
    expect: 'is not a name=value parameter'
  },
  { id: 'B08', sas: '%kw(a=1,2,3);', expect: 'is not a name=value parameter' },
  {
    id: 'B09',
    sas: '%kw(b=two, more words);',
    expect: 'is not a name=value parameter'
  },
  {
    id: 'B10',
    sas: '%kw(a=1, b=2, stray);',
    expect: 'is not a name=value parameter'
  },

  {
    id: 'B11',
    sas: '%kw(a=1, b=2, /* note */);',
    expect: 'an empty parameter follows a comma'
  },

  // Decision probes, run on the same engine while reviewing this rule.
  {
    id: 'D1',
    sas: '%kw(a=1, , b=2);',
    expect: 'an empty parameter follows a comma'
  },
  { id: 'D2', sas: '%kw(a=1, b=2 /* note */);', expect: null },
  { id: 'D3', sas: '%kw(a=%nrstr(x,y), b=2);', expect: null },
  { id: 'D4', sas: '%kw(a=%quote(x,y), b=2);', expect: null },
  {
    id: 'D5',
    sas: '%kw(a=1, %str(b)=2);',
    expect: 'a parameter name cannot be masked'
  },
  {
    id: 'D6',
    sas: '%kw(a=1, "b"=2);',
    expect: 'a parameter name cannot be quoted'
  },
  { id: 'D7', sas: '%kw(a=%str(%(x%)), b=2);', expect: null },
  {
    id: 'D8',
    sas: '%kw(a=1,);',
    expect: 'an empty parameter follows a comma'
  },
  // D9 - `%kw(&k=9)` with K unset is refused by the engine ("More positional
  // parameters found than defined"), but with `%let k=b;` the same call is well
  // formed. Whether the trigger resolves is not knowable from the text, so the
  // rule stays silent - see the README.

  // Verified after review: the macro processor resolves the trigger before it
  // parses the parameter list, so the name arrives as `b` and the call is well
  // formed (SAS 9.4, syscc 0, a=1 b=9).
  {
    id: 'W15',
    sas: '%let k=b;\n%kw(a=1, &k=9);',
    expect: null
  },

  {
    id: 'I01',
    sas: "/* %kw(a=Check the library's lines, b=2); */",
    expect: null
  },
  { id: 'I02', sas: "data _null_; x='%kw(a=one, b=2)'; run;", expect: null }
]

describe('noMalformedMacroCalls', () => {
  const config = new LintConfig({ noMalformedMacroCalls: true })

  it('is off by default', () => {
    const defaultConfig = new LintConfig({})

    expect(
      defaultConfig.fileLintRules.find(
        (rule) => rule.name === 'noMalformedMacroCalls'
      )
    ).toBeUndefined()
  })

  it('is enabled by the setting', () => {
    expect(
      config.fileLintRules.find((rule) => rule.name === 'noMalformedMacroCalls')
    ).toBeTruthy()
  })

  it.each(cases)('$id: $sas', ({ sas, expect: expected }) => {
    const diagnostics = noMalformedMacroCalls.test(sas, config)

    if (expected === null) {
      expect(diagnostics).toEqual([])
    } else {
      expect(diagnostics).toHaveLength(1)
      expect(diagnostics[0].message).toContain(expected)
    }
  })

  it('reports each failing call in a file', () => {
    const text = "%kw(a=one's here, b=2);\n%kw(a=1, b=2);\n%kw(c=3, 4);"

    expect(
      noMalformedMacroCalls.test(text, config).map((d) => d.lineNumber)
    ).toEqual([1, 3])
  })

  it('points at the spilled parameter', () => {
    const [diagnostic] = noMalformedMacroCalls.test(
      '%kw(a=1, wider than 80);',
      config
    )

    expect(diagnostic.startColumnNumber).toEqual(10)
    expect(diagnostic.endColumnNumber).toEqual(23)
  })

  it('stops the spilled span at the last character of the text', () => {
    const [diagnostic] = noMalformedMacroCalls.test(
      '%kw(a=1, bigger than 80 );',
      config
    )

    expect(diagnostic.startColumnNumber).toEqual(10)
    expect(diagnostic.endColumnNumber).toEqual(24)
  })

  it('spells the reason out in full', () => {
    const [diagnostic] = noMalformedMacroCalls.test(
      "%kw(a=one's, b=2);",
      config
    )

    expect(diagnostic.message).toEqual(
      'Macro call arguments: unclosed quote - the rest of the file is read as part of the value; quote it with %str()'
    )
  })

  it('spans the call name for a call that does not close', () => {
    const [diagnostic] = noMalformedMacroCalls.test(
      "  %kw(a=one's, b=2);",
      config
    )

    expect(diagnostic.startColumnNumber).toEqual(3)
    expect(diagnostic.endColumnNumber).toEqual(6)
  })

  it('quotes the spilled text on one line', () => {
    const [diagnostic] = noMalformedMacroCalls.test(
      '%kw(a=1, stray\n   words);',
      config
    )

    expect(diagnostic.message).toEqual(
      'Macro call arguments: "stray words" is not a name=value parameter and follows one - a comma inside a value? quote it with %str()'
    )
  })

  it('ignores a failing call inside a single-quoted string', () => {
    expect(
      noMalformedMacroCalls.test(
        "data _null_; x='%kw(a=1, stray)'; run;",
        config
      )
    ).toEqual([])
  })

  it('ignores a failing call to a SAS-shipped name', () => {
    expect(noMalformedMacroCalls.test('%sysfunc(a=1, stray);', config)).toEqual(
      []
    )
  })

  it('keeps the empty-parameter span on the comma', () => {
    const [diagnostic] = noMalformedMacroCalls.test(
      '%kw(\n  a=1,\n  b=2,\n);',
      config
    )

    expect(diagnostic.lineNumber).toEqual(3)
    expect(diagnostic.startColumnNumber).toEqual(6)
    expect(diagnostic.endColumnNumber).toEqual(7)
  })

  it('keeps the quoted-name span inside the parameter', () => {
    const [diagnostic] = noMalformedMacroCalls.test(
      '%kw(a=1, "b"=2\n);',
      config
    )

    expect(diagnostic.lineNumber).toEqual(1)
    expect(diagnostic.startColumnNumber).toEqual(10)
    expect(diagnostic.endColumnNumber).toEqual(15)
  })

  it('reads positions in a CRLF file', () => {
    const [diagnostic] = noMalformedMacroCalls.test(
      '%kw(a=1);\r\n%kw(b=2, stray);',
      config
    )

    expect(diagnostic.lineNumber).toEqual(2)
  })

  it('ignores a name with no argument list', () => {
    expect(noMalformedMacroCalls.test('%foo;', config)).toEqual([])
  })

  it('ignores a SAS-shipped name', () => {
    expect(
      noMalformedMacroCalls.test('%sysfunc(compress(x, y));', config)
    ).toEqual([])
  })

  it('reports nothing for an empty file', () => {
    expect(noMalformedMacroCalls.test('', config)).toEqual([])
  })

  it('uses the configured severity', () => {
    const errorConfig = new LintConfig({
      noMalformedMacroCalls: true,
      severityLevel: { noMalformedMacroCalls: 'error' }
    })

    const [diagnostic] = noMalformedMacroCalls.test(
      '%kw(a=1, stray);',
      errorConfig
    )

    expect(diagnostic.severity).toEqual(Severity.Error)
  })
})
