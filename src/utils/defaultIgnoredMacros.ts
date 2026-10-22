/**
 * The default value of the `ignoredMacros` setting. `sasjs compile` injects
 * `%webout` into every service, and no macro file provides it - `sasjs/core`
 * carries `mv_webout` / `ms_webout` / `mm_webout`, never `webout` - so declaring
 * it would hand the compiler a dependency it cannot resolve.
 */
export const defaultIgnoredMacros = ['webout']
