// Pure helpers of the first-run screen. There is deliberately no link to a
// live demo project here: a /p/<token> wall link can write (01-index rule 8).

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}
