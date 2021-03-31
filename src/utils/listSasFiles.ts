import { listFilesInFolder } from '@sasjs/utils/file'

export const listSasFiles = async (folderPath: string): Promise<string[]> => {
  const files = await listFilesInFolder(folderPath)
  return files.filter((f) => f.endsWith('.sas'))
}
