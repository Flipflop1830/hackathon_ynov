export const ACCOUNT_TYPES = ["finance", "medical"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const CHAT_ROLES = ["user", "assistant"] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];

export function isAccountType(value: unknown): value is AccountType {
  return typeof value === "string" && ACCOUNT_TYPES.includes(value as AccountType);
}
