const ONEMAP_SEARCH_URL =
  'https://www.onemap.gov.sg/api/common/elastic/search';
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Resolves a 6-digit postal code to its canonical address via OneMap.
 *
 * Returns { address, postalCode } when the code exists, or null when OneMap
 * reports no match. Throws on transport/auth failures so the caller can
 * distinguish "invalid input" (user's problem) from "dependency down" (ours).
 */
const lookupPostalCode = async (postalCode) => {
  // SECURITY GATE: secret is read from the environment only, never inlined.
  const token = process.env.ONEMAP_ACCESS_TOKEN;
  if (!token) {
    throw new Error('ONEMAP_ACCESS_TOKEN is not configured');
  }

  // SECURITY GATE: the value is re-validated here so this helper stays safe
  // even if a future caller skips upstream validation.
  if (!/^\d{6}$/.test(postalCode)) {
    throw new Error('lookupPostalCode received a non-postal-code value');
  }

  const params = new URLSearchParams({
    searchVal: postalCode,
    returnGeom: 'N',
    getAddrDetails: 'Y',
    pageNum: '1',
  });

  // Bounded timeout prevents a slow upstream from holding request threads.
  const response = await fetch(`${ONEMAP_SEARCH_URL}?${params}`, {
    headers: { Authorization: token },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`OneMap responded with status ${response.status}`);
  }

  const body = await response.json();
  const results = Array.isArray(body && body.results) ? body.results : [];

  // Exact-match filter: OneMap search is fuzzy, but a postal code must
  // match precisely to be accepted as a verified location.
  const match = results.find((r) => r && r.POSTAL === postalCode);
  if (!match || typeof match.ADDRESS !== 'string') {
    return null;
  }

  return { address: match.ADDRESS, postalCode };
};

module.exports = { lookupPostalCode };
