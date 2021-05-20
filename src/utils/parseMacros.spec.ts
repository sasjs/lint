import { LintConfig } from '../types'
import { parseMacros } from './parseMacros'

describe('parseMacros', () => {
  it('should return an array with a single macro', () => {
    const text = `%macro test;
  %put 'hello';
%mend`

    const macros = parseMacros(text, new LintConfig())

    expect(macros.length).toEqual(1)
    expect(macros).toContainEqual({
      name: 'test',
      declarationLine: '%macro test;',
      terminationLine: '%mend',
      declaration: '%macro test',
      termination: '%mend',
      startLineNumber: 1,
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
      declarationLine: '%macro test(var,sum);',
      terminationLine: '%mend',
      declaration: '%macro test(var,sum)',
      termination: '%mend',
      startLineNumber: 1,
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
      declarationLine: '%macro test/parmbuff;',
      terminationLine: '%mend',
      declaration: '%macro test/parmbuff',
      termination: '%mend',
      startLineNumber: 1,
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
      declarationLine: '/* commentary */  %macro foobar(arg) /store source',
      terminationLine: '%mend',
      declaration: '%macro foobar(arg) /store source',
      termination: '%mend',
      startLineNumber: 1,
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
      declarationLine: '%macro foo;',
      terminationLine: '%mend;',
      declaration: '%macro foo',
      termination: '%mend',
      startLineNumber: 1,
      endLineNumber: 3,
      parentMacro: '',
      hasMacroNameInMend: false,
      mismatchedMendMacroName: ''
    })
    expect(macros).toContainEqual({
      name: 'bar',
      declarationLine: '%macro bar();',
      terminationLine: '%mend bar;',
      declaration: '%macro bar()',
      termination: '%mend bar',
      startLineNumber: 4,
      endLineNumber: 6,
      parentMacro: '',
      hasMacroNameInMend: true,
      mismatchedMendMacroName: ''
    })
  })

  it('should detect nested macro definitions', () => {
    const text = `%macro test()
  %put 'hello';
  %macro test2
    %put 'world;
  %mend
%mend test`

    const macros = parseMacros(text, new LintConfig())

    expect(macros.length).toEqual(2)
    expect(macros).toContainEqual({
      name: 'test',
      declarationLine: '%macro test()',
      terminationLine: '%mend test',
      declaration: '%macro test()',
      termination: '%mend test',
      startLineNumber: 1,
      endLineNumber: 6,
      parentMacro: '',
      hasMacroNameInMend: true,
      mismatchedMendMacroName: ''
    })
    expect(macros).toContainEqual({
      name: 'test2',
      declarationLine: '  %macro test2',
      terminationLine: '  %mend',
      declaration: '%macro test2',
      termination: '%mend',
      startLineNumber: 3,
      endLineNumber: 5,
      parentMacro: 'test',
      hasMacroNameInMend: false,
      mismatchedMendMacroName: ''
    })
  })
})
