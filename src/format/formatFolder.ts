import { listSubFoldersInFolder } from '@sasjs/utils/file'
import path from 'path'
import { lintFolder } from '../lint'
import { FormatResult } from '../types'
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
 * @returns {Promise<FormatResult>} Resolves successfully when all SAS files in the given folder have been formatted.
 */
export const formatFolder = async (
  folderPath: string,
  configuration?: LintConfig
): Promise<FormatResult> => {
  const config = configuration || (await getLintConfig())
  const diagnosticsBeforeFormat = await lintFolder(folderPath)
  const diagnosticsCountBeforeFormat = Array.from(
    diagnosticsBeforeFormat.values()
  ).reduce((a, b) => a + b.length, 0)

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

  const diagnosticsAfterFormat = await lintFolder(folderPath)
  const diagnosticsCountAfterFormat = Array.from(
    diagnosticsAfterFormat.values()
  ).reduce((a, b) => a + b.length, 0)

  const fixedDiagnosticsCount =
    diagnosticsCountBeforeFormat - diagnosticsCountAfterFormat

  const updatedFilePaths: string[] = []

  Array.from(diagnosticsBeforeFormat.keys()).forEach((filePath) => {
    const diagnosticsBefore = diagnosticsBeforeFormat.get(filePath) || []
    const diagnosticsAfter = diagnosticsAfterFormat.get(filePath) || []

    if (diagnosticsBefore.length !== diagnosticsAfter.length) {
      updatedFilePaths.push(filePath)
    }
  })

  return {
    updatedFilePaths,
    fixedDiagnosticsCount,
    unfixedDiagnostics: diagnosticsAfterFormat
  }
}
