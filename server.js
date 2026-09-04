/**
 * Schulte Trainer —— 舒尔特方格训练工具（本地/局域网 Web 服务，零第三方依赖）
 *
 * 用法：
 *   node server.js            # 默认端口 3000，自动打开浏览器
 *   node server.js 8080       # 指定端口
 *   set PORT=8080 && node server.js
 *   设置环境变量 NO_OPEN=1 可禁止自动打开浏览器
 *
 * 局域网内的其他设备通过 http://<本机局域网IP>:<端口> 访问。
 */
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

/* ---------------- 用户数据（登录名注册表，为后续按人保存训练数据预留） ---------------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
let rawUsers = {};
let users = {}; // 规范化后的用户映射：name -> {createdAt, settings?}
try {
  rawUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
} catch {
  rawUsers = {};
}

let writeChain = Promise.resolve();
function persistUsers() {
  const snapshot = JSON.stringify({ users }, null, 2);
  writeChain = writeChain
    .then(() => fsp.writeFile(USERS_FILE, snapshot, 'utf8'))
    .catch((err) => console.error('保存用户数据失败：', err.message));
  return writeChain;
}

function normalizeName(raw) {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return null;
  if ([...name].length > 20) return null; // 按字符数统计，兼容中文
  if (/[\u0000-\u001f\u007f]/.test(name)) return null;
  return name;
}

/* ---------------- 历史成绩存储（按用户、按规格分开） ---------------- */
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const RECORD_MODES = [3, 4, 5, 6, 7, 8];
const MAX_PER_MODE = 300;

let rawRecords = {};
try {
  rawRecords = JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf8'));
} catch {
  rawRecords = {};
}
let records = { users: {} };

let recordsChain = Promise.resolve();
function persistRecords() {
  const snapshot = JSON.stringify(records, null, 2);
  recordsChain = recordsChain
    .then(() => fsp.writeFile(RECORDS_FILE, snapshot, 'utf8'))
    .catch((err) => console.error('保存历史成绩失败：', err.message));
  return recordsChain;
}

/* ------------------------------------------------------------
 * 数据规范化：旧版本可能因多个服务实例并发写盘产生嵌套套娃结构
 * （users.users.users…），这里在启动时递归压平并合并，
 * 同名用户取“带设置且时间较新”的记录，历史记录按时间合并去重。
 * ------------------------------------------------------------ */
function pickBetterUser(cur, cand) {
  if (!cur) return cand;
  const hasS = (r) => r && r.settings && typeof r.settings === 'object';
  const curS = hasS(cur);
  const candS = hasS(cand);
  if (curS !== candS) return candS ? cand : cur; // 优先保留带设置的用户
  const ct = new Date((cur && cur.createdAt) || 0).getTime();
  const c2 = new Date((cand && cand.createdAt) || 0).getTime();
  return c2 >= ct ? cand : cur;
}

function flattenUsers(raw) {
  const out = {};
  (function walk(node) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    Object.keys(node).forEach((k) => {
      const v = node[k];
      if (!v || typeof v !== 'object' || Array.isArray(v)) return;
      if (typeof v.createdAt === 'string') {
        out[k] = pickBetterUser(out[k], v); // 该节点是一条用户记录
      } else {
        walk(v);
      }
    });
  })(raw);
  return out;
}

function flattenRecords(raw) {
  const merged = {};
  const MODE_RE = /^\d+x\d+$/;
  const ensureUser = (name) => {
    if (!merged[name]) merged[name] = {};
    return merged[name];
  };
  (function walk(node) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    Object.keys(node).forEach((k) => {
      const v = node[k];
      if (!v || typeof v !== 'object' || Array.isArray(v)) return;
      // 该节点是否为某个用户的规格记录容器（键形如 3x3…8x8）
      const looksLikeUser = Object.keys(v).some((m) => MODE_RE.test(m) && Array.isArray(v[m]));
      if (looksLikeUser && typeof v.createdAt !== 'string') {
        const target = ensureUser(k);
        Object.keys(v).forEach((mode) => {
          if (!MODE_RE.test(mode) || !Array.isArray(v[mode])) return;
          const seen = new Set();
          const base = (target[mode] || []).slice();
          base.forEach((r) => r && r.t !== undefined && seen.add(r.t));
          v[mode].forEach((r) => {
            if (r && r.t !== undefined && !seen.has(r.t)) {
              base.push(r);
              seen.add(r.t);
            }
          });
          base.sort((a, b) => (a.t || 0) - (b.t || 0));
          target[mode] = base.slice(-MAX_PER_MODE * 3);
        });
      } else {
        walk(v);
      }
    });
  })(raw);
  return merged;
}

users = flattenUsers(rawUsers);
records.users = flattenRecords(rawRecords);
persistUsers();
persistRecords();

/* ---------------- 静态资源 ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function serveStatic(req, res, pathname) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400).end('Bad Request');
    return;
  }
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  const inside =
    filePath === PUBLIC_DIR || filePath.startsWith(PUBLIC_DIR + path.sep);
  if (!inside) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

/* ---------------- 请求处理 ---------------- */
async function handleLogin(req, res) {
  let raw = '';
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 10240) {
      res.writeHead(413).end('Payload Too Large');
      return;
    }
    raw += chunk;
  }
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }
  const name = normalizeName(body.name);
  if (!name) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: '名字不能为空，且不超过 20 个字' }));
    return;
  }
  const isNew = !users[name];
  if (isNew) {
    users[name] = { createdAt: new Date().toISOString() };
    await persistUsers();
  }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: true, name, isNew }));
}

/* ---------------- 历史成绩 API ---------------- */
async function readBody(req) {
  let raw = '';
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 16384) return null; // 超出限制
    raw += chunk;
  }
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

/* 保存一条完成记录 */
async function handleRecord(req, res) {
  const body = await readBody(req);
  const name = normalizeName(body && body.name);
  const size = Number(body && body.size);
  const seconds = Number(body && body.seconds);
  const grade = String((body && body.grade) || '').toUpperCase();
  if (!name || !RECORD_MODES.includes(size)) {
    sendJson(res, 400, { ok: false, error: '参数不合法' });
    return;
  }
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 3600 || !'ABCDEF'.includes(grade)) {
    sendJson(res, 400, { ok: false, error: '成绩数据不合法' });
    return;
  }
  const mode = `${size}x${size}`;
  if (!records.users[name]) records.users[name] = {};
  if (!records.users[name][mode]) records.users[name][mode] = [];
  const list = records.users[name][mode];
  list.push({ t: Date.now(), s: Math.round(seconds * 100) / 100, g: grade });
  if (list.length > MAX_PER_MODE) records.users[name][mode] = list.slice(-MAX_PER_MODE);
  await persistRecords();
  sendJson(res, 200, { ok: true });
}

/* 查询某用户的全部记录（按规格分组，每组最新在前） */
async function handleGetRecords(req, res) {
  const name = normalizeName(new URL(req.url, 'http://localhost').searchParams.get('name'));
  if (!name) {
    sendJson(res, 400, { ok: false, error: '缺少用户名' });
    return;
  }
  const user = records.users[name] || {};
  const out = {};
  for (const size of RECORD_MODES) {
    const mode = `${size}x${size}`;
    if (Array.isArray(user[mode]) && user[mode].length) {
      out[mode] = [...user[mode]].reverse(); // 最新的排最前
    }
  }
  sendJson(res, 200, { ok: true, name, records: out });
}

/* 清空某用户的历史（body.size 可选：不传清空全部，传则只清该规格） */
async function handleClearRecords(req, res) {
  const body = await readBody(req);
  const name = normalizeName(body && body.name);
  if (!name) {
    sendJson(res, 400, { ok: false, error: '参数不合法' });
    return;
  }
  const user = records.users[name];
  if (!user) {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (body && body.size !== undefined && body.size !== null && body.size !== '') {
    const size = Number(body.size);
    if (!RECORD_MODES.includes(size)) {
      sendJson(res, 400, { ok: false, error: '参数不合法' });
      return;
    }
    delete user[`${size}x${size}`];
    if (Object.keys(user).length === 0) delete records.users[name];
  } else {
    delete records.users[name];
  }
  await persistRecords();
  sendJson(res, 200, { ok: true });
}

/* 允许的用户设置 */
const SETTING_KEYS = {
  theme: ['light', 'dark', 'auto'],
  fontSize: 'num',
  font: ['default', 'yahei', 'simsun', 'kaiti', 'heiti', 'pingfang'],
  language: ['en', 'zh', 'es', 'ja', 'ko'],
};
const SETTING_DEFAULTS = { theme: 'auto', fontSize: 1, font: 'default', language: 'en' };

function sanitizeSettings(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  if (SETTING_KEYS.theme.includes(raw.theme)) out.theme = raw.theme;
  const fs = Number(raw.fontSize);
  if (Number.isFinite(fs)) out.fontSize = Math.min(2, Math.max(0.6, Math.round(fs * 100) / 100));
  if (SETTING_KEYS.font.includes(raw.font)) out.font = raw.font;
  if (SETTING_KEYS.language.includes(raw.language)) out.language = raw.language;
  return out;
}

/* 读取用户设置 */
function handleGetSettings(req, res) {
  const name = normalizeName(new URL(req.url, 'http://localhost').searchParams.get('name'));
  if (!name) {
    sendJson(res, 400, { ok: false, error: '缺少用户名' });
    return;
  }
  const saved = (users[name] && users[name].settings) || {};
  sendJson(res, 200, { ok: true, settings: { ...SETTING_DEFAULTS, ...saved } });
}

/* 保存用户设置（局部合并） */
async function handleSaveSettings(req, res) {
  const body = await readBody(req);
  const name = normalizeName(body && body.name);
  if (!name) {
    sendJson(res, 400, { ok: false, error: '参数不合法' });
    return;
  }
  if (!users[name]) users[name] = { createdAt: new Date().toISOString() };
  const current = users[name].settings || {};
  users[name].settings = { ...SETTING_DEFAULTS, ...current, ...sanitizeSettings(body.settings) };
  await persistUsers();
  sendJson(res, 200, { ok: true, settings: users[name].settings });
}

/* 列出已注册用户 */
function handleGetUsers(req, res) {
  const list = Object.keys(users)
    .map((name) => ({ name, createdAt: users[name].createdAt || null }))
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  sendJson(res, 200, { ok: true, users: list });
}

/* 删除某用户（连同其历史成绩与设置） */
async function handleDeleteUser(req, res) {
  const body = await readBody(req);
  const name = normalizeName(body && body.name);
  if (!name) {
    sendJson(res, 400, { ok: false, error: '参数不合法' });
    return;
  }
  if (!users[name]) {
    sendJson(res, 200, { ok: true, deleted: false });
    return;
  }
  delete users[name];
  await persistUsers();
  if (records.users && records.users[name]) {
    delete records.users[name];
    await persistRecords();
  }
  sendJson(res, 200, { ok: true, deleted: true });
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, { ok: true, name: 'schulte-trainer' });
    return;
  }
  if (req.method === 'GET' && pathname === '/api/users') {
    handleGetUsers(req, res);
    return;
  }
  if (req.method === 'POST' && pathname === '/api/users/delete') {
    handleDeleteUser(req, res).catch(() => sendJson(res, 500, { ok: false, error: '服务器内部错误' }));
    return;
  }
  if (req.method === 'POST' && pathname === '/api/login') {
    handleLogin(req, res).catch(() => {
      sendJson(res, 500, { ok: false, error: '服务器内部错误' });
    });
    return;
  }
  if (req.method === 'GET' && pathname === '/api/settings') {
    handleGetSettings(req, res);
    return;
  }
  if (req.method === 'POST' && pathname === '/api/settings') {
    handleSaveSettings(req, res).catch(() => sendJson(res, 500, { ok: false, error: '服务器内部错误' }));
    return;
  }
  if (req.method === 'POST' && pathname === '/api/record') {
    handleRecord(req, res).catch(() => sendJson(res, 500, { ok: false, error: '服务器内部错误' }));
    return;
  }
  if (req.method === 'GET' && pathname === '/api/records') {
    handleGetRecords(req, res).catch(() => sendJson(res, 500, { ok: false, error: '服务器内部错误' }));
    return;
  }
  if (req.method === 'POST' && pathname === '/api/records/clear') {
    handleClearRecords(req, res).catch(() => sendJson(res, 500, { ok: false, error: '服务器内部错误' }));
    return;
  }
  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res, pathname);
    return;
  }
  sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
});

/* ---------------- 端口与启动 ---------------- */
function parsePort(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 65535 ? n : fallback;
}
const port = parsePort(process.env.PORT, parsePort(process.argv[2], 3000));

function lanAddresses() {
  const list = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) list.push(a.address);
    }
  }
  return list;
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${port} 已被占用。可用其它端口启动，例如：node server.js 8080`);
  } else {
    console.error('服务器错误：', err.message);
  }
  process.exit(1);
});

server.listen(port, '0.0.0.0', () => {
  console.log('');
  console.log('✔ 舒尔特方格训练工具已启动');
  console.log('────────────────────────────────────────');
  console.log(`  本机访问：    http://127.0.0.1:${port}`);
  const lans = lanAddresses();
  for (const ip of lans) {
    console.log(`  局域网访问：  http://${ip}:${port}`);
  }
  if (!lans.length) console.log('  （未检测到局域网地址，请确认已连接网络）');
  console.log('────────────────────────────────────────');
  console.log('  同一局域网内的手机 / 平板 / 其它电脑，');
  console.log('  用浏览器打开上面的“局域网访问”地址即可。');
  console.log('  首次运行若弹出 Windows 防火墙提示，请勾选“专用网络”并允许。');
  console.log('  按 Ctrl+C 或直接关闭本窗口即可停止服务。');
  console.log('');

  if (process.env.NO_OPEN !== '1') {
    try {
      const child = spawn(
        'cmd.exe',
        ['/c', 'start', '', `http://127.0.0.1:${port}`],
        { detached: true, stdio: 'ignore', windowsHide: true }
      );
      child.unref();
    } catch {
      /* 打开浏览器失败不影响服务 */
    }
  }
});
