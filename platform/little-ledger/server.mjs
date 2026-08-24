import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
const dbFile = path.join(dataDir, 'ledger.json');
const port = Number(process.env.PORT || 4173);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const rateCache = new Map();
const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const cloudDbEnabled = Boolean(supabaseUrl && supabaseKey);

async function supabaseRequest(pathname, options = {}) {
  const authHeaders = supabaseKey.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${supabaseKey}` };
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    ...options,
    headers: { apikey: supabaseKey, ...authHeaders, 'content-type': 'application/json', ...(options.headers || {}) }
  });
  const raw = await response.text();
  let data = null; try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) throw new Error(data?.message || data?.error || `Supabase ${response.status}`);
  return data;
}
function supabaseUser(name) { return `username=eq.${encodeURIComponent(name)}`; }
function mapRecord(record) { return { id: record.id, type: record.type, amount: Number(record.amount), currency: record.currency || 'CNY', sourceAmount: Number(record.source_amount ?? record.amount), sourceCurrency: record.source_currency || 'CNY', exchangeRate: Number(record.exchange_rate || 1), category: record.category, note: record.note, date: record.date }; }
async function cloudRecords(username) { const rows = await supabaseRequest(`ledger_records?${supabaseUser(username)}&select=*&order=created_at.desc`); return rows.map(mapRecord); }

async function loadDb() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(dbFile)) return { users: {} };
  try { return JSON.parse(await readFile(dbFile, 'utf8')); } catch { return { users: {} }; }
}
async function saveDb(db) { await writeFile(dbFile, JSON.stringify(db, null, 2), 'utf8'); }
function json(res, status, body) { res.writeHead(status, {'content-type': mime['.json'], 'cache-control':'no-store'}); res.end(JSON.stringify(body)); }
async function body(req) { let raw=''; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }
function safeName(name) { return typeof name === 'string' && /^[\p{L}\p{N}_-]{1,20}$/u.test(name.trim()) ? name.trim() : null; }
function passwordText(value) { return typeof value === 'string' && /^[A-Za-z\d]{6,100}$/.test(value) && /[A-Za-z]/.test(value) && /\d/.test(value) ? value : null; }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) { return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (err, derived) => err ? reject(err) : resolve(`${salt}:${derived.toString('hex')}`))); }
async function verifyPassword(password, stored) { if (!stored) return false; const [salt, expected] = stored.split(':'); const actual = await hashPassword(password, salt); return crypto.timingSafeEqual(Buffer.from(actual.split(':')[1], 'hex'), Buffer.from(expected, 'hex')); }

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const db = await loadDb();
    if (url.pathname === '/api/account' && req.method === 'POST') {
      const input = await body(req); const name = safeName(input.username); const password = passwordText(input.password);
      if (!name) return json(res, 400, { error: '用户名只能包含中文、字母、数字、下划线或短横线，长度 1-20。' });
      if (!password) return json(res, 400, { error: '密码需包含英文和数字，长度至少 6 位。' });
      if (cloudDbEnabled) {
        const users = await supabaseRequest(`ledger_users?${supabaseUser(name)}&select=username,password_hash`);
        const existing = users[0];
        if (existing && !(await verifyPassword(password, existing.password_hash))) return json(res, 401, { error: '用户名已存在，请更换用户名，或输入该用户名的正确密码。' });
        if (!existing) await supabaseRequest('ledger_users', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ username: name, password_hash: await hashPassword(password) }) });
        const cloudRows = await cloudRecords(name);
        return json(res, 200, { username: name, records: cloudRows, mode: existing ? 'login' : 'register' });
      }
      const existing = db.users[name];
      if (existing?.passwordHash && !(await verifyPassword(password, existing.passwordHash))) return json(res, 401, { error: '用户名已存在，请更换用户名，或输入该用户名的正确密码。' });
      if (!existing) db.users[name] = { username: name, passwordHash: await hashPassword(password), records: [], createdAt: new Date().toISOString() };
      else if (!existing.passwordHash) existing.passwordHash = await hashPassword(password);
      await saveDb(db);
      return json(res, 200, { username: name, records: db.users[name].records, mode: existing ? 'login' : 'register' });
    }
    if (url.pathname === '/api/health' && req.method === 'GET') {
      if (!cloudDbEnabled) return json(res, 503, { ok: false, storage: 'local', error: 'Supabase 环境变量未配置' });
      try {
        await supabaseRequest('ledger_users?select=username&limit=1');
        return json(res, 200, { ok: true, storage: 'supabase' });
      } catch (error) {
        console.error(`[health] Supabase connection failed: ${error.message}`);
        return json(res, 503, { ok: false, storage: 'supabase', error: 'Supabase 连接失败', detail: error.message });
      }
    }
    if (url.pathname === '/api/rates' && req.method === 'GET') {
      const base = (url.searchParams.get('base') || 'CNY').toUpperCase();
      const symbols = (url.searchParams.get('symbols') || 'CNY,USD,EUR,JPY,HKD,GBP,KRW,SGD,AUD,CAD,CHF').toUpperCase().split(',').filter(Boolean).slice(0, 20);
      if (!/^[A-Z]{3}$/.test(base) || symbols.some(code => !/^[A-Z]{3}$/.test(code))) return json(res, 400, { error: '无效货币代码' });
      const cacheKey = `${base}:${symbols.join(',')}`; const cached = rateCache.get(cacheKey);
      if (cached && Date.now() - cached.at < 6 * 60 * 60 * 1000) return json(res, 200, cached.value);
      const response = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${symbols.filter(code => code !== base).join(',')}`);
      if (!response.ok) return json(res, 502, { error: '汇率服务暂时不可用' });
      const source = await response.json(); const value = { base, date: source.date, rates: { [base]: 1, ...(source.rates || {}) } };
      rateCache.set(cacheKey, { at: Date.now(), value }); return json(res, 200, value);
    }
    const match = url.pathname.match(/^\/api\/users\/([^/]+)\/records(?:\/([^/]+))?$/);
    if (match) {
      const username = decodeURIComponent(match[1]);
      if (cloudDbEnabled) {
        if (req.method === 'GET' && !match[2]) return json(res, 200, await cloudRecords(username));
        if (req.method === 'POST' && !match[2]) {
          const item = await body(req);
          if (!['income','expense'].includes(item.type) || !Number.isFinite(Number(item.amount)) || !item.category || !item.date) return json(res, 400, { error: '账目字段不完整' });
          const rows = await supabaseRequest('ledger_records', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ username, type: item.type, amount: Number(item.amount), currency: item.currency || 'CNY', source_amount: Number(item.sourceAmount ?? item.amount), source_currency: item.sourceCurrency || 'CNY', exchange_rate: Number(item.exchangeRate || 1), category: String(item.category), note: String(item.note || item.category).slice(0, 50), date: String(item.date) }) });
          return json(res, 201, mapRecord(rows[0]));
        }
        if (req.method === 'DELETE' && match[2]) { await supabaseRequest(`ledger_records?id=eq.${encodeURIComponent(match[2])}&${supabaseUser(username)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); return json(res, 200, { ok: true }); }
      }
      const account = db.users[username];
      if (!account) return json(res, 404, { error: '账户不存在' });
      if (req.method === 'GET' && !match[2]) return json(res, 200, account.records);
      if (req.method === 'POST' && !match[2]) {
        const item = await body(req);
        if (!['income','expense'].includes(item.type) || !Number.isFinite(Number(item.amount)) || !item.category || !item.date) return json(res, 400, { error: '账目字段不完整' });
        const record = { id: crypto.randomUUID(), type: item.type, amount: Number(item.amount), currency: /^[A-Z]{3}$/.test(item.currency) ? item.currency : 'CNY', sourceAmount: Number(item.sourceAmount ?? item.amount), sourceCurrency: /^[A-Z]{3}$/.test(item.sourceCurrency) ? item.sourceCurrency : 'CNY', exchangeRate: Number(item.exchangeRate || 1), category: String(item.category), note: String(item.note || item.category).slice(0, 50), date: String(item.date) };
        account.records.unshift(record); await saveDb(db); return json(res, 201, record);
      }
      if (req.method === 'DELETE' && match[2]) {
        const before = account.records.length; account.records = account.records.filter(r => r.id !== match[2]);
        if (before === account.records.length) return json(res, 404, { error: '记录不存在' });
        await saveDb(db); return json(res, 200, { ok: true });
      }
    }
    if (req.method === 'GET') {
      const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const filePath = path.resolve(root, file);
      if (!filePath.startsWith(path.resolve(root)) || !existsSync(filePath)) return json(res, 404, { error: 'Not found' });
      res.writeHead(200, {'content-type': mime[path.extname(filePath)] || 'application/octet-stream'}); res.end(await readFile(filePath)); return;
    }
    json(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error(`[request] ${req.method} ${req.url} failed: ${error.message}`);
    json(res, 500, { error: '服务器暂时不可用', detail: error.message });
  }
});
server.listen(port, '0.0.0.0', () => console.log(`Little Ledger listening on http://0.0.0.0:${port}`));
