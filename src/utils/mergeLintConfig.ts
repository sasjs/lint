/**
 * Merges a per-file configuration override over the project configuration.
 *
 * Scalars replace, arrays are additive, and objects merge key by key. A file
 * therefore adds an allowed gremlin, a required macro option or a severity
 * level without having to restate the rest of the project configuration, and
 * it can still switch a rule off or raise a limit for itself.
 */
export const mergeLintConfig = (base: any, override: any): any => {
  if (!isPlainObject(base) || !isPlainObject(override)) return override

  const merged: any = { ...base }

  for (const [key, value] of Object.entries(override)) {
    const current = merged[key]

    if (Array.isArray(current) && Array.isArray(value)) {
      merged[key] = mergeArrays(current, value)
    } else if (isPlainObject(current) && isPlainObject(value)) {
      merged[key] = { ...(current as object), ...(value as object) }
    } else {
      merged[key] = value
    }
  }

  return merged
}

const isPlainObject = (value: any): boolean =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const isPrimitiveArray = (value: any[]): boolean =>
  value.every((item) => item === null || typeof item !== 'object')

/**
 * Concatenates two arrays. Arrays of primitives are de-duplicated, so an
 * override that repeats an entry the project already lists does not add it
 * twice.
 */
const mergeArrays = (base: any[], override: any[]): any[] =>
  isPrimitiveArray(base) && isPrimitiveArray(override)
    ? [...new Set([...base, ...override])]
    : [...base, ...override]
