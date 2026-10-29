import { Severity } from './Severity'

/**
 * A diagnostic is produced by the execution of a lint rule against a file or line of text.
 *
 * Both columns are 1-based, and `endColumnNumber` is the column of the span's LAST
 * character - a one-character span starts and ends on the same column. A consumer
 * that highlights `startColumnNumber` through `endColumnNumber` inclusive covers
 * exactly the text the rule reports, for every rule in the set.
 */
export interface Diagnostic {
  lineNumber: number
  startColumnNumber: number
  endColumnNumber: number
  message: string
  severity: Severity
}
