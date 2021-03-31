import { listSubFoldersInFolder } from '@sasjs/utils/file'
import path from 'path'
import { Diagnostic } from '../types/Diagnostic'
import { LintConfig } from '../types/LintConfig'
import { asyncForEach } from '../utils/asyncForEach'
import { getLintConfig } from '../utils/getLintConfig'
import { listSasFiles } from '../utils/listSasFiles'
import { lintFile } from './lintFile'

const excludeFolders = [
  '.git',
  '.github',
  '.vscode',
  'node_modules',
  'sasjsbuild',
  'sasjsresults'
]

/**
 * Analyses and produces a set of diagnostics for the folder at the given path.
 * @param {string} folderPath - the path to the folder to be linted.
 * @param {LintConfig} configuration - an optional configuration. When not passed in, this is read from the .sasjslint file.
 * @returns {Diagnostic[]} array of diagnostic objects, each containing a warning, line number and column number.
 */
export const lintFolder = async (
  folderPath: string,
  configuration?: LintConfig
) => {
  const config = configuration || (await getLintConfig())
  const diagnostics: Diagnostic[] = []
  const fileNames = await listSasFiles(folderPath)
  await asyncForEach(fileNames, async (fileName) => {
    diagnostics.push(
      ...(await lintFile(path.join(folderPath, fileName), config))
    )
  })

  const subFolders = (await listSubFoldersInFolder(folderPath)).filter(
    (f: string) => !excludeFolders.includes(f)
  )

  await asyncForEach(subFolders, async (subFolder) => {
    diagnostics.push(
      ...(await lintFolder(path.join(folderPath, subFolder), config))
    )
  })

  return diagnostics
}
