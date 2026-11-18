'use strict';

/** Plain-text formatting helpers. No colours: output stays pipe-friendly. */

function pad(value, width, align = 'left') {
  const s = String(value ?? '');
  if (s.length >= width) return s;
  const fill = ' '.repeat(width - s.length);
  return align === 'right' ? fill + s : s + fill;
}

/** Render rows as an aligned table. rows: array of arrays of strings. */
function table(rows, aligns = []) {
  if (!rows.length) return '';
  const widths = rows[0].map((_, i) =>
    Math.max(...rows.map((r) => String(r[i] ?? '').length))
  );
  return rows
    .map((r) => r.map((c, i) => pad(c, widths[i], aligns[i] || 'left')).join('  ').replace(/\s+$/, ''))
    .join('\n');
}

/** "2026-11-16 14:06 UTC" from a millisecond epoch. */
function fmtDate(ms) {
  if (!ms) return '-';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

/** "1085 ± 58" — Glicko-style rating with deviation. */
function fmtRating(rating, rd) {
  if (rating == null) return '-';
  return rd != null ? `${rating} ± ${rd}` : String(rating);
}

/** "16-16-3" — wins-losses-draws. */
function fmtRecord(wins, losses, draws) {
  return `${wins ?? 0}-${losses ?? 0}-${draws ?? 0}`;
}

/** "1,234" — thousands separator for big counts. */
function fmtNum(n) {
  if (n == null) return '-';
  return Number(n).toLocaleString('en-US');
}

module.exports = { pad, table, fmtDate, fmtRating, fmtRecord, fmtNum };
