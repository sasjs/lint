/**
 * A diagnostic is produced by the execution of a lint rule against a file or line of text.
 */
export interface Diagnostic {
  lineNumber: number
  columnNumber: number
  warning: string
}
