import { listSubFoldersInFolder } from '@sasjs/utils/file'
import path from 'path'
import { lintFolder } from '../lint'
import { FormatResult } from '../types'
import { LintConfig } from '../types/LintConfig'
import { asyncForEach } from '../utils/asyncForEach'
import { getLintConfig } from '../utils/getLintConfig'
import { listSasFiles } from '../utils/listSasFiles'
import { FormatOptions } from '../types/FormatOptions'
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
 * @param {FormatOptions} options - an optional layout engine, passed to every file.
 * @returns {Promise<FormatResult>} Resolves successfully when all SAS files in the given folder have been formatted.
 */
export const formatFolder = async (
  folderPath: string,
  configuration?: LintConfig,
  options: FormatOptions = {}
): Promise<FormatResult> => {
  const config = configuration || (await getLintConfig())
  // The counts have to be measured with the same configuration the files are
  // formatted by, or a rule the caller switched off is still counted as unfixed.
  const diagnosticsBeforeFormat = await lintFolder(folderPath, config)
  const diagnosticsCountBeforeFormat = Array.from(
    diagnosticsBeforeFormat.values()
  ).reduce((a, b) => a + b.length, 0)

  const fileNames = await listSasFiles(folderPath)
  // A file the engine refuses must not decide what happens to the rest of the
  // tree: the walk continues and the failures are raised together at the end, so
  // one unformattable buffer cannot leave a project half written.
  const failures: string[] = []
  await asyncForEach(fileNames, async (fileName) => {
    const filePath = path.join(folderPath, fileName)
    try {
      await formatFile(filePath, config, options)
    } catch (error: any) {
      failures.push(`${filePath}: ${error?.message ?? error}`)
    }
  })

  const subFolders = (await listSubFoldersInFolder(folderPath)).filter(
    (f: string) => !excludeFolders.includes(f)
  )

  await asyncForEach(subFolders, async (subFolder) => {
    try {
      await formatFolder(path.join(folderPath, subFolder), config, options)
    } catch (error: any) {
      failures.push(
        `${path.join(folderPath, subFolder)}: ${error?.message ?? error}`
      )
    }
  })

  const diagnosticsAfterFormat = await lintFolder(folderPath, config)
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

  if (failures.length) {
    throw new Error(
      `Could not format ${failures.length} file(s). Everything else was formatted.\n` +
        failures.map((failure) => `  ${failure}`).join('\n')
    )
  }

  return {
    updatedFilePaths,
    fixedDiagnosticsCount,
    unfixedDiagnostics: diagnosticsAfterFormat
  }
}
