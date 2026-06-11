'use strict';

const LOT_RE = /^LOT-\d{4}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RESULT_VALUES = new Set(['PASS', 'FAIL']);

/**
 * Validate a POST /inspections request body against the live checklist items.
 *
 * @param {*} body the parsed request body
 * @param {number[]} validItemIds ids of every checklist item that must be answered
 * @returns {{ ok: true, overall: 'PASS'|'FAIL' } | { ok: false, error: string }}
 */
function validateInspection(body, validItemIds) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'request body must be a JSON object' };
  }

  const { inspector, lot_no: lotNo, results } = body;

  if (typeof inspector !== 'string' || inspector.trim().length === 0) {
    return { ok: false, error: 'inspector is required' };
  }
  if (inspector.trim().length > 50) {
    return { ok: false, error: 'inspector must be at most 50 characters' };
  }

  if (typeof lotNo !== 'string' || !LOT_RE.test(lotNo)) {
    return { ok: false, error: 'lot_no must match LOT-NNNN (4 digits)' };
  }

  if (!Array.isArray(results) || results.length === 0) {
    return { ok: false, error: 'results is required and must be a non-empty array' };
  }

  const seen = new Set();
  const validSet = new Set(validItemIds);

  for (const entry of results) {
    if (!entry || typeof entry !== 'object') {
      return { ok: false, error: 'each results entry must be an object' };
    }
    const { item_id: itemId, result } = entry;

    if (!Number.isInteger(itemId)) {
      return { ok: false, error: 'results item_id must be an integer' };
    }
    if (!validSet.has(itemId)) {
      return { ok: false, error: `results contains unknown item_id ${itemId}` };
    }
    if (seen.has(itemId)) {
      return { ok: false, error: `results contains duplicate item_id ${itemId}` };
    }
    seen.add(itemId);

    if (!RESULT_VALUES.has(result)) {
      return { ok: false, error: `results result for item_id ${itemId} must be PASS or FAIL` };
    }
  }

  if (seen.size !== validSet.size) {
    return { ok: false, error: 'results must answer every checklist item' };
  }

  const overall = results.every((r) => r.result === 'PASS') ? 'PASS' : 'FAIL';
  return { ok: true, overall };
}

/**
 * Validate a ?date=YYYY-MM-DD query param: correct shape AND a real calendar date.
 *
 * @param {*} value
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function validateDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    return { ok: false, error: 'date is required and must be YYYY-MM-DD' };
  }

  const [year, month, day] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));
  const isReal =
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day;

  if (!isReal) {
    return { ok: false, error: 'date is not a valid calendar date' };
  }
  return { ok: true };
}

module.exports = { validateInspection, validateDate };
