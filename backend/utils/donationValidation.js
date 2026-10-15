// Pure, stateless validation helpers for donation parsing. No I/O happens
// here, which keeps every rule unit-testable and auditable in one place.

const SG_UTC_OFFSET_HOURS = 8; // Singapore observes no DST; a fixed offset is safe.
const MAX_RAW_TEXT_LENGTH = 1000;
const MAX_EXPIRY_HOURS = 168; // 7 days: food-safety upper bound.
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 10000;
const HIGH_PRIORITY_MAX_HOURS = 3;
const MEDIUM_PRIORITY_MAX_HOURS = 12;

// User-facing messages are fixed strings; model output is never echoed back.
const MESSAGES = {
  postal_code_required:
    'Please include a 6-digit Singapore postal code for the pickup location.',
  postal_code_ambiguous:
    'More than one postal code was found. Please include only the pickup location postal code.',
  postal_code_not_found:
    'That postal code could not be verified. Please check it and try again.',
  item_missing: 'Please state what food is being donated.',
  quantity_missing:
    'Please state an exact quantity (for example "20 packets").',
  quantity_invalid: `Quantity must be a whole number between ${MIN_QUANTITY} and ${MAX_QUANTITY}.`,
  expiry_missing:
    'Please state when the food expires (for example "by 9pm tonight").',
  expiry_in_past: 'The expiry time has already passed.',
  expiry_out_of_range: `Expiry must be within the next ${MAX_EXPIRY_HOURS / 24} days.`,
  multiple_items:
    'Please submit one donation per message (one food item and one location).',
  invalid_message:
    'This message could not be processed. Please enter only the donation details.',
  ambiguous_message:
    'The message contains conflicting details. Please clarify and try again.',
};

const issue = (field, code) => ({ field, code, message: MESSAGES[code] });

/**
 * VALIDATION BOUNDARY: normalises untrusted free text before it reaches the
 * model. Returns null when the input is unusable.
 */
const sanitizeRawText = (value) => {
  if (typeof value !== 'string') return null;
  // Strip control characters (keeps \t and \n) that can corrupt prompts/logs.
  const cleaned = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
  if (cleaned.length === 0 || cleaned.length > MAX_RAW_TEXT_LENGTH) {
    return null;
  }
  return cleaned;
};

/**
 * Extracts the postal code deterministically from the raw message instead of
 * trusting the model. Singapore postal sectors are 01-82.
 */
const extractPostalCode = (rawText) => {
  // Digit lookarounds (not \b) so the common "S560212" notation still matches.
  const all = [...new Set(rawText.match(/(?<!\d)\d{6}(?!\d)/g) || [])];
  const unique = all.filter((code) => {
    const sector = Number(code.slice(0, 2));
    return sector >= 1 && sector <= 82;
  });

  if (all.length === 0) {
    return { postalCode: null, issue: issue('location', 'postal_code_required') };
  }
  // A 6-digit number outside valid sectors is reported as unverifiable
  // rather than silently treated as missing.
  if (unique.length === 0) {
    return { postalCode: null, issue: issue('location', 'postal_code_not_found') };
  }
  if (unique.length > 1) {
    return { postalCode: null, issue: issue('location', 'postal_code_ambiguous') };
  }
  return { postalCode: unique[0], issue: null };
};

/**
 * Supplies "now" in Singapore time so the model can resolve relative phrases
 * such as "tonight" or "this weekend". The server clock is authoritative.
 */
const formatNowForPrompt = (now) => {
  const shifted = new Date(now.getTime() + SG_UTC_OFFSET_HOURS * 3600 * 1000);
  const isoSg = `${shifted.toISOString().slice(0, 19)}+08:00`;
  const weekday = new Intl.DateTimeFormat('en-SG', {
    weekday: 'long',
    timeZone: 'Asia/Singapore',
  }).format(now);
  return `${weekday}, ${isoSg}`;
};

/**
 * Deterministic priority from time-to-expiry. Replaces model judgement so
 * the outcome is explainable and reproducible.
 */
const computePriority = (expiryHours) => {
  if (expiryHours <= HIGH_PRIORITY_MAX_HOURS) return 'high';
  if (expiryHours <= MEDIUM_PRIORITY_MAX_HOURS) return 'medium';
  return 'low';
};

const validateItemType = (value) => {
  if (typeof value !== 'string') return null;
  const normalised = value.replace(/\s+/g, ' ').trim();
  if (normalised.length < 2 || normalised.length > 100) return null;
  return /\p{L}/u.test(normalised) ? normalised : null;
};

const validateUnit = (value) => {
  // Optional and non-blocking: an invalid unit is dropped, not rejected.
  if (typeof value !== 'string') return null;
  const normalised = value.replace(/\s+/g, ' ').trim();
  if (normalised.length === 0 || normalised.length > 30) return null;
  return /^[\p{L} .'-]+$/u.test(normalised) ? normalised : null;
};

/**
 * Validates the model's extraction. Every value is re-checked here; the model
 * is treated as an untrusted source, which also bounds prompt-injection impact.
 * Returns { fields, issues } where unknown values are null, never defaulted.
 */
const validateExtraction = (extracted, now) => {
  const issues = [];
  const data = extracted && typeof extracted === 'object' ? extracted : {};

  // SECURITY GATE: the model's injection signal is honoured as a deny only.
  // Nothing from a flagged response is carried forward, and a missing or
  // true value never bypasses the field checks below.
  if (data.isValid === false) {
    return {
      fields: {
        itemType: null,
        quantity: null,
        unit: null,
        expiresAt: null,
        expiryHours: null,
        expiryAssumed: false,
      },
      issues: [issue('message', 'invalid_message')],
    };
  }

  if (data.multipleItems === true) {
    issues.push(issue('message', 'multiple_items'));
  }
  if (data.ambiguous === true) {
    issues.push(issue('message', 'ambiguous_message'));
  }

  const itemType = validateItemType(data.itemType);
  if (!itemType) issues.push(issue('itemType', 'item_missing'));

  // Unknown quantity stays null; it is never assumed to be 1.
  let quantity = null;
  if (data.quantity === null || data.quantity === undefined) {
    issues.push(issue('quantity', 'quantity_missing'));
  } else if (
    typeof data.quantity === 'number' &&
    Number.isInteger(data.quantity) &&
    data.quantity >= MIN_QUANTITY &&
    data.quantity <= MAX_QUANTITY
  ) {
    quantity = data.quantity;
  } else {
    issues.push(issue('quantity', 'quantity_invalid'));
  }

  const unit = validateUnit(data.unit);

  let expiresAt = null;
  let expiryHours = null;
  let expiryAssumed = false;
  if (typeof data.expiresAt !== 'string') {
    issues.push(issue('expiresAt', 'expiry_missing'));
  } else {
    const parsed = new Date(data.expiresAt);
    const hours = (parsed.getTime() - now.getTime()) / 3600000;
    if (Number.isNaN(parsed.getTime())) {
      issues.push(issue('expiresAt', 'expiry_missing'));
    } else if (hours <= 0) {
      issues.push(issue('expiresAt', 'expiry_in_past'));
    } else if (hours > MAX_EXPIRY_HOURS) {
      issues.push(issue('expiresAt', 'expiry_out_of_range'));
    } else {
      expiresAt = parsed;
      expiryHours = Math.round(hours * 10) / 10;
      // The assumed flag is derived from the documented 23:59 SGT default
      // rather than trusted from the model, which labels it inconsistently.
      const sg = new Date(parsed.getTime() + SG_UTC_OFFSET_HOURS * 3600 * 1000);
      expiryAssumed = sg.getUTCHours() === 23 && sg.getUTCMinutes() === 59;
    }
  }

  return {
    fields: { itemType, quantity, unit, expiresAt, expiryHours, expiryAssumed },
    issues,
  };
};

module.exports = {
  MESSAGES,
  issue,
  sanitizeRawText,
  extractPostalCode,
  formatNowForPrompt,
  computePriority,
  validateExtraction,
};
