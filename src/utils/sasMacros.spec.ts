import { readFileSync } from 'fs'
import path from 'path'
import { isSasMacro, sasMacros } from './sasMacros'

/**
 * The published data, read straight from the dependency rather than through
 * the generated file, so this spec fails when the two disagree.
 */
const dataDir = path.join(
  __dirname,
  '..',
  '..',
  'node_modules',
  '@sasjs',
  'sas-language',
  'data'
)

const namesFromData = (group: string): string[] => {
  const parsed = JSON.parse(
    readFileSync(path.join(dataDir, `${group}.index.json`), 'utf8')
  )

  return parsed.entries
    .map((entry: [string]) =>
      String(entry[0]).replace(/^%/, '').trim().toLowerCase()
    )
    .filter((name: string) => name && !/\s/.test(name))
}

describe('sasMacros', () => {
  it('should match the published SAS language data', () => {
    const expected = [
      ...new Set([
        ...namesFromData('macroStatements'),
        ...namesFromData('macroFunctions')
      ])
    ].sort()

    expect([...sasMacros].sort()).toEqual(expected)
  })

  it('should treat the SAS macro keywords and functions as declared', () => {
    for (const name of [
      'if',
      'then',
      'do',
      'scan',
      'index',
      'sysfunc',
      'qtrim',
      'inc',
      'by',
      'to',
      'indexc',
      'tranwrd',
      'qklowcase'
    ]) {
      expect(isSasMacro(name)).toBe(true)
    }
  })

  it('should not treat a user macro as declared', () => {
    expect(isSasMacro('mf_myMacro')).toBe(false)
    expect(isSasMacro('MF_MYMACRO')).toBe(false)
  })
})
