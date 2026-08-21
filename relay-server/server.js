// 报名中转服务
// 接收报名信息并写入飞书多维表格。飞书凭证只存在于服务端环境变量，绝不下发客户端。
// 两种写入模式：
//   MODE=lark_cli    —— 调用本机已授权的 lark-cli（适合本地快速验证）
//   MODE=feishu_api  —— 调用飞书开放平台 API（生产，需自建应用，可部署到任意服务器/Serverless）

import http from 'node:http';
import { writeFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const PORT = process.env.PORT || 3000;
const MODE = (process.env.MODE || 'feishu_api').toLowerCase();
const API_KEY = process.env.API_KEY || '';           // 可选：启用后客户端需在 header x-api-key 携带
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || '';
const TABLE_ID = process.env.FEISHU_TABLE_ID || '';
const APP_ID = process.env.FEISHU_APP_ID || '';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_DOMAIN = process.env.FEISHU_DOMAIN || 'https://open.feishu.cn';

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function normalizeExp(v) {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  if (['有', '创过业', '是', 'yes', 'y', '有经验'].includes(s)) return '有';
  if (['无', '没', '没有', '否', 'no', 'n', '无经验'].includes(s)) return '无';
  return null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(new Error('body not json')); }
    });
    req.on('error', reject);
  });
}

let _token = null, _expire = 0;
async function getTenantToken() {
  if (_token && Date.now() < _expire) return _token;
  const r = await fetch(`${FEISHU_DOMAIN}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const j = await r.json();
  if (j.code !== 0) throw new Error('tenant_token: ' + JSON.stringify(j));
  _token = j.tenant_access_token;
  _expire = Date.now() + (j.expire - 60) * 1000;
  return _token;
}

async function writeViaFeishuApi(fields) {
  const token = await getTenantToken();
  const r = await fetch(
    `${FEISHU_DOMAIN}/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ fields }),
    }
  );
  const j = await r.json();
  if (j.code !== 0) throw new Error('feishu_append: ' + JSON.stringify(j));
  return j.data.record_id;
}

async function writeViaLarkCli(rec) {
  const payload = {
    create_records: [
      { 名字: rec.名字, 职业: rec.职业, 微信号: rec.微信号, 有无创业经验: [rec.有无创业经验] },
    ],
  };
  // lark-cli 的 --json @file 只接受「当前目录下的相对路径」，故写到 cwd 并清理
  const f = 'signup-rec-' + Date.now() + '-' + Math.floor(Math.random() * 1e6) + '.json';
  await writeFile(f, JSON.stringify(payload)); // UTF-8 无 BOM
  try {
    return await new Promise((resolve, reject) => {
      const proc = spawn(
        'lark-cli',
        ['base', '+record-batch-create', '--base-token', BASE_TOKEN, '--table-id', TABLE_ID, '--json', '@./' + f],
        { shell: true }
      );
      let out = '', err = '';
      proc.stdout.on('data', d => (out += d));
      proc.stderr.on('data', d => (err += d));
      proc.on('close', code => {
        if (code !== 0) return reject(new Error('lark-cli exit ' + code + ': ' + err));
        try {
          const j = JSON.parse(out);
          if (!j.ok) return reject(new Error('lark-cli not ok: ' + out));
          resolve((j.data && j.data.record_id_list && j.data.record_id_list[0]) || 'ok');
        } catch (e) { reject(new Error('parse lark-cli out: ' + out)); }
      });
    });
  } finally {
    try { await unlink(f); } catch {}
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || !req.url.startsWith('/api/signup')) {
    return send(res, 404, { ok: false, error: 'not found' });
  }
  if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
    return send(res, 401, { ok: false, error: 'unauthorized' });
  }
  try {
    const b = await readBody(req);
    const name = String(b.name || b.名字 || '').trim();
    const job = String(b.job || b.职业 || '').trim();
    const wechat = String(b.wechat || b.微信号 || '').trim();
    const exp = normalizeExp(b.experience || b.有无创业经验);
    if (!name || !wechat) return send(res, 400, { ok: false, error: '名字和微信号必填' });
    if (!exp) return send(res, 400, { ok: false, error: '有无创业经验须为 有/无' });
    const rec = { 名字: name, 职业: job, 微信号: wechat, 有无创业经验: exp };
    const rid = MODE === 'lark_cli'
      ? await writeViaLarkCli(rec)
      : await writeViaFeishuApi({ 名字: name, 职业: job, 微信号: wechat, 有无创业经验: [{ text: exp }] });
    return send(res, 200, { ok: true, record_id: rid });
  } catch (e) {
    return send(res, 500, { ok: false, error: String(e.message || e) });
  }
});

server.listen(PORT, () => console.log(`signup relay listening on :${PORT} (mode=${MODE})`));
