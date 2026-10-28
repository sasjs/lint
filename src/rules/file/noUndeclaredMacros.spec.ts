import { LintConfig } from '../../types'
import { Severity } from '../../types/Severity'
import { noUndeclaredMacros } from './noUndeclaredMacros'

describe('noUndeclaredMacros - test', () => {
  it('should not report a macro that is declared in the header', () => {
    const text = `/**
  @file
  @brief test
  <h4> SAS Macros </h4>
  @li mf_trim.sas
**/
%mf_trim()`

    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should report a macro that is only invoked inside a single-quoted string', () => {
    const text = `/**
  @file
  @brief test
**/
data _null_;
  call execute('%mf_mkdir(work.x)');
run;`

    // The string is submitted later, so the invocation runs then and the macro
    // has to be in the header. A name in a string that is not code - a Lua or
    // printf specifier such as '%s(%d)' - is silenced with ignoredMacros, or by
    // switching this rule off for the file.
    const diagnostics = noUndeclaredMacros.test(text, new LintConfig())

    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].message).toContain('mf_mkdir')
  })

  it('should not report a name inside a string that looks like a pattern', () => {
    const text = `/**
  @file
  @brief test
**/
data want;
  set have;
  where name like '%abc%';
run;`

    // A string becomes a submitted program, so its names are read - but a call
    // carries an opening parenthesis, and a pattern has none.
    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should not report a name in a string when no parenthesis follows it', () => {
    const text = `/**
  @file
  @brief test
**/
data _null_;
  call execute('%mf_foo');
run;`

    // A call without arguments is legal SAS but reads like a bare name, so this
    // rule stays silent and noUnusedMacros counts it as a use.
    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should count a definition written into a template string', () => {
    const text = `/**
  @file
  @brief test
**/
data _null_;
  file f;
  put '%macro mf_foo(a);';
  put '%mend mf_foo;';
  put '%mf_foo(x)';
run;`

    // The string is the program being emitted, so the macro it calls is defined
    // in this file - in a `put` line the statement parser cannot read as a
    // definition. Reporting it would have the fix add a dependency the file does
    // not have.
    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should count a definition emitted with a double-quoted string', () => {
    const text = `/**
  @file
  @brief test
**/
data _null_;
  file f;
  put "%macro mf_foo(a);";
  put "%mend mf_foo;";
  put "%mf_foo(x)";
run;`

    // SAS opens a string with either quote, and a template written with double
    // quotes is the same construct as one written with single quotes.
    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should count a definition emitted without a parameter list', () => {
    const text = `/**
  @file
  @brief test
**/
data _null_;
  file f;
  put '%macro mf_bar;';
  put '%mend mf_bar;';
  put '%mf_bar()';
run;`

    // The pattern accepts `;` after the name as well as the parenthesis, so a
    // generated definition without parameters counts. `hasMacroParentheses`
    // reports the definition itself when it is written as code.
    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should count a definition that begins a line inside a block comment', () => {
    const text = `/**
  @file
  @brief test
**/
/*
%macro mf_baz(a);
*/
data _null_;
  call execute('%mf_baz(x)');
run;`

    // Documented consequence of matching text rather than syntax: it errs toward
    // silence, so the call is not reported. A missed report leaves the macro
    // declared anyway; a false report has the fix add a dependency that does not
    // exist.
    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should not count a definition that only a comment mentions', () => {
    const text = `/**
  @file
  @brief test
  @details replaces the old %macro mf_foo() helper
**/
data _null_;
  call execute('%mf_foo(x)');
run;`

    // The pattern requires the parenthesis, so prose reads as prose - and the
    // call in the string is still undeclared.
    expect(noUndeclaredMacros.test(text, new LintConfig())).toHaveLength(1)
  })

  it('should not report a one-character name, which a format specifier looks like', () => {
    const text = `/**
  @file
  @brief test
**/
data _null_;
  format='%s(%d) %x( %z(';
  put format;
run;`

    // Lua and printf put `%s(` and friends in strings. A single-letter macro
    // name is legal SAS and vanishingly rare, so the floor is worth the miss.
    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should report a name at the floor, and honour ignoredMacros for it', () => {
    const text = `/**
  @file
  @brief test
**/
data _null_;
  call execute('%mfx(work.x)');
run;`

    expect(noUndeclaredMacros.test(text, new LintConfig())).toHaveLength(1)
    expect(
      noUndeclaredMacros.test(text, new LintConfig({ ignoredMacros: ['mfx'] }))
    ).toEqual([])
  })

  it('should report a macro listed under a section compile does not read', () => {
    const text = `/**
  @file
  <h4> Other Macros </h4>
  @li my_custom.sas
**/
%my_custom()`

    // `sasjs compile` reads `<h4> SAS Macros </h4>` only, so an entry anywhere
    // else does not make the macro available to the job.
    const diagnostics = noUndeclaredMacros.test(text, new LintConfig())

    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].message).toContain('my_custom')
  })

  it('should not report a macro that is defined in the file', () => {
    const text = `%macro mf_trim();
%mend;
%mf_trim()`

    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should not report a macro that appears only inside a masking function', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
**/
%put %str(%mf_foo(work.a));`

    // The masked text is data while %str runs, and a file masks a trigger to
    // print it as often as to defer it. Reporting it would be a new warning on
    // code that may never run, so this rule stays strict and noUnusedMacros
    // does the conservative half: a name there counts as a use.
    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should not report the macros that ship with SAS', () => {
    const text = `%put %sysfunc(date());
%scan(a b, 1);
%if &x %then %do;
%end;`

    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should not report webout with the default configuration', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
**/
%webout(OBJ,x)`

    // `webout` is injected by `sasjs compile`; no macro file provides it, so a
    // header entry for it would be a dependency the compiler cannot resolve.
    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([])
  })

  it('should report webout when ignoredMacros is empty', () => {
    const config = new LintConfig({ ignoredMacros: [] })

    expect(noUndeclaredMacros.test(`%webout(OBJ,x)`, config).length).toEqual(1)
  })

  it('should not report a macro listed in ignoredMacros', () => {
    const config = new LintConfig({ ignoredMacros: ['webout'] })

    expect(noUndeclaredMacros.test(`%webout(OBJ,x)`, config)).toEqual([])
  })

  it('should match ignoredMacros case-insensitively', () => {
    const config = new LintConfig({ ignoredMacros: ['WEBout'] })

    expect(noUndeclaredMacros.test(`%webout(OBJ,x)`, config)).toEqual([])
  })

  it('should still report the other undeclared macros when one is ignored', () => {
    const config = new LintConfig({ ignoredMacros: ['webout'] })

    expect(
      noUndeclaredMacros.test(`%webout(OBJ,x)\n%mf_foo()`, config).length
    ).toEqual(1)
  })

  it('should report a macro that is used but not declared', () => {
    const text = `/**
  @file
  @brief test
  <h4> SAS Macros </h4>
**/
%mf_foo()`

    expect(noUndeclaredMacros.test(text, new LintConfig())).toEqual([
      {
        message: `Macro 'mf_foo' is not declared - add it to the <h4> SAS Macros </h4> section of the header, or list the macro in 'ignoredMacros'`,
        lineNumber: 6,
        startColumnNumber: 1,
        endColumnNumber: 8,
        severity: Severity.Warning
      }
    ])
  })

  it('should report each undeclared macro once, at its first use', () => {
    const text = `%mf_foo()\n%mf_bar()\n%mf_foo()`

    expect(
      noUndeclaredMacros.test(text, new LintConfig()).map((d) => d.lineNumber)
    ).toEqual([1, 2])
  })

  it('should respect the configured severity', () => {
    const config = new LintConfig({
      severityLevel: { noUndeclaredMacros: 'error' }
    })

    expect(noUndeclaredMacros.test(`%mf_foo()`, config)[0].severity).toEqual(
      Severity.Error
    )
  })

  it('should fall back to the default configuration', () => {
    expect(noUndeclaredMacros.test(`%mf_foo()`).length).toEqual(1)
  })

  it('should return an empty array when there is no text', () => {
    expect(noUndeclaredMacros.test('')).toEqual([])
  })
})

describe('noUndeclaredMacros - fix', () => {
  it('should report an annotated entry, and leave the header alone', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_trim.sas - trims a value
**/
%mf_trim()`

    // An entry is the tag and one file token, so this line declares nothing.
    // The section cannot be rewritten around a line that is not an entry, so
    // the warning stands and the fix declines rather than deleting the line.
    const diagnostics = noUndeclaredMacros.test(text, new LintConfig())

    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].message).toContain('mf_trim')
    expect(noUndeclaredMacros.fix!(text, new LintConfig())).toEqual(text)
  })

  it('should add the undeclared macros to the header, sorted', () => {
    const text = `/**
  @file
  @brief test
  <h4> SAS Macros </h4>
**/
%mf_b()
%mf_a()`

    const expected = `/**
  @file
  @brief test

  <h4> SAS Macros </h4>
  @li mf_a.sas
  @li mf_b.sas

**/
%mf_b()
%mf_a()`

    expect(noUndeclaredMacros.fix!(text, new LintConfig())).toEqual(expected)
  })

  it('should resolve the diagnostics it produces', () => {
    const text = `/**
  @file
  @brief test
  <h4> SAS Macros </h4>
**/
%mf_b()
%mf_a()`

    const fixed = noUndeclaredMacros.fix!(text, new LintConfig())

    expect(noUndeclaredMacros.test(fixed, new LintConfig())).toEqual([])
  })

  it('should not add a macro listed in ignoredMacros to the header', () => {
    const config = new LintConfig({ ignoredMacros: ['webout'] })

    const text = `/**
  @file
  <h4> SAS Macros </h4>
**/
%webout(OBJ,x)`

    expect(noUndeclaredMacros.fix!(text, config)).toEqual(text)
  })

  it('should not add webout with the default configuration', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
**/
%webout(OBJ,x)`

    expect(noUndeclaredMacros.fix!(text, new LintConfig())).toEqual(text)
  })

  it('should add a genuine macro without adding an ignored one', () => {
    const text = `/**
  @file
  @brief test
  <h4> SAS Macros </h4>
**/
%webout(OBJ,x)
%mf_foo()`

    const expected = `/**
  @file
  @brief test

  <h4> SAS Macros </h4>
  @li mf_foo.sas

**/
%webout(OBJ,x)
%mf_foo()`

    expect(noUndeclaredMacros.fix!(text, new LintConfig())).toEqual(expected)
  })

  it('should not change a file whose macros are all declared', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
  @li mf_trim.sas
**/
%mf_trim()`

    expect(noUndeclaredMacros.fix!(text, new LintConfig())).toEqual(text)
  })

  it('should not add a header to a file that has none', () => {
    const text = `%mf_trim()`

    expect(noUndeclaredMacros.fix!(text, new LintConfig())).toEqual(text)
  })

  it('should fall back to the default configuration', () => {
    const text = `/**
  @file
  <h4> SAS Macros </h4>
**/
%mf_trim()`

    expect(noUndeclaredMacros.fix!(text)).toContain('@li mf_trim.sas')
  })

  it('should not duplicate an entry that sits below a blank line', () => {
    const text = `/**
  @file
  @brief x

  <h4> SAS Macros </h4>
  @li mf_a.sas

  @li mf_b.sas

**/
%mf_a()
%mf_b()`

    // Both macros are declared, so the fix has nothing to add and must leave
    // the file alone. A reader that stopped at the blank line would treat mf_b
    // as undeclared and add a second entry for it.
    expect(noUndeclaredMacros.fix!(text, new LintConfig())).toEqual(text)
  })
})
