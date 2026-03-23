/**
 * ExcelJS: ô có công thức trả về object { formula, result }
 * Rich text: { richText: [{ text: '...' }] }
 * Chuẩn hóa thành chuỗi để lưu MongoDB / query.
 */
function cellToString(raw) {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw).trim();
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === 'object') {
    if (Object.prototype.hasOwnProperty.call(raw, 'result') && raw.result !== undefined && raw.result !== null) {
      return cellToString(raw.result);
    }
    if (Array.isArray(raw.richText)) {
      return raw.richText.map((t) => (t && t.text) || '').join('').trim();
    }
    if (typeof raw.text === 'string') return raw.text.trim();
  }
  return String(raw).trim();
}

module.exports = { cellToString };
