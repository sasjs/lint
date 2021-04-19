import { LintConfig } from '../types'
import { splitText } from './splitText'

describe('splitText', () => {
  const config = new LintConfig({
    noTrailingSpaces: true,
    noEncodedPasswords: true,
    hasDoxygenHeader: true,
    noSpacesInFileNames: true,
    maxLineLength: 80,
    lowerCaseFileNames: true,
    noTabIndentation: true,
    indentationMultiple: 2,
    hasMacroNameInMend: true,
    noNestedMacros: true,
    hasMacroParentheses: true,
    lineEndings: 'lf'
  })

  it('should return an empty array when text is falsy', () => {
    const lines = splitText('', config)

    expect(lines.length).toEqual(0)
  })

  it('should return an array of lines from text', () => {
    const lines = splitText(`line 1\nline 2`, config)

    expect(lines.length).toEqual(2)
    expect(lines[0]).toEqual('line 1')
    expect(lines[1]).toEqual('line 2')
  })

  it('should work with CRLF line endings', () => {
    const lines = splitText(`line 1\r\nline 2`, config)

    expect(lines.length).toEqual(2)
    expect(lines[0]).toEqual('line 1')
    expect(lines[1]).toEqual('line 2')
  })
})
