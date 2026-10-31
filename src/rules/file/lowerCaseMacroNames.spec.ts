import { LintConfig } from '../../types'
import { Severity } from '../../types/Severity'
import { lowerCaseMacroNames } from './lowerCaseMacroNames'

const asFile = (headerEntries: string[], body = ''): string =>
  `/**
  @file
  @brief A macro library

  <h4> SAS Macros </h4>
${headerEntries.map((entry) => `  @li ${entry}`).join('\n')}

**/
${body}`

describe('lowerCaseMacroNames', () => {
  const config = new LintConfig()

  it('passes a lower case header list and definition', () => {
    const text = asFile(
      ['mf_trim.sas', 'mf_getuser.sas'],
      '%macro mf_getuser(lib=);\n%mend mf_getuser;'
    )

    expect(lowerCaseMacroNames.test(text, config)).toEqual([])
  })

  it('reports a header entry that is not lower case, at the entry', () => {
    const text = asFile(['mf_trim.sas', 'mf_GetUser.sas'])

    const diagnostics = lowerCaseMacroNames.test(text, config)

    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toEqual({
      message: expect.stringContaining(`Macro 'mf_GetUser.sas'`),
      lineNumber: 7,
      // `  @li ` is 6 characters, so the name starts at column 7.
      startColumnNumber: 7,
      endColumnNumber: 7 + 'mf_GetUser'.length,
      severity: Severity.Warning
    })
  })

  it('reports the definition and the name carried by %mend', () => {
    const text = asFile(
      ['mf_GetUser.sas'],
      '%macro mf_GetUser(lib=);\n%mend mf_GetUser;'
    )

    const diagnostics = lowerCaseMacroNames.test(text, config)

    expect(diagnostics.map((d) => d.lineNumber)).toEqual([6, 9, 10])
    expect(diagnostics[1].message).toContain('%macro')
    expect(diagnostics[2].message).toContain('%mend')
    expect(diagnostics[1].startColumnNumber).toEqual(8)
  })

  it('reports only the definition when %mend carries no name', () => {
    const text = asFile(['mf_GetUser.sas'], '%macro mf_GetUser;\n%mend;')

    const diagnostics = lowerCaseMacroNames.test(text, config)

    expect(diagnostics.map((d) => d.lineNumber)).toEqual([6, 9])
  })

  it('takes its severity from the configuration', () => {
    const strict = new LintConfig({
      severityLevel: { lowerCaseMacroNames: 'error' }
    })

    const diagnostics = lowerCaseMacroNames.test(
      asFile(['mf_Trim.sas']),
      strict
    )

    expect(diagnostics[0].severity).toEqual(Severity.Error)
  })

  it('lower cases the header entry, the %macro name and the %mend name', () => {
    const text = asFile(
      ['mf_trim.sas', 'mf_GetUser.sas'],
      '%macro mf_GetUser(lib=work, keep=Y);\n  %put &lib;\n%mend mf_GetUser;'
    )

    expect(lowerCaseMacroNames.fix!(text, config)).toEqual(
      asFile(
        ['mf_trim.sas', 'mf_getuser.sas'],
        '%macro mf_getuser(lib=work, keep=Y);\n  %put &lib;\n%mend mf_getuser;'
      )
    )
  })

  it('leaves indentation and the order of the entries alone', () => {
    const text = `/**
  @file
  @brief A macro library

    <h4> SAS Macros </h4>
    @li MF_Trim.sas
    @li mf_alpha.sas

**/
%macro MF_Trim(value=);
%mend MF_Trim;
`

    const fixed = lowerCaseMacroNames.fix!(text, config)

    expect(fixed).toEqual(`/**
  @file
  @brief A macro library

    <h4> SAS Macros </h4>
    @li mf_trim.sas
    @li mf_alpha.sas

**/
%macro mf_trim(value=);
%mend mf_trim;
`)
  })

  it('leaves an entry it cannot read alone', () => {
    // A file followed by other words is not an entry the parser can read, so
    // the rule neither reports nor rewrites it - the same line
    // `noUndeclaredMacros` and the formatter skip.
    const text = asFile(['MF_Trim.sas - trims a string'])

    expect(lowerCaseMacroNames.test(text, config)).toEqual([])
    expect(lowerCaseMacroNames.fix!(text, config)).toEqual(text)
  })

  it('does nothing with an empty file', () => {
    expect(lowerCaseMacroNames.test('', config)).toEqual([])
    expect(lowerCaseMacroNames.fix!('', config)).toEqual('')
  })

  it('reports the definition of a macro that is never closed', () => {
    const text = asFile(['mf_Trim.sas'], '%macro MF_Trim;')

    const diagnostics = lowerCaseMacroNames.test(text, config)

    expect(diagnostics.map((d) => d.lineNumber)).toEqual([6, 9])
  })

  it('is idempotent', () => {
    const text = asFile(
      ['mf_getuser.sas'],
      '%macro mf_getuser;\n%mend mf_getuser;'
    )

    expect(
      lowerCaseMacroNames.fix!(lowerCaseMacroNames.fix!(text, config), config)
    ).toEqual(text)
  })

  it('leaves a %macro written in a comment alone', () => {
    const text = asFile(
      ['mf_trim.sas'],
      '%macro mf_trim;\n%mend mf_trim;\n/* %macro MF_NotReal; */'
    )

    expect(lowerCaseMacroNames.test(text, config)).toEqual([])
    expect(lowerCaseMacroNames.fix!(text, config)).toEqual(text)
  })
})
