// How the backend's security event names read on screen
export const ACTIVITY_LABELS: Record<string, string> = {
  "login.success": "Signed in",
  "login.failed": "Failed sign-in attempt",
  "session.revoked": "A device was signed out",
  "session.revoked_others": "All other devices were signed out",
  "session.reuse_detected": "Session ended: suspicious token reuse",
  "reauth.success": "Password confirmed for a sensitive action",
  "reauth.failed": "Failed password confirmation",
  "profile.updated": "Profile updated",
};
export const WARNING_ACTIONS = new Set([
  "login.failed",
  "session.reuse_detected",
  "reauth.failed",
]);
