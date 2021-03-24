import { Severity } from './Severity'

/**
 * A diagnostic is produced by the execution of a lint rule against a file or line of text.
 */
export interface Diagnostic {
  lineNumber: number
  startColumnNumber: number
  endColumnNumber: number
  message: string
  severity: Severity
}
