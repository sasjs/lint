/**
 * The strings reported by `noBannedStrings` when a project does not configure
 * its own list.
 *
 * These are words that look like a log message. A comment or a `%put` that
 * holds one turns up in a grep of the SAS log, and in any log scanner built on
 * one, so a real problem is easy to lose among the matches that were only
 * prose.
 *
 * Each entry ends a word: `error ` and `error:` carry the space or the colon
 * that follows the word in a log line. A bare `error` would also match
 * `error_flag`, `errors` and `saserror`, which are ordinary identifiers rather
 * than log lookalikes, so the list is built from the delimited forms.
 */
export const defaultBannedStrings = ['error ', 'error:', 'warning ', 'warning:']
