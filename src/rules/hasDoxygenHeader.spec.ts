import { Severity } from '../types/Severity'
import { hasDoxygenHeader } from './hasDoxygenHeader'

describe('hasDoxygenHeader', () => {
  it('should return an empty array when the file starts with a doxygen header', () => {
    const content = `/**
   @file
   @brief Returns an unused libref
 **/

 %macro mf_getuniquelibref(prefix=mclib,maxtries=1000);
   %local x libref;
   %let x={SAS002};
   %do x=0 %to &maxtries;`

    expect(hasDoxygenHeader.test(content)).toEqual([])
  })

  it('should return an array with a single diagnostic when the file has no header', () => {
    const content = `
 %macro mf_getuniquelibref(prefix=mclib,maxtries=1000);
   %local x libref;
   %let x={SAS002};
   %do x=0 %to &maxtries;`

    expect(hasDoxygenHeader.test(content)).toEqual([
      {
        message: 'File missing Doxygen header',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a single diagnostic when the file has comment blocks but no header', () => {
    const content = `
 %macro mf_getuniquelibref(prefix=mclib,maxtries=1000);
   %local x libref;
   %let x={SAS002};
  /** Comment Line 1
   * Comment Line 2
   */
   %do x=0 %to &maxtries;`

    expect(hasDoxygenHeader.test(content)).toEqual([
      {
        message: 'File missing Doxygen header',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })

  it('should return an array with a single diagnostic when the file is undefined', () => {
    const content = undefined

    expect(hasDoxygenHeader.test((content as unknown) as string)).toEqual([
      {
        message: 'File missing Doxygen header',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })
})
