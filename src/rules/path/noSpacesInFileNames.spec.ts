import { Severity } from '../../types/Severity'
import { noSpacesInFileNames } from './noSpacesInFileNames'

describe('noSpacesInFileNames', () => {
  it('should return an empty array when the file name has no spaces', () => {
    const filePath = '/code/sas/my_sas_file.sas'
    expect(noSpacesInFileNames.test(filePath)).toEqual([])
  })

  it('should return an empty array when the file name has no spaces, even if the containing folder has spaces', () => {
    const filePath = '/code/sas projects/my_sas_file.sas'
    expect(noSpacesInFileNames.test(filePath)).toEqual([])
  })

  it('should return an array with a single diagnostic when the file name has spaces', () => {
    const filePath = '/code/sas/my sas file.sas'
    expect(noSpacesInFileNames.test(filePath)).toEqual([
      {
        message: 'File name contains spaces',
        lineNumber: 1,
        startColumnNumber: 1,
        endColumnNumber: 1,
        severity: Severity.Warning
      }
    ])
  })
})
