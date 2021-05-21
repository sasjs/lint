import { LintConfig } from '../types'
import { parseMacros } from './parseMacros'

describe('parseMacros', () => {
  it('should return an array with a single macro', () => {
    const text = ` %macro test;
  %put 'hello';
%mend`

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
    const text = `%macro test(var,sum);
  %put 'hello';
%mend`

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
    const text = `%macro test/parmbuff;
  %put 'hello';
%mend`

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
    const text = `/* commentary */  %macro foobar(arg) /store source
      des="This macro does not do much";
  %put 'hello';
%mend`

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
    const text = `%macro foo;
  %put 'foo';
%mend;
%macro bar();
  %put 'bar';
%mend bar;`

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
    const text = `%macro test();
  %put 'hello';
  %macro test2;
    %put 'world;
  %mend
%mend test`

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
      const text = `%macro 
      test;
  %put 'hello';
%mend`

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
      const text = `%macro 
      test(
        var,
        sum);%put 'hello';
%mend`

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
      const text = `%macro test
      /parmbuff;
  %put 'hello';
%mend`

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
      const text = `/* commentary */  %macro foobar/* commentary */(arg) 
      /* commentary */
      /store
      /* commentary */source
      des="This macro does not do much";
  %put 'hello';
%mend`

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
  })
})
