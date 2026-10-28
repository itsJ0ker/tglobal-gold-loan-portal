/**
 * Masks an Indian 10-digit mobile number according to the assignment requirement:
 * e.g., "9876543210" -> "9876XXXX10"
 */
export function maskMobileNumber(mobile: string): string {
  if (!mobile || typeof mobile !== 'string') {
    return 'XXXXXXXXXX';
  }
  const cleaned = mobile.trim();
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)}XXXX${cleaned.slice(-2)}`;
  }
  if (cleaned.length > 6) {
    return `${cleaned.slice(0, 3)}XXXX${cleaned.slice(-2)}`;
  }
  return 'XXXXXXXXXX';
}

/**
 * Sanitizes log output so mobile numbers matching 10 digits are masked in console/logs
 */
export function sanitizeLog(message: string): string {
  if (!message || typeof message !== 'string') return message;
  // Match standard Indian mobile pattern
  return message.replace(/\b[6-9]\d{9}\b/g, (match) => maskMobileNumber(match));
}
