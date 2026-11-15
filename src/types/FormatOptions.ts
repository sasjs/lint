import { KeywordCase } from './KeywordCase'

/**
 * How a caller supplies the layout engine to the formatter.
 *
 * `@sasjs/lint` owns the rules - the header, line length, trailing spaces, the
 * casing setting - and knows nothing about SAS syntax. The layout pass is a
 * printer over a SAS AST, which is a much larger dependency than a linter should
 * carry, so it arrives from the caller. The extension and the server already
 * depend on `@sasjs/sas-language`; the CLI does not, and follows once this option
 * is threaded through the command that formats projects. A project that only
 * lints installs none of it either way.
 *
 * Without an engine the formatter applies the rules to the text as it stands,
 * which is what it has always done. With one, the reprint happens first and the
 * rules run over the result, so line wrapping applies to the final layout rather
 * than to the original.
 */
export interface FormatOptions {
  /**
   * Reprints a SAS program, in the style of `formatText` from
   * `@sasjs/sas-language`. Receives the `keywordCase` from the configuration,
   * because the words are identified by its lexer - a rule here could only guess
   * from a list of statement names, and no such list carries `else` or the
   * statements inside a procedure.
   */
  reprint?: (
    text: string,
    options: { keywordCase: KeywordCase }
  ) => Promise<string>
}
