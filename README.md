# 9.5五道口AGI Bar“AI社交”coffeechat Skill

![Version](https://img.shields.io/gitee/v/tag/qidianjuzhen/signup-agent?label=version&color=blue&sort=semver) ![License](https://img.shields.io/badge/license-MIT-green) ![API](https://img.shields.io/badge/api-REST-orange) ![Mode](https://img.shields.io/badge/mode-lark__cli%20%7C%20feishu__api-blue)

这是一个 AI Skill——安装后，你的 AI 助手就能收集报名信息，按「名字,职业,微信号,有无创业经验」提交，自动查重（同一人 = 微信号相同），可选择覆盖旧记录或新增一条，并写入飞书多维表格。

一个「中转服务模式」的报名收集工具，客户端只管对话，数据经中转服务落表，飞书凭证不出服务端。

## 关于这个 Skill

| 项目 | 内容 |
|------|------|
| 收集字段 | 名字、职业、微信号、有无创业经验 |
| 唯一标识 | 微信号（相同微信号 = 同一人） |
| 写入目标 | 飞书多维表格（bitable） |
| 服务模式 | lark_cli（本地验证）/ feishu_api（生产部署） |

## 这个 Skill 能做什么

报名信息收集与去重写入服务，可以收报名、查重复，也能在重复时选择覆盖或新增：

| 能力 | 你可以说 |
|------|----------|
| 收集报名 | "报名" |
| 自动查重 | （同一微信号二次提交先提示，不静默覆盖） |
| 覆盖 / 新增 | "覆盖" / "新增" |
| 写入飞书 | — |

## 报名与查重

本 Skill 内置了基于**中转服务（relay-server）**的真实动作，AI 助手可以查重、按你的选择覆盖或新增，最终写入飞书多维表格。

**支持的操作：**

| 操作 | 说明 | 你可以说 |
|------|------|----------|
| 提交报名 | 按格式填四项，写入新记录 | "报名" |
| 查重提示 | 同一微信号已有记录时，先问你要不要覆盖 | — |
| 覆盖 | 用新信息更新已有记录 | "覆盖" |
| 新增 | 保留旧记录，再建一条 | "新增" |

**使用流程：**

1. 对 AI 助手说「报名」
2. 按格式填：名字,职业,微信号,有无创业经验（中英文逗号都认）
3. AI 先查重；若该微信号已有记录，问你「覆盖还是新增」
4. 提交写入飞书表，返回记录 ID

## 运行环境

支持 Windows、macOS 和 Linux，需要 Node.js 18 或更高版本（仅服务端 relay-server 需要），客户端由 AI 助手直接驱动，无需额外安装。

## 安装

直接拷贝下面这句话发给你的 AI 助手：

> 安装 https://gitee.com/qidianjuzhen/signup-agent

Agent 会自动克隆仓库并安装到对应的 Skill 目录。

## 服务端配置（relay-server）

中转服务有两种运行模式，详细步骤见 [relay-server/README.md](./relay-server/README.md)：

- **lark_cli**：复用本机已授权的 `lark-cli`，适合本地快速验证，无需建飞书应用。
- **feishu_api**：用飞书开放平台 API，需自建应用并授权多维表格权限，可部署到任意服务器 / Serverless。

客户端配置在 [relay-server/config.json](./relay-server/config.json)：只存中转服务的 `endpoint` 与可选 `api_key`，不含任何飞书凭证。

## 发布平台

- GitHub：https://github.com/moljay/signup-agent
- Gitee：https://gitee.com/qidianjuzhen/signup-agent

## 版本

版本号见顶部徽章，以 Git Tag 为准。

## License

[MIT](LICENSE)
