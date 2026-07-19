const TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function isPlausibleToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

// A client-supplied id that will be interpolated into a storage path must be a
// real UUID, so it can never carry slashes or "../" that would escape the
// project prefix.
const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
