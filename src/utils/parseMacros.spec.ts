import { LintConfig } from '../types'
import { parseMacros } from './parseMacros'

describe('parseMacros', () => {
  it('should return an array with a single macro', () => {
    const text = ` %macro test;\n  %put 'hello';\n%mend`

    const macros = parseMacros(text, new LintConfig())

    expect(macros.length).toEqual(1)
    expect(macros).toContainEqual({
      name: 'test',
      declarationLines: [' %macro test;'],
      terminationLine: '%mend',
      declaration: '%macro test',
      termination: '%mend',
      startLineNumbers: [1],
      endLineNumber: 3,
      parentMacro: '',
      hasMacroNameInMend: false,
      mismatchedMendMacroName: ''
    })
  })

  it('should return an array with a single macro having parameters', () => {
    const text = `%macro test(var,sum);\n  %put 'hello';\n%mend`

    const macros = parseMacros(text, new LintConfig())

    expect(macros.length).toEqual(1)
    expect(macros).toContainEqual({
      name: 'test',
      declarationLines: ['%macro test(var,sum);'],
      terminationLine: '%mend',
      declaration: '%macro test(var,sum)',
      termination: '%mend',
      startLineNumbers: [1],
      endLineNumber: 3,
      parentMacro: '',
      hasMacroNameInMend: false,
      mismatchedMendMacroName: ''
    })
  })

  it('should return an array with a single macro having PARMBUFF option', () => {
    const text = `%macro test/parmbuff;\n  %put 'hello';\n%mend`

    const macros = parseMacros(text, new LintConfig())

    expect(macros.length).toEqual(1)
    expect(macros).toContainEqual({
      name: 'test',
      declarationLines: ['%macro test/parmbuff;'],
      terminationLine: '%mend',
      declaration: '%macro test/parmbuff',
      termination: '%mend',
      startLineNumbers: [1],
      endLineNumber: 3,
      parentMacro: '',
      hasMacroNameInMend: false,
      mismatchedMendMacroName: ''
    })
  })

  it('should return an array with a single macro having paramerter & SOURCE option', () => {
    const text = `/* commentary */  %macro foobar(arg) /store source\n      des="This macro does not do much";\n  %put 'hello';\n%mend`

    const macros = parseMacros(text, new LintConfig())

    expect(macros.length).toEqual(1)
    expect(macros).toContainEqual({
      name: 'foobar',
      declarationLines: [
        '/* commentary */  %macro foobar(arg) /store source',
        '      des="This macro does not do much";'
      ],
      terminationLine: '%mend',
      declaration:
        '%macro foobar(arg) /store source des="This macro does not do much"',
      termination: '%mend',
      startLineNumbers: [1, 2],
      endLineNumber: 4,
      parentMacro: '',
      hasMacroNameInMend: false,
      mismatchedMendMacroName: ''
    })
  })

  it('should return an array with multiple macros', () => {
    const text = `%macro foo;\n  %put 'foo';\n%mend;\n%macro bar();\n  %put 'bar';\n%mend bar;`

    const macros = parseMacros(text, new LintConfig())

    expect(macros.length).toEqual(2)
    expect(macros).toContainEqual({
      name: 'foo',
      declarationLines: ['%macro foo;'],
      terminationLine: '%mend;',
      declaration: '%macro foo',
      termination: '%mend',
      startLineNumbers: [1],
      endLineNumber: 3,
      parentMacro: '',
      hasMacroNameInMend: false,
      mismatchedMendMacroName: ''
    })
    expect(macros).toContainEqual({
      name: 'bar',
      declarationLines: ['%macro bar();'],
      terminationLine: '%mend bar;',
      declaration: '%macro bar()',
      termination: '%mend bar',
      startLineNumbers: [4],
      endLineNumber: 6,
      parentMacro: '',
      hasMacroNameInMend: true,
      mismatchedMendMacroName: ''
    })
  })

  it('should detect nested macro definitions', () => {
    const text = `%macro test();\n  %put 'hello';\n  %macro test2;\n    %put 'world;\n  %mend\n%mend test`

    const macros = parseMacros(text, new LintConfig())

    expect(macros.length).toEqual(2)
    expect(macros).toContainEqual({
      name: 'test',
      declarationLines: ['%macro test();'],
      terminationLine: '%mend test',
      declaration: '%macro test()',
      termination: '%mend test',
      startLineNumbers: [1],
      endLineNumber: 6,
      parentMacro: '',
      hasMacroNameInMend: true,
      mismatchedMendMacroName: ''
    })
    expect(macros).toContainEqual({
      name: 'test2',
      declarationLines: ['  %macro test2;'],
      terminationLine: '  %mend',
      declaration: '%macro test2',
      termination: '%mend',
      startLineNumbers: [3],
      endLineNumber: 5,
      parentMacro: 'test',
      hasMacroNameInMend: false,
      mismatchedMendMacroName: ''
    })
  })

  describe(`multi-line macro declarations`, () => {
    it('should return an array with a single macro', () => {
      const text = `%macro \n      test;\n  %put 'hello';\n%mend`

      const macros = parseMacros(text, new LintConfig())

      expect(macros.length).toEqual(1)
      expect(macros).toContainEqual({
        name: 'test',
        declarationLines: ['%macro ', '      test;'],
        terminationLine: '%mend',
        declaration: '%macro test',
        termination: '%mend',
        startLineNumbers: [1, 2],
        endLineNumber: 4,
        parentMacro: '',
        hasMacroNameInMend: false,
        mismatchedMendMacroName: ''
      })
    })

    it('should return an array with a single macro having parameters', () => {
      const text = `%macro \n      test(\n        var,\n        sum);%put 'hello';\n%mend`

      const macros = parseMacros(text, new LintConfig())

      expect(macros.length).toEqual(1)
      expect(macros).toContainEqual({
        name: 'test',
        declarationLines: [
          '%macro ',
          `      test(`,
          `        var,`,
          `        sum);%put 'hello';`
        ],
        terminationLine: '%mend',
        declaration: '%macro test( var, sum)',
        termination: '%mend',
        startLineNumbers: [1, 2, 3, 4],
        endLineNumber: 5,
        parentMacro: '',
        hasMacroNameInMend: false,
        mismatchedMendMacroName: ''
      })
    })

    it('should return an array with a single macro having PARMBUFF option', () => {
      const text = `%macro test\n      /parmbuff;\n  %put 'hello';\n%mend`

      const macros = parseMacros(text, new LintConfig())

      expect(macros.length).toEqual(1)
      expect(macros).toContainEqual({
        name: 'test',
        declarationLines: ['%macro test', '      /parmbuff;'],
        terminationLine: '%mend',
        declaration: '%macro test /parmbuff',
        termination: '%mend',
        startLineNumbers: [1, 2],
        endLineNumber: 4,
        parentMacro: '',
        hasMacroNameInMend: false,
        mismatchedMendMacroName: ''
      })
    })

    it('should return an array with a single macro having paramerter & SOURCE option', () => {
      const text = `/* commentary */  %macro foobar/* commentary */(arg) \n      /* commentary */\n      /store\n      /* commentary */source\n      des="This macro does not do much";\n  %put 'hello';\n%mend`

      const macros = parseMacros(text, new LintConfig())

      expect(macros.length).toEqual(1)
      expect(macros).toContainEqual({
        name: 'foobar',
        declarationLines: [
          '/* commentary */  %macro foobar/* commentary */(arg) ',
          '      /* commentary */',
          '      /store',
          '      /* commentary */source',
          '      des="This macro does not do much";'
        ],
        terminationLine: '%mend',
        declaration:
          '%macro foobar(arg) /store source des="This macro does not do much"',
        termination: '%mend',
        startLineNumbers: [1, 2, 3, 4, 5],
        endLineNumber: 7,
        parentMacro: '',
        hasMacroNameInMend: false,
        mismatchedMendMacroName: ''
      })
    })

    it('should return an array with a single macro having semi-colon in params', () => {
      const text = `\n%macro mm_createapplication(\n    tree=/User Folders/sasdemo\n    ,name=myApp\n    ,ClassIdentifier=mcore\n    ,desc=Created by mm_createapplication\n    ,params= param1=1&#x0a;param2=blah\n    ,version=\n    ,frefin=mm_in\n    ,frefout=mm_out\n    ,mDebug=1\n    );`

      const macros = parseMacros(text, new LintConfig())

      expect(macros.length).toEqual(1)
      expect(macros).toContainEqual({
        name: 'mm_createapplication',
        declarationLines: [
          `%macro mm_createapplication(`,
          `    tree=/User Folders/sasdemo`,
          `    ,name=myApp`,
          `    ,ClassIdentifier=mcore`,
          `    ,desc=Created by mm_createapplication`,
          `    ,params= param1=1&#x0a;param2=blah`,
          `    ,version=`,
          `    ,frefin=mm_in`,
          `    ,frefout=mm_out`,
          `    ,mDebug=1`,
          `    );`
        ],
        terminationLine: '',
        declaration:
          '%macro mm_createapplication( tree=/User Folders/sasdemo ,name=myApp ,ClassIdentifier=mcore ,desc=Created by mm_createapplication ,params= param1=1&#x0a;param2=blah ,version= ,frefin=mm_in ,frefout=mm_out ,mDebug=1 )',
        termination: '',
        startLineNumbers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        endLineNumber: null,
        parentMacro: '',
        hasMacroNameInMend: false,
        mismatchedMendMacroName: ''
      })
    })
  })
})

describe('parseMacros - keyword capitalisation', () => {
  it('should read an upper case definition and %mend', () => {
    const text = `%MACRO test();\n  %put 'hello';\n%MEND test;`

    expect(parseMacros(text, new LintConfig())).toContainEqual({
      name: 'test',
      declarationLines: ['%MACRO test();'],
      terminationLine: '%MEND test;',
      declaration: '%MACRO test()',
      termination: '%MEND test',
      startLineNumbers: [1],
      endLineNumber: 3,
      parentMacro: '',
      hasMacroNameInMend: true,
      mismatchedMendMacroName: ''
    })
  })

  it('should read a mixed case definition', () => {
    const text = `%Macro test(var);\n  %put 'hello';\n%mend test`

    const macros = parseMacros(text, new LintConfig())

    expect(macros.length).toEqual(1)
    expect(macros[0].name).toEqual('test')
    expect(macros[0].endLineNumber).toEqual(3)
  })

  it('should match the %mend name without regard to case', () => {
    const text = `%macro Foo();\n  %put 'hello';\n%mend foo;`

    const macros = parseMacros(text, new LintConfig())

    expect(macros[0].name).toEqual('Foo')
    expect(macros[0].hasMacroNameInMend).toBe(true)
    expect(macros[0].mismatchedMendMacroName).toEqual('')
  })

  it('should read the %mend name after a tab', () => {
    const text = `%macro test();\n  %put 'hello';\n%mend\ttest;`

    expect(parseMacros(text, new LintConfig())[0].hasMacroNameInMend).toBe(true)
  })

  it('should not read a call that starts with the keyword as a definition', () => {
    const text = `%macro_thing(x=1);\n%put done;`

    expect(parseMacros(text, new LintConfig())).toEqual([])
  })

  it('should record a mixed case nested definition under its parent', () => {
    const text = `%macro outer();\n  %MACRO inner();\n    %put 'x';\n  %mend inner;\n%mend outer;`

    const macros = parseMacros(text, new LintConfig())

    expect(macros.map((macro) => [macro.name, macro.parentMacro])).toEqual([
      ['inner', 'outer'],
      ['outer', '']
    ])
    expect(macros[0].endLineNumber).toEqual(4)
    expect(macros[1].endLineNumber).toEqual(5)
  })
})

describe('parseMacros - file endings that differ from the config', () => {
  it('should parse an LF file under lineEndings crlf', () => {
    const text = "%macro foo();\n  %put 'x';\n%mend;"
    const macros = parseMacros(text, new LintConfig({ lineEndings: 'crlf' }))

    expect(macros.length).toEqual(1)
    expect(macros[0].name).toEqual('foo')
    expect(macros[0].startLineNumbers).toEqual([1])
    expect(macros[0].endLineNumber).toEqual(3)
    expect(macros[0].declarationLines![0].includes('\r')).toBe(false)
  })

  it('should parse a CRLF file under lineEndings lf', () => {
    const text = "%macro foo();\r\n  %put 'x';\r\n%mend;"
    const macros = parseMacros(text, new LintConfig({ lineEndings: 'lf' }))

    expect(macros[0].startLineNumbers).toEqual([1])
    expect(macros[0].endLineNumber).toEqual(3)
    expect(macros[0].declarationLines![0].includes('\r')).toBe(false)
  })

  it('should drop the content of a comment that spans lines from the declaration', () => {
    const macros = parseMacros(`%macro m(a = 1 /* note,
  more text */
)/secure;
%mend;`)

    // The comment opens on line 1 and closes on line 2 (#274): its content is not
    // part of the declaration, and the closing parenthesis is still found.
    expect(macros[0].declaration).toEqual('%macro m(a = 1 )/secure')
  })

  it('should keep a comment marker inside a quoted default in the declaration', () => {
    const macros = parseMacros(`%macro m(a = '/*', b);
%mend;`)

    expect(macros[0].declaration).toEqual(`%macro m(a = '/*', b)`)
  })

  it('should read a definition that follows a comment closing on the same line', () => {
    const macros = parseMacros(`/* note
*/ %macro foo;
%mend;`)

    // The comment opened on the previous line and closes ahead of the code, so
    // the declaration is on this line and must not be swallowed as comment text.
    expect(macros).toHaveLength(1)
    expect(macros[0].name).toEqual('foo')
    expect(macros[0].declaration).toEqual('%macro foo')
  })

  it('should still drop a statement that continues an unclosed comment', () => {
    const macros = parseMacros(`%macro foo;
  /* note
  more */ %put 'x';
%mend;`)

    expect(macros).toHaveLength(1)
    expect(macros[0].name).toEqual('foo')
  })

  it('should read a comment marker inside a multi-line quoted value as text', () => {
    const macros = parseMacros(`%macro m(a = "ab
/* not a comment */ cd");
%mend;`)

    // A SAS literal continues onto the next line (measured: length is 4 for
    // "ab / cd"), so the marker inside it is data and the declaration keeps it.
    expect(macros).toHaveLength(1)
    expect(macros[0].declaration).toContain('/* not a comment */')
  })
})
