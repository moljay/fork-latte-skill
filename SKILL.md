---
name: signup-agent
description: 报名/登记信息收集 agent（中转服务模式）。触发词：「ping」。用户触发时提示用逗号分隔填写报名信息（名字,职业,微信号,有无创业经验），解析后先查重（同一人=微信号相同），若已提交则提示用户「覆盖」或「新增」，再 POST 写入飞书多维表格；新增回复「报名成功」、覆盖回复「报名已更新」。飞书凭证仅存于中转服务端，客户端零敏感信息。需中转服务 endpoint 配置在 relay-server/config.json。
metadata:
  requires:
    bins: ["curl"]
  cliHelp: "node relay-server/server.js"
---

# 报名收集 Agent（中转服务模式）

收集报名信息 → 通过中转服务写入飞书多维表格。飞书凭证只在**中转服务端**持有，本 skill 不包含任何飞书 token。

## 配置（私密，不入库）
`relay-server/config.json` 存放中转服务地址（与 `relay-server/.env` 同目录）：
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
- **微信号是查重唯一键**：同一人 = 微信号相同（名字可变，如「发放」改了职业仍算同一人）。

### 3. 查重（提交前先问中转服务）
同一人 = 微信号相同。发送前先调用查重接口（GET）：

PowerShell（查重是 GET、微信号在 URL 里，无中文 body 问题）：
```powershell
$resp = Invoke-RestMethod -Uri "<endpoint>/exists?wechat=<微信号>" -Method Get
# $resp.exists 为 $true/$false；$resp.record_id、$resp.fields 为已有记录（fields 含 名字/职业/微信号/有无创业经验）
```
（macOS/Linux：`curl -s "<endpoint>/exists?wechat=<微信号>"`。）

- 若 `exists` 为 **false** → 直接进入步骤 4 正常提交。
- 若 `exists` 为 **true** → 先向用户确认（用返回里的之前记录）：
  > 你已提交过报名（之前：名字=…，职业=…）。是否需要覆盖之前的记录？回复「覆盖」或「新增一条」。
  - 用户回「覆盖」→ 提交时附加 `overwrite:true` 与 `record_id`（取自查重返回），更新该条记录。
  - 用户回「新增一条」/「新增」→ 正常提交（不带 overwrite），新增一行。

### 4. 发送到中转服务（静默）
从 `relay-server/config.json` 读取 `endpoint` 与可选 `api_key`，用 exec 工具发送 POST。
- 覆盖场景：body 额外加 `"overwrite":true,"record_id":"<查重返回的record_id>"`。

PowerShell（OpenClaw 默认，**必须用 UTF-8 字节发，否则中文 body 会 400**）：
```powershell
$body = '{"name":"<名字>","job":"<职业>","wechat":"<微信号>","experience":"<有/无>"}'
if ("<是否覆盖>" -eq "true") { $body = $body.TrimEnd('}') + ',"overwrite":true,"record_id":"<record_id>"}' }
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
if ("<api_key>" -ne "") {
  Invoke-RestMethod -Uri "<endpoint>" -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes -Headers @{ "x-api-key" = "<api_key>" }
} else {
  Invoke-RestMethod -Uri "<endpoint>" -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes
}
```
（macOS/Linux 用 `curl -s -X POST "<endpoint>" -H "Content-Type: application/json" -d $body`；覆盖时 body 加 `"overwrite":true,"record_id":"..."`。）

返回对象含 `ok = true` 即成功。不要向用户展示请求/响应细节。

### 5. 成功提示
- 新增成功 → 回复：**✅ 报名成功**
- 覆盖更新成功 → 回复：**✅ 报名已更新**
不附带任何内部连接信息。

## 批量报名
多条逗号记录 → 逐条 POST 到 endpoint。

## 注意事项
- 中转服务由你自行部署（见 relay-server/README.md），飞书凭证只在服务端。
- 不编造数据；凭证/服务端内部错误绝不向用户暴露。
- 若中转服务返回错误，向用户说明「报名服务暂时不可用」，不要把服务端报错原文泄露给用户。
