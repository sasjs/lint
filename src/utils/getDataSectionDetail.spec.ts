import { LintConfig } from '../types'
import { getDataSectionsDetail, checkIsDataLine } from './getDataSectionsDetail'
import { DefaultLintConfiguration } from './getLintConfig'

const datalines = `GROUP_LOGIC:$3. SUBGROUP_LOGIC:$3. SUBGROUP_ID:8. VARIABLE_NM:$32. OPERATOR_NM:$10. RAW_VALUE:$4000.
AND,AND,1,LIBREF,CONTAINS,"'DC'"
AND,OR,2,DSN,=,"'MPE_LOCK_ANYTABLE'"`

const datalinesBeginPattern1 = `datalines;`
const datalinesBeginPattern2 = `datalines4;`
const datalinesBeginPattern3 = `cards;`
const datalinesBeginPattern4 = `cards4;`
const datalinesBeginPattern5 = `parmcards;`
const datalinesBeginPattern6 = `parmcards4;`

const datalinesEndPattern1 = `;`
const datalinesEndPattern2 = `;;;;`

describe('getDataSectionsDetail', () => {
  const config = new LintConfig(DefaultLintConfiguration)
  it(`should return the detail of data section when it begins and ends with '${datalinesBeginPattern1}' and '${datalinesEndPattern1}' markers`, () => {
    const text = `%put  hello\n${datalinesBeginPattern1}\n${datalines}\n${datalinesEndPattern1}\n%put world;`
    expect(getDataSectionsDetail(text, config)).toEqual([
      {
        start: 1,
        end: 5
      }
    ])
  })

  it(`should return the detail of data section when it begins and ends with '${datalinesBeginPattern2}' and '${datalinesEndPattern2}' markers`, () => {
    const text = `%put  hello\n${datalinesBeginPattern2}\n${datalines}\n${datalinesEndPattern2}\n%put world;`
    expect(getDataSectionsDetail(text, config)).toEqual([
      {
        start: 1,
        end: 5
      }
    ])
  })

  it(`should return the detail of data section when it begins and ends with '${datalinesBeginPattern3}' and '${datalinesEndPattern1}' markers`, () => {
    const text = `%put  hello\n${datalinesBeginPattern3}\n${datalines}\n${datalinesEndPattern1}\n%put world;`
    expect(getDataSectionsDetail(text, config)).toEqual([
      {
        start: 1,
        end: 5
      }
    ])
  })

  it(`should return the detail of data section when it begins and ends with '${datalinesBeginPattern4}' and '${datalinesEndPattern2}' markers`, () => {
    const text = `%put  hello\n${datalinesBeginPattern4}\n${datalines}\n${datalinesEndPattern2}\n%put world;`
    expect(getDataSectionsDetail(text, config)).toEqual([
      {
        start: 1,
        end: 5
      }
    ])
  })

  it(`should return the detail of data section when it begins and ends with '${datalinesBeginPattern5}' and '${datalinesEndPattern1}' markers`, () => {
    const text = `%put  hello\n${datalinesBeginPattern5}\n${datalines}\n${datalinesEndPattern1}\n%put world;`
    expect(getDataSectionsDetail(text, config)).toEqual([
      {
        start: 1,
        end: 5
      }
    ])
  })

  it(`should return the detail of data section when it begins and ends with '${datalinesBeginPattern6}' and '${datalinesEndPattern2}' markers`, () => {
    const text = `%put  hello\n${datalinesBeginPattern6}\n${datalines}\n${datalinesEndPattern2}\n%put world;`
    expect(getDataSectionsDetail(text, config)).toEqual([
      {
        start: 1,
        end: 5
      }
    ])
  })

  it('should find a section opened by an indented statement', () => {
    const text = `data example;\n  ${datalinesBeginPattern1}\n${datalines}\n  ${datalinesEndPattern1}\nrun;`
    expect(getDataSectionsDetail(text, config)).toEqual([
      {
        start: 1,
        end: 5
      }
    ])
  })

  it('should find a section whose opener follows another statement on the line', () => {
    const text = `data example;\n  input name $ amount; ${datalinesBeginPattern3}\n${datalines}\n${datalinesEndPattern1}\nrun;`
    expect(getDataSectionsDetail(text, config)).toEqual([
      {
        start: 1,
        end: 5
      }
    ])
  })

  it('should find a section whose opener follows a terminator with no space', () => {
    const text = `data example;\nx=1;${datalinesBeginPattern5}\n${datalines}\n${datalinesEndPattern1}\nrun;`
    expect(getDataSectionsDetail(text, config)).toEqual([
      {
        start: 1,
        end: 5
      }
    ])
  })

  it('should not read an opener out of a quoted literal', () => {
    const text = `data _null_;\n  x = "a;${datalinesBeginPattern3}";\nx=1;`
    expect(getDataSectionsDetail(text, config)).toEqual([])
  })

  it('should not read a keyword in prose as an opener', () => {
    const text = `run;\n  /* see ${datalinesBeginPattern3} below */\nx=1;`
    expect(getDataSectionsDetail(text, config)).toEqual([])
  })

  it('should find a section opened in upper case, which SAS accepts', () => {
    const text = `data example;\n${datalinesBeginPattern1.toUpperCase()}\n${datalines}\n${datalinesEndPattern1}\nrun;`
    expect(getDataSectionsDetail(text, config)).toEqual([
      {
        start: 1,
        end: 5
      }
    ])
  })
})

describe('checkIsDataLine', () => {
  const config = new LintConfig(DefaultLintConfiguration)
  it(`should return true if a line index is in a range of any data section`, () => {
    const text = `%put  hello\n${datalinesBeginPattern1}\n${datalines}\n${datalinesEndPattern1}\n%put world;`
    expect(
      checkIsDataLine(
        [
          {
            start: 1,
            end: 5
          }
        ],
        4
      )
    ).toBe(true)
  })

  it(`should return false if a line index is not in a range of any of data sections`, () => {
    const text = `%put  hello\n${datalinesBeginPattern1}\n${datalines}\n${datalinesEndPattern1}\n%put world;`
    expect(
      checkIsDataLine(
        [
          {
            start: 1,
            end: 5
          }
        ],
        8
      )
    ).toBe(false)
  })
})
