# 报名中转服务（relay-server）

把报名信息写入飞书多维表格的**服务端**。飞书凭证只存在这里的环境变量里，客户端 skill 仅持有一个普通 URL，看不到任何飞书细节。

## 两种写入模式

### 1) lark_cli（本地快速验证）
复用本机已授权的 `lark-cli`，无需建飞书应用。

```bash
cp .env.example .env
# 编辑 .env：MODE=lark_cli，填入 FEISHU_BASE_TOKEN / FEISHU_TABLE_ID
node server.js
```

### 2) feishu_api（生产，可部署到任意服务器/Serverless）
用飞书开放平台 API，需一个**飞书自建应用**：

1. 飞书开放平台创建企业自建应用，拿到 `App ID` / `App Secret`。
2. 给应用开通**多维表格**权限（`bitable:app` 或对应读写权限）。
3. 打开你的多维表格 → 右上角「...」→「添加文档应用」/在底座把该应用加为可编辑成员（不同版本叫法略有差异，核心是让应用对该表有写入权限）。
4. `.env` 填入：
   ```
   MODE=feishu_api
   FEISHU_APP_ID=cli_xxxxxxxx
   FEISHU_APP_SECRET=xxxxxxxx
   FEISHU_BASE_TOKEN=Qpimb2HVpa0mudsHqgvcsFBBnsg
   FEISHU_TABLE_ID=tbl2r5eoRfA138F6
   ```
5. `node server.js`

## 部署位置（让别人也能写你的表）
- **本地 + 内网穿透**：`cloudflared tunnel --url http://localhost:3000` 或 ngrok，得到公网 URL 填进 skill 的 `config.json`。
- **Serverless**：Cloudflare Workers / Vercel / 阿里云函数计算等，把 `server.js` 包成 HTTP 函数（注意用平台方式读取环境变量）。
- **VPS**：`node server.js` + 反向代理（Nginx/Caddy）+ HTTPS。

> 建议设 `API_KEY`，并在 skill 的 `config.json` 里带上，避免端点被任意调用刷表。

## 接口
`POST /api/signup`
```json
{ "name": "张三", "job": "程序员", "wechat": "wxid_abc", "experience": "有" }
```
成功：`{ "ok": true, "record_id": "recxxxx" }`
失败：`{ "ok": false, "error": "..." }`（401 未带 key / 400 校验失败 / 500 写入失败）

## 安全
- `.env` 含飞书凭证，**已被 .gitignore 排除，切勿提交**。
- 客户端 skill 永远不接触飞书 token，只 POST 到你的 endpoint。
