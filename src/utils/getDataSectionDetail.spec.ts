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

  it(`should return the detail of data section when it begins and ends with '${datalinesBeginPattern4}' and '${datalinesEndPattern1}' markers`, () => {
    const text = `%put  hello\n${datalinesBeginPattern4}\n${datalines}\n${datalinesEndPattern1}\n%put world;`
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
