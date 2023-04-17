import { listSubFoldersInFolder } from '@sasjs/utils/file'
import path from 'path'
import { Diagnostic, LintConfig } from '../types'
import { asyncForEach, getLintConfig, isIgnored, listSasFiles } from '../utils'
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
 * @returns {Promise<Map<string, Diagnostic[]>>} Resolves with a map with array of diagnostic objects, each containing a warning, line number and column number, and grouped by file path.
 */
export const lintFolder = async (
  folderPath: string,
  configuration?: LintConfig
) => {
  const config = configuration || (await getLintConfig())
  let diagnostics: Map<string, Diagnostic[]> = new Map<string, Diagnostic[]>()

  if (await isIgnored(folderPath, config)) return diagnostics

  const fileNames = await listSasFiles(folderPath)
  await asyncForEach(fileNames, async (fileName) => {
    const filePath = path.join(folderPath, fileName)
    diagnostics.set(filePath, await lintFile(filePath, config))
  })

  const subFolders = (await listSubFoldersInFolder(folderPath)).filter(
    (f: string) => !excludeFolders.includes(f)
  )

  await asyncForEach(subFolders, async (subFolder) => {
    const subFolderPath = path.join(folderPath, subFolder)
    const subFolderDiagnostics = await lintFolder(subFolderPath, config)
    diagnostics = new Map([...diagnostics, ...subFolderDiagnostics])
  })

  return diagnostics
}
