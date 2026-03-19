import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Compass, Loader2, Plus, SearchCheck } from "lucide-react";
import { toast } from "sonner";

interface DiscoveryPanelProps {
  competitorId: number;
  isAdmin: boolean;
}

export function DiscoveryPanel({ competitorId, isAdmin }: DiscoveryPanelProps) {
  const utils = trpc.useUtils();
  const { data: runs } = trpc.discovery.getRuns.useQuery(
    { competitorId },
    { enabled: isAdmin }
  );
  const { data: targets } = trpc.discovery.getTargets.useQuery(
    { competitorId },
    { enabled: isAdmin }
  );

  const runDiscovery = trpc.discovery.runWebDiscovery.useMutation({
    onSuccess: async (result) => {
      await Promise.all([
        utils.discovery.getRuns.invalidate({ competitorId }),
        utils.discovery.getTargets.invalidate({ competitorId }),
      ]);
      toast.success(`全网发现完成，生成 ${result.result.targetCount} 个候选目标`);
    },
    onError: (error) => {
      toast.error(error.message || "全网发现失败");
    },
  });

  const promoteTarget = trpc.discovery.promoteTarget.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.discovery.getTargets.invalidate({ competitorId }),
        utils.intelligence.getSources.invalidate({ competitorId }),
      ]);
      toast.success("候选目标已加入情报源");
    },
    onError: (error) => {
      toast.error(error.message || "加入情报源失败");
    },
  });

  const promoteAllTargets = trpc.discovery.promoteAllTargets.useMutation({
    onSuccess: async (result) => {
      await Promise.all([
        utils.discovery.getTargets.invalidate({ competitorId }),
        utils.intelligence.getSources.invalidate({ competitorId }),
      ]);
      toast.success(`已批量加入 ${result.promotedCount} 个情报源`);
    },
    onError: (error) => {
      toast.error(error.message || "批量加入情报源失败");
    },
  });

  const collectPromotedSources = trpc.discovery.collectPromotedSources.useMutation({
    onSuccess: async (result) => {
      await Promise.all([
        utils.intelligence.getSources.invalidate({ competitorId }),
        utils.intelligence.getDocuments.invalidate({ competitorId }),
        utils.intelligence.getEvents.invalidate({ competitorId }),
      ]);
      toast.success(`已从 ${result.collectedCount} 个已晋升源回收证据`);
    },
    onError: (error) => {
      toast.error(error.message || "批量采集失败");
    },
  });

  const executeQueryTargets = trpc.discovery.executeQueryTargets.useMutation({
    onSuccess: async (result) => {
      await Promise.all([
        utils.discovery.getTargets.invalidate({ competitorId }),
        utils.intelligence.getSources.invalidate({ competitorId }),
        utils.intelligence.getDocuments.invalidate({ competitorId }),
        utils.intelligence.getEvents.invalidate({ competitorId }),
      ]);
      toast.success(`已执行 ${result.executedTargets} 个查询目标，回收 ${result.materializedCount} 份证据`);
    },
    onError: (error) => {
      toast.error(error.message || "执行查询目标失败");
    },
  });

  if (!isAdmin) {
    return null;
  }

  const latestRun = runs?.[0];
  const groupedTargets = groupTargetsByType(targets || []);

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-accent" />
              全网发现
            </CardTitle>
            <CardDescription>
              先让模型生成全网搜索计划和候选目标，再把高价值目标晋升为正式情报源。
            </CardDescription>
          </div>
          <Button
            onClick={() => runDiscovery.mutate({ competitorId })}
            disabled={runDiscovery.isPending}
          >
            {runDiscovery.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                发现中...
              </>
            ) : (
              "运行全网发现"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => promoteAllTargets.mutate({ competitorId })}
            disabled={promoteAllTargets.isPending}
          >
            {promoteAllTargets.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                晋升中...
              </>
            ) : (
              "批量加入情报源"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => collectPromotedSources.mutate({ competitorId })}
            disabled={collectPromotedSources.isPending}
          >
            {collectPromotedSources.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                回收中...
              </>
            ) : (
              <>
                <SearchCheck className="w-4 h-4 mr-2" />
                批量回收证据
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => executeQueryTargets.mutate({ competitorId })}
            disabled={executeQueryTargets.isPending}
          >
            {executeQueryTargets.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                查询中...
              </>
            ) : (
              "执行查询型目标"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {latestRun ? (
          <div className="rounded-lg border border-border/30 bg-background/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">最近发现任务</p>
                <p className="font-medium">{latestRun.summary || "已完成一次发现任务"}</p>
              </div>
              <Badge className="badge-muted">{latestRun.status}</Badge>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">还没有全网发现记录，先运行一次发现。</p>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium">候选目标</p>
          {groupedTargets.length > 0 ? groupedTargets.map(([type, items]) => (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{renderTypeLabel(type)}</p>
                <Badge className="badge-muted">{items.length}</Badge>
              </div>
              {items.slice(0, 4).map((target) => (
                <div key={target.id} className="rounded-lg border border-border/30 bg-background/30 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{target.title}</p>
                        <Badge className="badge-muted">{target.status}</Badge>
                        <Badge className={trustTierClassName(target.trustTier)}>{renderTrustTier(target.trustTier)}</Badge>
                      </div>
                      {target.query && (
                        <p className="text-xs text-muted-foreground mt-2 break-all">Query: {target.query}</p>
                      )}
                      {target.url && (
                        <p className="text-xs text-muted-foreground mt-2 break-all">{target.url}</p>
                      )}
                      {target.rationale && (
                        <p className="text-xs text-muted-foreground mt-2">{target.rationale}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => promoteTarget.mutate({ targetId: target.id })}
                      disabled={!target.url || target.status === "promoted" || promoteTarget.isPending}
                    >
                      {promoteTarget.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          处理中...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          加入情报源
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">暂无候选目标。</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function groupTargetsByType(targets: Array<{
  id: number;
  targetType: string;
  title: string;
  status: string;
  trustTier: string;
  query: string | null;
  url: string | null;
  rationale: string | null;
}>) {
  const groups = new Map<string, typeof targets>();

  for (const target of targets) {
    const current = groups.get(target.targetType) || [];
    current.push(target);
    groups.set(target.targetType, current);
  }

  return Array.from(groups.entries());
}

function renderTypeLabel(type: string) {
  switch (type) {
    case "news":
      return "新闻媒体";
    case "jobs":
      return "招聘信息";
    case "registry":
      return "工商公开信息";
    case "social":
      return "社媒线索";
    case "website":
      return "官网与站点";
    case "blog":
      return "博客与动态";
    default:
      return type;
  }
}

function renderTrustTier(trustTier: string) {
  switch (trustTier) {
    case "high":
      return "高可信";
    case "low":
      return "低可信";
    default:
      return "中可信";
  }
}

function trustTierClassName(trustTier: string) {
  switch (trustTier) {
    case "high":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "low":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    default:
      return "badge-muted";
  }
}
