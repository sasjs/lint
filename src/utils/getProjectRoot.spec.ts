import { getProjectRoot } from './getProjectRoot'
import path from 'path'

describe('getProjectRoot', () => {
  it('should return the current location if it contains the lint config file', async () => {
    const projectRoot = await getProjectRoot()

    expect(projectRoot).toEqual(process.cwd())
  })

  it('should return the parent folder if it contains the lint config file', async () => {
    const currentLocation = process.cwd()
    jest
      .spyOn(process, 'cwd')
      .mockImplementationOnce(() =>
        path.join(currentLocation, 'folder', 'subfolder')
      )
    const projectRoot = await getProjectRoot()

    expect(projectRoot).toEqual(currentLocation)
  })
})
