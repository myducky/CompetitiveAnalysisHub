# CompetitiveAnalysisHub

竞品情报平台，V0.0.1，提供竞品基础信息、最新动态、详情页和深度分析报告能力。

自己用直接 workflow+agent 实现了，放弃 - -

## 功能概览

- 竞品列表与详情页展示
- 最新动态时间线
- 深度分析报告入口
- 互联网情报采集与全网发现
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

默认不会注入任何 demo 竞品数据，需要手动新增真实竞品。

默认管理员账号如下：

- 账号：`admin`
- 密码：`admin`

## 互联网情报采集（MVP）

当前版本已支持管理员在竞品详情页手动触发统一的“互联网情报采集”：

- 自动尝试根据竞品名称补全官网
- 初始化默认互联网情报源
- 抓取官网、博客等公开页面并沉淀到“信息源 / 原始文档 / 结构化事件”三层
- 新增“全网发现”层，用于生成搜索计划和候选目标，再将高价值目标晋升为正式情报源

说明：

- 这是一版最小可用的互联网情报采集链路，当前主要覆盖官网、博客及搜索发现到的公开信息
- 当前推荐链路：先做“全网发现”，再把候选目标纳入情报源进行证据化采集
- 发现结果中的“查询型目标”已支持二次执行，可调用搜索提供方展开为真实链接并自动回收证据
- discovery target / intelligence source 已支持高、中、低可信度分层，便于优先处理高价值来源
- 已预留大模型抽取入口；若配置了模型密钥，会优先走 LLM 结构化抽取，未配置时回退到启发式抽取
- 若配置 `SEARCH_PROVIDER_URL` / `SEARCH_PROVIDER_API_KEY`，全网发现会进一步执行真实搜索并合并搜索结果
- 工商、招聘、新闻媒体、社交平台等多源采集仍需继续扩展

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
