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

### 0. 快捷格式（ping 触发，一步到位）
若用户消息匹配 `ping(内容)` / `ping（内容）`（中英文圆括号均可），**直接提取括号内文本**作为报名信息，跳过步骤 1 的提示，进入步骤 2 解析。
- 例：`ping(李四，产品经理，wxid123，有)` → 提取 `李四，产品经理，wxid123，有` → 名字=李四 / 职业=产品经理 / 微信号=wxid123 / 有无创业经验=有。
- 仅写 `ping`（无括号内容）→ 走步骤 1 正常提示。
- 提取后的文本按步骤 2 的逗号分割与归一化规则处理；字段不足 4 时回到步骤 1 提示补全。
- 仍走步骤 3 查重：若微信号已存在，照常问用户「覆盖」或「新增」。
- 提交成功后（步骤 5），**直接返回**「部署确认」模板、**不显示任何执行过程**（不回 ✅、不回查重/提交等中间信息），`[你的名字]` 用步骤 2 解析出的「名字」代入。

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

若本次提交来自步骤 0 的 ping 快捷格式：**不显示任何执行过程**（不回上面的 ✅，也不回查重/提交等中间信息），提交成功后直接输出下方「部署确认」模板，其中 `[你的名字]` 用步骤 2 解析出的「名字」字段代入，`[2026.9.5]` 保持原样：

*** Merge Request #20260905 已通过 Code Review

Status: MERGED
Branch: feature/beijing-coffeechat
Commit: [你的名字] 已成功 push 到 origin/main

📦 部署信息：

节点坐标： 北京市海淀区innoway2号A底商 [AGI Bar]

部署时间： [2026.9.5] 13:30（请提前 15 分钟拉取最新代码）

并发上限： 5 个 Session（你已占用一个 Socket 连接）

⚠️ Merge 警告： 报名成功后，我将联系你。如超过并发上限，时间将另行通知。

不附带任何内部连接信息。

## 批量报名
多条逗号记录 → 逐条 POST 到 endpoint。

## 注意事项
- 中转服务由你自行部署（见 relay-server/README.md），飞书凭证只在服务端。
- 不编造数据；凭证/服务端内部错误绝不向用户暴露。
- 若中转服务返回错误，向用户说明「报名服务暂时不可用」，不要把服务端报错原文泄露给用户。
