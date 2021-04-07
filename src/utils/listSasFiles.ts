import { listFilesInFolder } from '@sasjs/utils/file'

/**
 * Fetches a list of .sas files in the given path.
 * @returns {Promise<string[]>} resolves with an array of file names.
 */
export const listSasFiles = async (folderPath: string): Promise<string[]> => {
  const files = await listFilesInFolder(folderPath)
  return files.filter((f) => f.endsWith('.sas'))
}
