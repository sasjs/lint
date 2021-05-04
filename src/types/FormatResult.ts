import { Diagnostic } from './Diagnostic'

export interface FormatResult {
  updatedFilePaths: string[]
  fixedDiagnosticsCount: number
  unfixedDiagnostics: Map<string, Diagnostic[]> | Diagnostic[]
}
