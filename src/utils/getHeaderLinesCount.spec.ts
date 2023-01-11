import { LintConfig } from '../types'
import { getHeaderLinesCount } from './getHeaderLinesCount'
import { DefaultLintConfiguration } from './getLintConfig'

const sasCodeWithHeader = `/**
@file
@brief <Your brief here>
<h4> SAS Macros </h4>
**/
%put hello world;
`

const sasCodeWithoutHeader = `%put hello world;`

describe('getHeaderLinesCount', () => {
  it('should return the number of line header spans upon', () => {
    const config = new LintConfig(DefaultLintConfiguration)
    expect(getHeaderLinesCount(sasCodeWithHeader, config)).toEqual(5)
    expect(getHeaderLinesCount(sasCodeWithoutHeader, config)).toEqual(0)
  })
})
