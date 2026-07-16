const blockedTerms = ['hate speech', 'kill yourself', 'scam link'];

export interface ModerationResult {
  allowed: boolean;
  reasons: string[];
}

export function moderateText(value: string): ModerationResult {
  // Normalization makes matching case-insensitive and prevents extra spacing
  // from bypassing the simple rules used by this undergraduate project.
  const normalized = value.toLowerCase().replace(/\s+/g, ' ').trim();
  const reasons: string[] = [];

  // Each rule records a human-readable reason. Callers can show that reason
  // to the user instead of returning an unexplained validation failure.
  if (blockedTerms.some(term => normalized.includes(term))) reasons.push('potentially abusive content');
  if ((normalized.match(/https?:\/\//g) || []).length > 3) reasons.push('excessive external links');
  if (/(.)\1{14,}/.test(normalized)) reasons.push('repetitive spam');
  if (normalized.length > 0 && new Set(normalized.split(' ')).size <= 2 && normalized.split(' ').length > 12) reasons.push('repetitive spam');

  // Content is accepted only when none of the moderation rules were triggered.
  return { allowed: reasons.length === 0, reasons };
}
