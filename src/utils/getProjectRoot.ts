import path from 'path'
import os from 'os'
import { fileExists } from '@sasjs/utils/file'

/**
 * Returns the absolute path to the location of the .sasjslint file.
 * Traverses the folder tree until the .sasjslint file is found.
 * @returns {Promise<string>} the path to the folder containing the lint config.
 */
export async function getProjectRoot(): Promise<string> {
  let root = ''
  let rootFound = false
  let i = 1
  let currentLocation = process.cwd()
  const homeDir = os.homedir()

  const maxLevels = currentLocation.split(path.sep).length

  while (i <= maxLevels && !rootFound && currentLocation !== homeDir) {
    const isRoot = await fileExists(path.join(currentLocation, '.sasjslint'))

    if (isRoot) {
      rootFound = true
      root = currentLocation

      break
    } else {
      currentLocation = path.join(currentLocation, '..')
      i++
    }
  }

  return root
}
