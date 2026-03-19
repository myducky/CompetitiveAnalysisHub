import { useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, DollarSign, Users, FileText, TrendingUp, Building2, Loader2, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ReportGenerator } from "@/components/ReportGenerator";
import { IntelligencePanel } from "@/components/IntelligencePanel";
import { DiscoveryPanel } from "@/components/DiscoveryPanel";
import { DemoWorkflowPanel } from "@/components/DemoWorkflowPanel";
import { toast } from "sonner";

export default function CompetitorDetail() {
  const [, params] = useRoute("/competitor/:id");
  const competitorId = params?.id ? parseInt(params.id) : null;

  const { user } = useAuth();

  const { data: competitor, isLoading: competitorLoading } = trpc.competitors.getById.useQuery(
    { id: competitorId! },
    { enabled: !!competitorId }
  );

  const { data: financingEvents } = trpc.dynamics.getFinancingEvents.useQuery(
    { competitorId: competitorId! },
    { enabled: !!competitorId }
  );

  const { data: productReleases } = trpc.dynamics.getProductReleases.useQuery(
    { competitorId: competitorId! },
    { enabled: !!competitorId }
  );

  const { data: personnelChanges } = trpc.dynamics.getPersonnelChanges.useQuery(
    { competitorId: competitorId! },
    { enabled: !!competitorId }
  );

  const { data: newsArticles } = trpc.dynamics.getNewsArticles.useQuery(
    { competitorId: competitorId! },
    { enabled: !!competitorId }
  );

  const { data: organizationStructure } = trpc.organization.getStructure.useQuery(
    { competitorId: competitorId! },
    { enabled: !!competitorId }
  );

  const { data: analysisReport } = trpc.reports.getAnalysisReport.useQuery(
    { competitorId: competitorId! },
    { enabled: !!competitorId }
  );

  const utils = trpc.useUtils();
  const runResearch = trpc.competitors.runResearch.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.competitors.getById.invalidate({ id: competitorId! }),
        utils.discovery.getRuns.invalidate({ competitorId: competitorId! }),
        utils.discovery.getTargets.invalidate({ competitorId: competitorId! }),
        utils.intelligence.getSources.invalidate({ competitorId: competitorId! }),
        utils.intelligence.getDocuments.invalidate({ competitorId: competitorId! }),
        utils.intelligence.getEvents.invalidate({ competitorId: competitorId! }),
        utils.dynamics.getNewsArticles.invalidate({ competitorId: competitorId! }),
        utils.organization.getStructure.invalidate({ competitorId: competitorId! }),
        utils.reports.getAnalysisReport.invalidate({ competitorId: competitorId! }),
      ]);
      toast.success("已补跑完整智能研究，请等待几秒后查看最新结果");
    },
    onError: (error) => {
      toast.error(error.message || "补跑智能研究失败");
    },
  });

  if (competitorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!competitor) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Button variant="ghost" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <Card className="glass mt-8">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">竞品不存在</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Combine all timeline events
  const timelineEvents = [
    ...(financingEvents || []).map((e) => ({
      type: "financing",
      date: e.announcementDate,
      title: `融资事件：${e.round}`,
      description: `融资金额：${e.amount}`,
      data: e,
    })),
    ...(productReleases || []).map((p) => ({
      type: "product",
      date: p.releaseDate,
      title: `产品发布：${p.productName}`,
      description: p.description,
      data: p,
    })),
    ...(personnelChanges || []).map((pc) => ({
      type: "personnel",
      date: pc.changeDate,
      title: `人员变化：${pc.name}`,
      description: `${pc.changeType} - ${pc.position}`,
      data: pc,
    })),
    ...(newsArticles || []).map((n) => ({
      type: "news",
      date: n.publishDate,
      title: n.title,
      description: n.content?.substring(0, 100),
      data: n,
    })),
  ].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{competitor.name}</h1>
            <p className="text-sm text-muted-foreground">{competitor.industry}</p>
          </div>
          {user?.role === "admin" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => runResearch.mutate({ id: competitor.id })}
              disabled={runResearch.isPending}
            >
              {runResearch.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  补跑中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  补跑智能研究
                </>
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 space-y-8">
        <DemoWorkflowPanel
          competitorId={competitorId!}
          isAdmin={user?.role === "admin"}
        />
        <DiscoveryPanel
          competitorId={competitorId!}
          isAdmin={user?.role === "admin"}
        />
        <IntelligencePanel
          competitorId={competitorId!}
          isAdmin={user?.role === "admin"}
        />

        {/* Basic Info */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>基础信息</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitor.foundingDate && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  成立日期
                </p>
                <p className="text-lg font-semibold mt-1">
                  {new Date(competitor.foundingDate).toLocaleDateString("zh-CN")}
                </p>
              </div>
            )}
            {competitor.registeredCapital && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  注册资本
                </p>
                <p className="text-lg font-semibold mt-1">{competitor.registeredCapital}</p>
              </div>
            )}
            {competitor.legalRepresentative && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  法人代表
                </p>
                <p className="text-lg font-semibold mt-1">{competitor.legalRepresentative}</p>
              </div>
            )}
            {competitor.headquartersLocation && (
              <div>
                <p className="text-sm text-muted-foreground">总部位置</p>
                <p className="text-lg font-semibold mt-1">{competitor.headquartersLocation}</p>
              </div>
            )}
            {competitor.companySize && (
              <div>
                <p className="text-sm text-muted-foreground">公司规模</p>
                <p className="text-lg font-semibold mt-1">{competitor.companySize}</p>
              </div>
            )}
            {competitor.financingStage && (
              <div>
                <p className="text-sm text-muted-foreground">融资阶段</p>
                <Badge className="badge-accent mt-2">{competitor.financingStage}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Scope */}
        {competitor.businessScope && (
          <Card className="glass">
            <CardHeader>
              <CardTitle>经营范围</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{competitor.businessScope}</p>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Details */}
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="timeline">动态时间线</TabsTrigger>
            <TabsTrigger value="organization">组织架构</TabsTrigger>
            <TabsTrigger value="comparison">对比分析</TabsTrigger>
            <TabsTrigger value="report">深度报告</TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            {timelineEvents.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">暂无动态数据</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {timelineEvents.map((event, idx) => (
                  <Card key={idx} className="glass">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 border border-accent/30">
                            {event.type === "financing" && <DollarSign className="w-5 h-5 text-accent" />}
                            {event.type === "product" && <TrendingUp className="w-5 h-5 text-accent" />}
                            {event.type === "personnel" && <Users className="w-5 h-5 text-accent" />}
                            {event.type === "news" && <FileText className="w-5 h-5 text-accent" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground">
                            {event.date ? new Date(event.date).toLocaleDateString("zh-CN") : "未知日期"}
                          </p>
                          <h3 className="text-lg font-semibold mt-1">{event.title}</h3>
                          {event.description && (
                            <p className="text-muted-foreground mt-2">{event.description}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization" className="space-y-4">
            {organizationStructure && organizationStructure.length > 0 ? (
              organizationStructure.map((org, idx) => (
                <Card key={idx} className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-accent" />
                      组织架构快照
                    </CardTitle>
                    <CardDescription>
                      {new Date(org.snapshotDate).toLocaleDateString("zh-CN")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {org.totalHeadcount && (
                      <div>
                        <p className="text-sm text-muted-foreground">总人数</p>
                        <p className="text-2xl font-bold text-accent">{org.totalHeadcount}</p>
                      </div>
                    )}
                    {org.departmentBreakdown && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-3">部门分布</p>
                        <div className="space-y-2">
                          {typeof org.departmentBreakdown === "string" ? (
                            <p className="text-foreground">{org.departmentBreakdown}</p>
                          ) : (
                            Object.entries(JSON.parse(org.departmentBreakdown || "{}")).map(
                              ([dept, count]: [string, unknown]) => (
                                <div key={dept} className="flex justify-between items-center">
                                  <span className="text-foreground">{dept}</span>
                                  <Badge className="badge-muted">{String(count)}人</Badge>
                                </div>
                              )
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="glass">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">暂无组织架构数据</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison">
            <Card className="glass">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">对比分析功能开发中...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report">
            <ReportGenerator competitorId={competitorId!} competitorName={competitor.name} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
