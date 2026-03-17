INSERT INTO competitors
  (id, name, website, industry, foundingDate, registeredCapital, legalRepresentative, businessScope, headquartersLocation, companySize, financingStage, description, dataSourceLastUpdated)
VALUES
  (1, 'ShopFlow', 'https://shopflow.example.com', '跨境电商 SaaS', '2019-04-12 00:00:00', '2000万元', '林启航', '为独立站商家提供选品、投放、履约与数据分析工具。', '深圳', '100-300', 'Series A', '聚焦 DTC 品牌增长的一体化 SaaS 平台。', NOW()),
  (2, 'MarketPulse', 'https://marketpulse.example.com', '市场情报', '2020-07-08 00:00:00', '1000万元', '周明远', '提供竞品监控、广告素材追踪和舆情洞察服务。', '上海', '50-100', 'Seed', '以情报采集和竞对监测为核心卖点。', NOW()),
  (3, 'GlobalReach', 'https://globalreach.example.com', '跨境服务', '2018-01-20 00:00:00', '5000万元', '陈思妍', '提供海外仓、物流与本地化运营服务。', '杭州', '300-500', 'Series B', '构建跨境品牌的本地履约与增长网络。', NOW());

INSERT INTO financingEvents
  (competitorId, round, amount, amountUSD, currency, investors, announcementDate, source, description)
VALUES
  (1, 'Series A', '$12M', 12000000.00, 'USD', '["Vertex Ventures","GGV"]', '2025-11-15 00:00:00', 'TechNode', '用于扩展北美商家服务与 AI 选品能力。'),
  (2, 'Seed', '$3M', 3000000.00, 'USD', '["Linear Capital"]', '2025-09-02 00:00:00', '36Kr', '用于扩张情报数据源与自动化采集能力。'),
  (3, 'Series B', '$25M', 25000000.00, 'USD', '["Lightspeed","Hillhouse"]', '2026-01-10 00:00:00', 'LatePost', '用于加密欧洲仓网和本地化交付团队建设。');

INSERT INTO productReleases
  (competitorId, productName, releaseDate, version, description, features, category, source, url)
VALUES
  (1, 'ShopFlow Intelligence', '2026-02-21 00:00:00', '2.3', '上线竞品广告洞察与爆品预警面板。', '["广告监控","爆品预警","多店铺看板"]', '数据分析', '官方博客', 'https://shopflow.example.com/releases/2-3'),
  (2, 'Pulse Radar', '2026-02-10 00:00:00', '1.8', '新增品牌舆情追踪和社媒声量聚类。', '["舆情追踪","社媒聚类"]', '情报分析', '官方博客', 'https://marketpulse.example.com/releases/1-8'),
  (3, 'Reach OMS', '2026-01-28 00:00:00', '3.1', '发布全球仓配统一调度模块。', '["统一调度","履约预测"]', '供应链', '官网新闻', 'https://globalreach.example.com/news/oms-3-1');

INSERT INTO personnelChanges
  (competitorId, name, position, changeType, changeDate, previousPosition, department, source, description)
VALUES
  (1, '王嘉宁', 'VP of Growth', 'hire', '2026-02-03 00:00:00', 'Head of Growth at DTC Labs', '增长', 'LinkedIn', '强化北美增长和代理商生态能力。'),
  (2, '赵越', 'Head of Data', 'promotion', '2026-01-16 00:00:00', 'Senior Data Lead', '数据', '公司公告', '负责统一数据平台与指标体系。'),
  (3, '刘珂', 'GM Europe', 'hire', '2025-12-11 00:00:00', 'Regional Director at FastShip', '国际业务', '领英', '负责欧洲本地仓运营。');

INSERT INTO newsArticles
  (competitorId, title, content, source, url, publishDate, category, sentiment)
VALUES
  (1, 'ShopFlow 推出新一代 AI 选品助手', '新产品强调将广告趋势、供应链波动和价格带变化整合到单一决策界面，帮助卖家更快定位潜力 SKU。', '品牌官方', 'https://shopflow.example.com/news/ai-sourcing', '2026-02-25 00:00:00', 'product', 'positive'),
  (1, 'ShopFlow 与两家头部物流服务商达成合作', '合作后可直接在平台内查看渠道时效和履约成本预测。', '亿邦动力', 'https://example.com/shopflow-logistics', '2026-02-27 00:00:00', 'partnership', 'positive'),
  (2, 'MarketPulse 发布年度跨境电商投放趋势报告', '报告指出短视频素材迭代速度和本地化创意模板将成为 2026 年增长重点。', '36Kr', 'https://example.com/marketpulse-report', '2026-02-19 00:00:00', 'research', 'neutral'),
  (3, 'GlobalReach 新增波兰仓节点', '公司表示此举将缩短中东欧订单配送时间，并增强大促期间的仓储弹性。', '雨果网', 'https://example.com/globalreach-poland', '2026-02-08 00:00:00', 'expansion', 'positive');

INSERT INTO organizationStructure
  (competitorId, snapshotDate, totalHeadcount, departmentBreakdown, keyPositions, dataSource)
VALUES
  (1, '2026-03-01 00:00:00', 180, '{"product":45,"engineering":62,"growth":38,"operations":35}', '["CEO: 林启航","VP Growth: 王嘉宁"]', 'demo_seed'),
  (2, '2026-03-01 00:00:00', 76, '{"research":18,"engineering":24,"sales":20,"operations":14}', '["CEO: 周明远","Head of Data: 赵越"]', 'demo_seed'),
  (3, '2026-03-01 00:00:00', 360, '{"operations":180,"technology":55,"sales":72,"support":53}', '["CEO: 陈思妍","GM Europe: 刘珂"]', 'demo_seed');

INSERT INTO analysisReports
  (competitorId, title, executiveSummary, businessModel, competitiveAdvantages, riskFactors, marketPosition, investmentPerspective, strategicRecommendations, reportContent, generatedAt)
VALUES
  (
    1,
    'ShopFlow - 穿透式深度分析报告',
    'ShopFlow 通过“广告洞察 + 选品 + 履约分析”切入 DTC 卖家增长链路，具备较强的产品整合能力。',
    '采用 SaaS 订阅 + 增值数据模块收费，围绕高增长卖家扩张 ARPU。',
    '优势在于数据整合速度快、增长场景明确、生态合作能力较强。',
    '风险在于同类工具快速跟进、海外投放政策变动和客户续费压力。',
    '在跨境卖家增长工具细分赛道处于二线头部位置。',
    '若后续能验证高净收入留存和北美商家渗透率，具备继续融资的故事空间。',
    '建议强化行业模板与客户成功体系，提升规模化复制效率。',
    '# ShopFlow 分析报告\n\n## 执行摘要\nShopFlow 已形成围绕增长的产品闭环，适合作为核心观察对象。',
    '2026-03-01 00:00:00'
  );
