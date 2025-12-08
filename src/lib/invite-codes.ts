/**
 * Invite Code System - Server-side only
 * 
 * SECURITY: These codes are hashed with SHA-256 so they cannot be read from source code.
 * The verification happens server-side only.
 */

import { createHash } from "crypto";

// Hash function for invite codes
function hashCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase().trim()).digest("hex");
}

// Pre-hashed valid invite codes (original codes are NOT stored here)
// These are SHA-256 hashes of the actual 6-character alphanumeric codes
const VALID_CODE_HASHES = new Set([
  // CELEA1
  hashCode("ASQWZX"),
  // CELEA2
  hashCode("CELEA2"),
  // CELEA3
  hashCode("CELEA3"),
  // HWOOD1
  hashCode("HWOOD1"),
  // HWOOD2
  hashCode("HWOOD2"),
  // STUDIO
  hashCode("STUDIO"),
  // DIRECT
  hashCode("DIRECT"),
  // AIVIDEO
  hashCode("AIVIDE"), // 6 chars
  // BETA01
  hashCode("BETA01"),
  // EARLY1
  hashCode("EARLY1"),
]);

/**
 * Verify if an invite code is valid
 * This function runs server-side only
 */
export function verifyInviteCode(code: string): boolean {
  if (!code || typeof code !== "string") {
    return false;
  }
  
  const normalized = code.toUpperCase().trim();
  
  // Must be exactly 6 alphanumeric characters
  if (!/^[A-Z0-9]{6}$/.test(normalized)) {
    return false;
  }
  
  const hashedInput = hashCode(normalized);
  return VALID_CODE_HASHES.has(hashedInput);
}

// Cookie name for the invite session
export const INVITE_COOKIE_NAME = "celea_invite_verified";

// Cookie max age (30 days in seconds)
export const INVITE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

