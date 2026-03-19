import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, SatelliteDish, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface IntelligencePanelProps {
  competitorId: number;
  isAdmin: boolean;
}

export function IntelligencePanel({ competitorId, isAdmin }: IntelligencePanelProps) {
  const utils = trpc.useUtils();

  const { data: sources } = trpc.intelligence.getSources.useQuery(
    { competitorId },
    { enabled: isAdmin }
  );
  const { data: documents } = trpc.intelligence.getDocuments.useQuery(
    { competitorId },
    { enabled: isAdmin }
  );
  const { data: events } = trpc.intelligence.getEvents.useQuery(
    { competitorId },
    { enabled: isAdmin }
  );

  const ensureDefaultSources = trpc.intelligence.ensureDefaultSources.useMutation({
    onSuccess: async () => {
      await utils.intelligence.getSources.invalidate({ competitorId });
      toast.success("默认互联网情报源已初始化");
    },
    onError: (error) => {
      toast.error(error.message || "初始化情报源失败");
    },
  });

  const collectIntelligence = trpc.intelligence.collect.useMutation({
    onSuccess: async (result) => {
      await Promise.all([
        utils.intelligence.getSources.invalidate({ competitorId }),
        utils.intelligence.getDocuments.invalidate({ competitorId }),
        utils.intelligence.getEvents.invalidate({ competitorId }),
        utils.competitors.getById.invalidate({ id: competitorId }),
      ]);
      if (result.result.failed.length > 0) {
        toast.warning(
          `互联网情报采集已完成，但有 ${result.result.failed.length} 个源抓取失败，当前共沉淀 ${result.result.documentCount} 个源文档`
        );
        return;
      }

      toast.success(`互联网情报采集完成，处理 ${result.result.documentCount} 个源文档`);
    },
    onError: (error) => {
      toast.error(error.message || "互联网情报采集失败");
    },
  });

  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SatelliteDish className="w-5 h-5 text-accent" />
              互联网情报采集
            </CardTitle>
            <CardDescription>
              系统会先尝试自动补全官网，再注册默认信息源并执行多源采集。采集结果会先进入原始文档层，再抽取成结构化事件。
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => ensureDefaultSources.mutate({ competitorId })}
              disabled={ensureDefaultSources.isPending}
            >
              {ensureDefaultSources.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  初始化中...
                </>
              ) : (
                "初始化默认源"
              )}
            </Button>
            <Button
              onClick={() => collectIntelligence.mutate({ competitorId })}
              disabled={collectIntelligence.isPending}
            >
              {collectIntelligence.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  采集中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  采集互联网情报
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <InfoBlock title="已注册源" value={sources?.length || 0} />
          <InfoBlock title="原始文档" value={documents?.length || 0} />
          <InfoBlock title="抽取事件" value={events?.length || 0} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ListBlock
            title="信息源"
            emptyText="还没有注册的信息源"
            items={(sources || []).slice(0, 4).map((source) => (
              <div key={source.id} className="rounded-lg border border-border/30 p-3 bg-background/30">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{source.label}</p>
                  <Badge className="badge-muted">{source.sourceType}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2 break-all">{source.url}</p>
              </div>
            ))}
          />

          <ListBlock
            title="原始文档"
            emptyText="还没有采集到原始文档"
            items={(documents || []).slice(0, 4).map((document) => (
              <div key={document.id} className="rounded-lg border border-border/30 p-3 bg-background/30">
                <p className="font-medium">{document.title || "未命名文档"}</p>
                <p className="text-xs text-muted-foreground mt-2 break-all">{document.canonicalUrl}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  状态：{document.extractionStatus}
                </p>
              </div>
            ))}
          />

          <ListBlock
            title="结构化事件"
            emptyText="还没有抽取出的事件"
            items={(events || []).slice(0, 4).map((event) => (
              <div key={event.id} className="rounded-lg border border-border/30 p-3 bg-background/30">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{event.title}</p>
                  <Badge className="badge-muted">{event.eventType}</Badge>
                </div>
                {event.evidenceSnippet && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{event.evidenceSnippet}</p>
                )}
              </div>
            ))}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/30 bg-background/30 p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ListBlock({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: ReactNode[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{title}</p>
      {items.length > 0 ? items : <p className="text-sm text-muted-foreground">{emptyText}</p>}
    </div>
  );
}
