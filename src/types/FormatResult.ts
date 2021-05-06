import { Diagnostic } from './Diagnostic'

/**
 * Represents the result of a format operation on a file, folder or project.
 */
export interface FormatResult {
  updatedFilePaths: string[]
  fixedDiagnosticsCount: number
  unfixedDiagnostics: Map<string, Diagnostic[]> | Diagnostic[]
}
