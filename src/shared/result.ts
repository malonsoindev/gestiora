export type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E }

export const ok = <T>(value: T): Result<T, never> => ({
  success: true,
  value
})

export const fail = <E>(error: E): Result<never, E> => ({
  success: false,
  error
})

export const isOk = <T, E>(result: Result<T, E>): result is { success: true; value: T } =>
  result.success

export const isError = <T, E>(result: Result<T, E>): result is { success: false; error: E } =>
  !result.success

export const map = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> => {
  if (result.success) {
    return ok(fn(result.value))
  }
  return fail(result.error)
}

export const flatMap = <T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> => {
  if (result.success) {
    return fn(result.value)
  }
  return fail(result.error)
}

export const combine = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = []

  for (const result of results) {
    if (!result.success) {
      return fail(result.error)
    }
    values.push(result.value)
  }

  return ok(values)
}
