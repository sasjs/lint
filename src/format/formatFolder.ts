import { listSubFoldersInFolder } from '@sasjs/utils/file'
import path from 'path'
import { LintConfig } from '../types/LintConfig'
import { asyncForEach } from '../utils/asyncForEach'
import { getLintConfig } from '../utils/getLintConfig'
import { listSasFiles } from '../utils/listSasFiles'
import { formatFile } from './formatFile'

const excludeFolders = [
  '.git',
  '.github',
  '.vscode',
  'node_modules',
  'sasjsbuild',
  'sasjsresults'
]

/**
 * Automatically formats all SAS files in the folder at the given path.
 * @param {string} folderPath - the path to the folder to be formatted.
 * @param {LintConfig} configuration - an optional configuration. When not passed in, this is read from the .sasjslint file.
 * @returns {Promise<void>} Resolves successfully when all SAS files in the given folder have been formatted.
 */
export const formatFolder = async (
  folderPath: string,
  configuration?: LintConfig
) => {
  const config = configuration || (await getLintConfig())
  const fileNames = await listSasFiles(folderPath)
  await asyncForEach(fileNames, async (fileName) => {
    const filePath = path.join(folderPath, fileName)
    await formatFile(filePath)
  })

  const subFolders = (await listSubFoldersInFolder(folderPath)).filter(
    (f: string) => !excludeFolders.includes(f)
  )

  await asyncForEach(subFolders, async (subFolder) => {
    await formatFolder(path.join(folderPath, subFolder), config)
  })
}
