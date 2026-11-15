/**
 * The case the formatter gives SAS keywords.
 *
 * One declaration, because the value travels from the `.sasjslint` setting into
 * the engine's options: spelled out in both places, a fourth value could be added
 * to one and silently rejected by the other. The JSON schema keeps its own copy -
 * it is not TypeScript - and the suite asserts the three agree.
 */
export const KEYWORD_CASES = ['upper', 'lower', 'preserve'] as const
export type KeywordCase = (typeof KEYWORD_CASES)[number]
