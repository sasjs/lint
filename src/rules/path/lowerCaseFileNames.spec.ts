import { Severity } from '../../types/Severity'
import { lowerCaseFileNames } from './lowerCaseFileNames'

describe('lowerCaseFileNames', () => {
  it('should return an empty array when the file name has no uppercase characters', () => {
    const filePath = '/code/sas/my_sas_file.sas'
    expect(lowerCaseFileNames.test(filePath)).toEqual([])
  })

  it('should return an empty array when the file name has no uppercase characters, even if the containing folder has uppercase characters', () => {
    const filePath = '/code/SAS Projects/my_sas_file.sas'
    expect(lowerCaseFileNames.test(filePath)).toEqual([])
  })

  it('should return an array with a single diagnostic when the file name has uppercase characters', () => {
    const filePath = '/code/sas/my SAS file.sas'
    expect(lowerCaseFileNames.test(filePath)).toEqual([
      {
        message: 'File name contains uppercase characters',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })
})
