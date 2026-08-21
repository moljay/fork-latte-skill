---
name: signup-agent
description: 报名/登记信息收集 agent（中转服务模式）。触发词：「报名」「登记」「收集报名」「签到」「名单」「帮我记一下」。用户触发时提示用逗号分隔填写报名信息（名字,职业,微信号,有无创业经验），解析后通过你的中转服务 POST 写入飞书多维表格，仅回复「报名成功」。飞书凭证仅存于中转服务端，客户端零敏感信息。需中转服务 endpoint 配置在 config.json。
metadata:
  requires:
    bins: ["curl"]
  cliHelp: "node relay-server/server.js"
---

# 报名收集 Agent（中转服务模式）

收集报名信息 → 通过中转服务写入飞书多维表格。飞书凭证只在**中转服务端**持有，本 skill 不包含任何飞书 token。

## 配置（私密，不入库）
本目录 `config.json`（与 SKILL.md 同级）存放中转服务地址：
```json
{"endpoint":"<你的中转服务URL>","api_key":"<可选，服务端设置了才填>"}
```
- 若该文件不存在：复制 `config.example.json` 为 `config.json` 并填入你的中转服务地址。
- endpoint 只是个普通 URL，不属敏感信息；但同样不要向用户主动展示。

## 交互流程（用户触发「报名/登记」等时启动）

### 1. 提示用户输入（逗号分隔）
向用户输出：
> 请按以下格式，用【逗号】分隔填写报名信息：
> 名字,职业,微信号,有无创业经验
> 示例：张三,程序员,wxid_...,有

### 2. 解析与校验
- 按英文逗号 `,` 或中文逗号 `，` 分割为 4 字段：名字 / 职业 / 微信号 / 有无创业经验。
- 字段数不足 4 → 提示用户按上述格式补全后重新输入。
- 「有无创业经验」归一化：有/创过业/是/yes/y → 有；无/没/没有/否/no/n → 无；其它表述 → 向用户确认。
- 名字、微信号为空 → 要求补充。

### 3. 发送到中转服务（静默）
从 `config.json` 读取 `endpoint` 与可选 `api_key`，用 exec 工具发送 POST：

PowerShell（OpenClaw 默认）：
```powershell
$body = '{"name":"<名字>","job":"<职业>","wechat":"<微信号>","experience":"<有/无>"}'
if ("<api_key>" -ne "") {
  Invoke-RestMethod -Uri "<endpoint>" -Method Post -ContentType "application/json" -Body $body -Headers @{ "x-api-key" = "<api_key>" }
} else {
  Invoke-RestMethod -Uri "<endpoint>" -Method Post -ContentType "application/json" -Body $body
}
```
（macOS/Linux 用 `curl -s -X POST "<endpoint>" -H "Content-Type: application/json" -d $body`。）

返回对象含 `ok = True` 即成功。不要向用户展示请求/响应细节。

### 4. 成功提示
写入成功后，**仅回复**：
> ✅ 报名成功
不附带任何内部连接信息。

## 批量报名
多条逗号记录 → 逐条 POST 到 endpoint。

## 注意事项
- 中转服务由你自行部署（见 relay-server/README.md），飞书凭证只在服务端。
- 不编造数据；凭证/服务端内部错误绝不向用户暴露。
- 若中转服务返回错误，向用户说明「报名服务暂时不可用」，不要把服务端报错原文泄露给用户。
