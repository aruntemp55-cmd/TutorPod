/**
 * OTP issuance.
 *
 * Non-production (local, Maestro, CI): always issue OTP_STUB_CODE (default 000000).
 * Production: generate a random 6-digit code and never issue the stub.
 *
 * Remaining ops work: production stores the code but does not send SMS/email
 * (no provider is wired). Do not add a fake mailer.
 */

export const DEFAULT_OTP_STUB = "000000";

export function isProdEnv(nodeEnv = process.env.NODE_ENV): boolean {
  return nodeEnv === "production";
}

export function stubOtpCode(explicit?: string): string {
  return (explicit ?? process.env.OTP_STUB_CODE ?? DEFAULT_OTP_STUB).trim() ||
    DEFAULT_OTP_STUB;
}

export function issueOtpCode(opts: {
  nodeEnv?: string;
  stubCode?: string;
} = {}): { code: string; mode: "stub" | "generated" } {
  const stub = stubOtpCode(opts.stubCode);
  if (!isProdEnv(opts.nodeEnv ?? process.env.NODE_ENV)) {
    return { code: stub, mode: "stub" };
  }
  let code: string;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (code === stub);
  return { code, mode: "generated" };
}

/** Production must never accept the documented stub, even if it is in the DB. */
export function rejectStubOtpInProd(
  code: string,
  opts: { nodeEnv?: string; stubCode?: string } = {},
): boolean {
  if (!isProdEnv(opts.nodeEnv ?? process.env.NODE_ENV)) return false;
  return code === stubOtpCode(opts.stubCode);
}
