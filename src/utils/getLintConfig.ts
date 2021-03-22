import path from 'path'
import { LintConfig } from '../types/LintConfig'
import { readFile } from '@sasjs/utils/file'
import { getProjectRoot } from './getProjectRoot'

export async function getLintConfig(): Promise<LintConfig> {
  const projectRoot = await getProjectRoot()
  const configuration = await readFile(path.join(projectRoot, '.sasjslint'))
  return new LintConfig(JSON.parse(configuration))
}
