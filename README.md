# CompetitiveAnalysisHub

竞品情报平台，V0.0.1，提供竞品基础信息、最新动态、详情页和深度分析报告能力。

自己用直接 workflow+agent 实现了，放弃 - -

## 功能概览

- 竞品列表与详情页展示
- 最新动态时间线
- 深度分析报告入口
- 本地账号密码登录
- Docker 一键启动演示环境

## 一键启动

确保本机已安装并启动 Docker Desktop，然后在项目根目录执行：

```bash
docker compose up --build -d
```

启动后访问 [http://localhost:3000](http://localhost:3000)。

默认会同时启动：

- `app`: Node.js 应用
- `db`: MySQL 8.4

首次启动会自动导入：

- `drizzle/0000_classy_terror.sql`
- `drizzle/0001_nebulous_pete_wisdom.sql`
- `docker/mysql/initdb/100_seed_demo.sql`

这样即使没有外部数据源，也能直接看到一套演示竞品数据。

默认管理员账号如下：

- 账号：`admin`
- 密码：`admin`

## 开发说明

- 仓库统一使用 `pnpm`
- 默认使用账号密码登录
- 不开放注册入口
- 已移除 OAuth 登录流程

## 常用命令

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f app
docker compose down
docker compose down -v
```
