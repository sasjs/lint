import { readFile, listSubFoldersInFolder } from '@sasjs/utils/file'
import { Diagnostic } from './types/Diagnostic'
import { LintConfig } from './types/LintConfig'
import { asyncForEach } from './utils/asyncForEach'
import { getLintConfig } from './utils/getLintConfig'
import { listSasFiles } from './utils/listSasFiles'
import path from 'path'
import { getProjectRoot } from './utils'

const excludeFolders = [
  '.git',
  '.github',
  '.vscode',
  'node_modules',
  'sasjsbuild',
  'sasjsresults'
]

/**
 * Analyses and produces a set of diagnostics for the given text content.
 * @param {string} text - the text content to be linted.
 * @returns {Diagnostic[]} array of diagnostic objects, each containing a warning, line number and column number.
 */
export const lintText = async (text: string) => {
  const config = await getLintConfig()
  return processText(text, config)
}

/**
 * Analyses and produces a set of diagnostics for the file at the given path.
 * @param {string} filePath - the path to the file to be linted.
 * @param {LintConfig} configuration - an optional configuration. When not passed in, this is read from the .sasjslint file.
 * @returns {Diagnostic[]} array of diagnostic objects, each containing a warning, line number and column number.
 */
export const lintFile = async (
  filePath: string,
  configuration?: LintConfig
) => {
  const config = configuration || (await getLintConfig())
  const text = await readFile(filePath)

  const fileDiagnostics = processFile(filePath, config)
  const textDiagnostics = processText(text, config)

  return [...fileDiagnostics, ...textDiagnostics]
}

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

/**
 * Analyses and produces a set of diagnostics for the current project.
 * @returns {Diagnostic[]} array of diagnostic objects, each containing a warning, line number and column number.
 */
export const lintProject = async () => {
  const projectRoot = await getProjectRoot()
  return await lintFolder(projectRoot)
}

/**
 * Splits the given content into a list of lines, regardless of CRLF or LF line endings.
 * @param {string} text - the text content to be split into lines.
 * @returns {string[]} an array of lines from the given text
 */
export const splitText = (text: string): string[] => {
  if (!text) return []
  return text.replace(/\r\n/g, '\n').split('\n')
}

const processText = (text: string, config: LintConfig) => {
  const lines = splitText(text)
  const diagnostics: Diagnostic[] = []
  diagnostics.push(...processContent(config, text))
  lines.forEach((line, index) => {
    diagnostics.push(...processLine(config, line, index + 1))
  })

  return diagnostics
}

const processContent = (config: LintConfig, content: string): Diagnostic[] => {
  const diagnostics: Diagnostic[] = []
  config.fileLintRules.forEach((rule) => {
    diagnostics.push(...rule.test(content))
  })

  return diagnostics
}

const processLine = (
  config: LintConfig,
  line: string,
  lineNumber: number
): Diagnostic[] => {
  const diagnostics: Diagnostic[] = []
  config.lineLintRules.forEach((rule) => {
    diagnostics.push(...rule.test(line, lineNumber, config))
  })

  return diagnostics
}

const processFile = (filePath: string, config: LintConfig): Diagnostic[] => {
  const diagnostics: Diagnostic[] = []
  config.pathLintRules.forEach((rule) => {
    diagnostics.push(...rule.test(filePath))
  })

  return diagnostics
}
