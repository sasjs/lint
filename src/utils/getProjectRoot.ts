import path from 'path'
import { fileExists } from '@sasjs/utils/file'

export async function getProjectRoot() {
  let root = ''
  let rootFound = false
  let i = 1
  let currentLocation = process.cwd()

  const maxLevels = currentLocation.split(path.sep).length

  while (i <= maxLevels && !rootFound) {
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
