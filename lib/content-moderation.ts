const blockedTerms = ['hate speech', 'kill yourself', 'scam link'];

export interface ModerationResult {
  allowed: boolean;
  reasons: string[];
}

export function moderateText(value: string): ModerationResult {
  const normalized = value.toLowerCase().replace(/\s+/g, ' ').trim();
  const reasons: string[] = [];
  if (blockedTerms.some(term => normalized.includes(term))) reasons.push('potentially abusive content');
  if ((normalized.match(/https?:\/\//g) || []).length > 3) reasons.push('excessive external links');
  if (/(.)\1{14,}/.test(normalized)) reasons.push('repetitive spam');
  if (normalized.length > 0 && new Set(normalized.split(' ')).size <= 2 && normalized.split(' ').length > 12) reasons.push('repetitive spam');
  return { allowed: reasons.length === 0, reasons };
}
