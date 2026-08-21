---
name: signup-agent
description: 报名/登记信息收集 agent。当用户需要收集报名、登记、签到、名单类信息（名字、职业、微信号、有无创业经验）并自动写入飞书多维表格时使用。触发词：「报名」「登记」「收集报名」「签到」「名单」「帮我记一下」「登记一下」。适合活动报名、社群入群登记、课程报名等场景。需先按正文配置自己的飞书多维表格。
metadata:
  requires:
    bins: ["lark-cli"]
  cliHelp: "lark-cli base --help"
---

# 报名收集 Agent（写入飞书多维表格）

把报名信息收集后，自动写入一张**你自己的**飞书多维表格（Base）。

## ⚠️ 首次使用：建你自己的飞书表格（必做）
本 skill 不内置任何表格，需要你用自己的飞书账号建一张表并填入凭证，避免把数据写进别人的表。

1. **授权飞书**：在 OpenClaw 管家「连接」面板连接飞书（其他平台用 `lark-cli` 对应授权方式），确保 `lark-cli` 可用。
2. **建表**（先准备字段定义文件 `fields.json`，内容如下）：
   ```json
   [{"name":"名字","type":"text"},{"name":"职业","type":"text"},{"name":"微信号","type":"text"},{"name":"有无创业经验","type":"select","options":[{"name":"有"},{"name":"无"}]}]
   ```
   ```bash
   lark-cli base +base-create --name "报名表" --table-name "报名数据" --time-zone Asia/Shanghai --fields "@fields.json"
   ```
3. **记下返回的 `base_token` 与 `table_id`**，填到下方「配置」里。

## 配置（替换为你自己的表）
```
base_token : <YOUR_BASE_TOKEN>
table_id   : <YOUR_TABLE_ID>
表格 URL    : https://<你的域名>.feishu.cn/base/<YOUR_BASE_TOKEN>
```
> 把上面三处占位符换成你自己的真实值即可。不要将真实值提交到公开仓库。

## 工作流程

### 1. 收集信息
通过对话收集以下 4 项。**可一次性给，也可逐条问**：
- **名字**（必填，文本）
- **职业**（必填，文本）
- **微信号**（必填，文本）
- **有无创业经验**（必填，只能「有」或「无」）

如果用户一段话里直接带了信息（如「张三，程序员，wxid_abc，创过业」），自动解析提取，不必再逐条追问。信息不全时只追问缺失项。

### 2. 校验与归一化
- 名字、微信号 不能为空；为空则追问。
- 「有无创业经验」必须归一化为 **「有」** 或 **「无」**：
  - 有 / 有经验 / 创过业 / 创过 / 是 / yes / y → **有**
  - 无 / 没 / 没有 / 否 / no / n → **无**
- 其它无法判断的表述，向用户确认。

### 3. 写入飞书多维表格
**必须**先把记录写成一个临时 JSON 文件再引用（原因：中文在 PowerShell/部分 shell 里直接传字符串会编码错乱，且 `@` 不加引号会被 PowerShell 当成 splatting）。可用任意文件写入方式：OpenClaw 的 `write` 工具、Claude 的 Write 工具、或 `cat > file` 等。

临时文件内容（严格 JSON，**select 字段用单元素数组**）：

```json
{"create_records":[{"名字":"<名字>","职业":"<职业>","微信号":"<微信号>","有无创业经验":["<有/无>"]}]}
```

然后执行（**`--json` 后的 `@` 必须带引号**，否则 PowerShell 报 SplattingNotPermitted）：

```powershell
# Windows (PowerShell)
lark-cli base +record-batch-create --base-token <YOUR_BASE_TOKEN> --table-id <YOUR_TABLE_ID> --json "@<临时json文件绝对路径>"
```

```bash
# macOS / Linux (bash)：注意 @ 后直接跟路径，无需引号
lark-cli base +record-batch-create --base-token <YOUR_BASE_TOKEN> --table-id <YOUR_TABLE_ID> --json @<临时json文件路径>
```

返回 `ok:true` 且含 `record_id_list` 即成功。

### 4. 确认回复
告知用户已登记成功，并附上你的表格链接（配置里的「表格 URL」）。

## 批量报名
用户一次给多个人时，组装多条记录一次性写入（单次最多 200 条）：

```json
{"create_records":[
  {"名字":"张三","职业":"工程师","微信号":"wx_a","有无创业经验":["有"]},
  {"名字":"李四","职业":"设计师","微信号":"wx_b","有无创业经验":["无"]}
]}
```

## 注意事项
- **前置**：飞书已授权，且 `lark-cli` 已安装（见 lark-setup 技能）。未授权时先引导用户在管家「连接」面板连接飞书。
- **单选字段**：「有无创业经验」CellValue 必须是数组 `["有"]` 或 `["无"]`，不能写裸字符串。
- **删除是高风险操作**：删除记录需 `lark-cli base +record-delete ... --yes`，且**必须先向用户明确确认**再执行。
- **不要编造数据**：所有写入字段必须来自用户真实提供；用户没给的字段不要填默认值。
- **隐私**：base_token / table_id 属于你的私人表格，请勿公开分享，也不要写死进会被他人安装的 skill。
