# 报名 Agent Skill

![Mode](https://img.shields.io/badge/mode-lark__cli%20%7C%20feishu__api-blue) ![Storage](https://img.shields.io/badge/storage-Feishu%20Bitable-green) ![API](https://img.shields.io/badge/api-REST-orange) ![Runtime](https://img.shields.io/badge/runtime-Node.js%2018%2B-purple)

安装后，你的 AI 助手就能收集报名信息，自动查重（同一人 = 微信号相同），可选择**覆盖**旧记录或**新增**一条，并写入飞书多维表格。

一个「中转服务模式」的报名收集工具：客户端 Skill 只负责对话收集，数据通过 HTTP POST 发到你的中转服务（relay-server），再由服务端写入飞书多维表格。飞书凭证只留在服务端，客户端永远看不到。

## 关于这个 Skill

| 项目 | 内容 |
|------|------|
| 收集字段 | 名字、职业、微信号、有无创业经验 |
| 唯一标识 | 微信号（相同微信号 = 同一人） |
| 写入目标 | 飞书多维表格（bitable） |
| 服务模式 | lark_cli（本地验证）/ feishu_api（生产部署） |

## 这个 Skill 能做什么

| 能力 | 说明 | 你可以说 |
|------|------|----------|
| 收集报名 | 按「名字,职业,微信号,有无创业经验」提交 | "报名" |
| 自动查重 | 同一微信号二次提交时先提示，不静默覆盖 | — |
| 覆盖 / 新增 | 检测到重复后，让你选覆盖旧记录还是新增一条 | "覆盖" / "新增" |
| 写入飞书 | 把报名写入你的多维表格 | — |

## 报名流程

1. 对 AI 助手说「报名」
2. 按格式填：**名字,职业,微信号,有无创业经验**（中英文逗号都认）
3. AI 先查重；若该微信号已有记录，问你「覆盖还是新增」
4. 提交，写入飞书表，返回记录 ID

## 运行环境

需要 Node.js 18 或更高版本（仅服务端 relay-server 需要）。客户端由 AI 助手直接驱动，无需额外安装。

## 安装

直接拷贝下面这句话发给你的 AI 助手：

> 安装 https://gitee.com/qidianjuzhen/signup-agent

Agent 会自动克隆仓库并安装到对应的 Skill 目录。

## 服务端配置（relay-server）

中转服务有两种运行模式，详细步骤见 [`relay-server/README.md`](./relay-server/README.md)：

- **lark_cli**：复用本机已授权的 `lark-cli`，适合本地快速验证，无需建飞书应用。
- **feishu_api**：用飞书开放平台 API，需自建应用并授权多维表格权限，可部署到任意服务器 / Serverless。

客户端配置在 [`relay-server/config.json`](./relay-server/config.json)：只存中转服务的 `endpoint` 和可选 `api_key`，不含任何飞书凭证。

## 安全

- 服务端 `relay-server/.env` 含飞书凭证，已被 `.gitignore` 排除，切勿提交。
- 客户端 Skill 永远不接触飞书 token，只 POST 到你的 endpoint。
- 建议设置 `API_KEY`，避免端点被任意调用刷表。

## 发布平台

- GitHub：https://github.com/moljay/signup-agent
- Gitee：https://gitee.com/qidianjuzhen/signup-agent

## License

内部项目，未指定开源许可证。
