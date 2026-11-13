'use strict';
/** Tiny router + validation helpers (so the project needs no Express install). */

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const routes = [];

/**
 * Register an API route.
 * @param {string} method   GET | POST | PUT | DELETE
 * @param {string} pattern  e.g. '/api/admin/stations/:id'
 * @param {Function} handler async (ctx) => data
 * @param {'user'|'admin'|null} auth  required role (null = public)
 */
function route(method, pattern, auth, handler) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([a-z_]+)/gi, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, auth, handler });
}

function findRoute(method, pathname) {
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = r.re.exec(pathname);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { route: r, params };
    }
  }
  return null;
}

/* ---- validators: throw HttpError(400) with a friendly message ---- */
function str(v, name, min = 1, max = 200) {
  if (typeof v !== 'string') throw new HttpError(400, `${name} is required`);
  v = v.trim();
  if (v.length < min || v.length > max)
    throw new HttpError(400, min <= 1 ? `${name} is required (max ${max} characters)` : `${name} must be ${min}-${max} characters`);
  return v;
}
function optStr(v, name, max = 200) {
  if (v === undefined || v === null || v === '') return '';
  return str(String(v), name, 0, max);
}
function num(v, name, min, max) {
  const n = typeof v === 'string' ? Number(v.trim()) : v;
  if (v === '' || v === null || v === undefined || typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max)
    throw new HttpError(400, `${name} must be a number between ${min} and ${max}`);
  return n;
}
function oneOf(v, name, list) {
  if (!list.includes(v)) throw new HttpError(400, `${name} must be one of: ${list.join(', ')}`);
  return v;
}
function intId(v, name = 'id') {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, `Invalid ${name}`);
  return n;
}

const round1 = (x) => Math.round(x * 10) / 10;

module.exports = { HttpError, route, findRoute, str, optStr, num, oneOf, intId, round1 };
