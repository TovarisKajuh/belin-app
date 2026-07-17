const TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function isPlausibleToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}
