const toCamelCase = (value: string) =>
  value.replace(/[_-]([a-z])/g, (_, letter: string) => letter.toUpperCase());

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]';

export function camelcaseKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => camelcaseKeys(item)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
    acc[toCamelCase(key)] = camelcaseKeys(nestedValue);
    return acc;
  }, {}) as T;
}
