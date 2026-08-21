---
name: signup-agent
description: 报名/登记信息收集 agent。触发词：「报名」「登记」「收集报名」「签到」「名单」「帮我记一下」。用户触发时提示用逗号分隔填写报名信息（名字,职业,微信号,有无创业经验），解析后写入飞书多维表格，仅回复「报名成功」。飞书凭证存放在本目录 config.json（不入库、不对外暴露）。需飞书已授权、lark-cli 已安装。
metadata:
  requires:
    bins: ["lark-cli"]
  cliHelp: "lark-cli base --help"
---

# 报名收集 Agent（写入飞书多维表格）

收集报名信息并静默写入飞书多维表格，对用户输入者隐藏所有内部连接细节。

## 凭证配置（私密，不入库）
本 skill 的飞书表格凭证存放在**本目录下的 `config.json`**（与 SKILL.md 同级），格式：
```json
{"base_token":"<你的base_token>","table_id":"<你的table_id>"}
```
- 若该文件不存在：复制 `config.example.json` 为 `config.json` 并填入你自己的飞书多维表格凭证（不要共用他人的表）。
- **严禁**把 config.json 中的值、或表格链接，打印/透露给对话中的用户。
- config.json 已被 `.gitignore` 排除，不会进入公开仓库。

## 交互流程（用户触发「报名/登记」等时启动）

### 1. 提示用户输入（逗号分隔）
向用户输出：
> 请按以下格式，用【逗号】分隔填写报名信息：
> 名字,职业,微信号,有无创业经验
> 示例：张三,程序员,wxid_... ,有

### 2. 解析与校验
- 按英文逗号 `,` 或中文逗号 `，` 分割为 4 个字段：名字 / 职业 / 微信号 / 有无创业经验。
- 字段数不足 4 → 提示用户按上述格式补全后重新输入。
- 「有无创业经验」归一化：有/创过业/是/yes/y → 有；无/没/没有/否/no/n → 无；其它表述 → 向用户确认。
- 名字、微信号为空 → 要求补充。

### 3. 读取凭证并写入（静默）
从本目录 `config.json` 读取 `base_token`、`table_id`（不要向用户展示这些值）。
把记录写成临时 JSON 文件再调用 lark-cli：

临时文件内容：
```json
{"create_records":[{"名字":"<名字>","职业":"<职业>","微信号":"<微信号>","有无创业经验":["<有/无>"]}]}
```

Windows (PowerShell)：
```powershell
lark-cli base +record-batch-create --base-token <config中的base_token> --table-id <config中的table_id> --json "@<临时json绝对路径>"
```
macOS / Linux (bash)：
```bash
lark-cli base +record-batch-create --base-token <config中的base_token> --table-id <config中的table_id> --json @<临时json路径>
```

返回 `ok:true` 且含 `record_id_list` 即成功。

### 4. 成功提示
写入成功后，**仅回复**：
> ✅ 报名成功
不要附带表格链接、凭证或任何内部连接信息。

## 批量报名
用户一次给多人（多条逗号记录）时，组装多条记录一次性写入（单次最多 200 条）。

## 注意事项
- 前置：飞书已授权（OpenClaw 管家「连接」面板），lark-cli 已安装（见 lark-setup 技能）。
- 单选字段「有无创业经验」CellValue 必须是数组 `["有"]` / `["无"]`。
- 删除是高风险操作，需 `lark-cli base +record-delete ... --yes`，且必须先向用户明确确认。
- 不要编造数据；用户未提供的字段不要填默认值。
- 私密凭证仅用于写入，绝不向用户暴露。
