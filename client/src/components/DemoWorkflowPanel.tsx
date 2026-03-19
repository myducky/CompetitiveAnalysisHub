import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

type StepStatus = "idle" | "running" | "success" | "error";

type WorkflowStep = {
  key:
    | "ensureSources"
    | "runDiscovery"
    | "executeQueries"
    | "promoteTargets"
    | "collectPromoted"
    | "collectIntelligence"
    | "generateReport";
  label: string;
  description: string;
};

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    key: "ensureSources",
    label: "初始化情报源",
    description: "自动尝试补全官网，并准备官网/博客等基础互联网情报源。",
  },
  {
    key: "runDiscovery",
    label: "全网发现",
    description: "生成全网搜索计划和候选目标。",
  },
  {
    key: "executeQueries",
    label: "执行查询目标",
    description: "把查询型目标展开成真实链接。",
  },
  {
    key: "promoteTargets",
    label: "晋升情报源",
    description: "把高价值目标纳入正式情报源。",
  },
  {
    key: "collectPromoted",
    label: "回收外部证据",
    description: "批量抓取已晋升目标的原始内容。",
  },
  {
    key: "collectIntelligence",
    label: "抽取结构化事件",
    description: "将原始文档沉淀为事件与情报。",
  },
  {
    key: "generateReport",
    label: "生成分析报告",
    description: "输出可演示的深度分析结果。",
  },
];

interface DemoWorkflowPanelProps {
  competitorId: number;
  isAdmin: boolean;
}

export function DemoWorkflowPanel({
  competitorId,
  isAdmin,
}: DemoWorkflowPanelProps) {
  const utils = trpc.useUtils();
  const [stepStates, setStepStates] = useState<Record<string, StepStatus>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [lastSummary, setLastSummary] = useState<string>("");
  const currentStepRef = useRef<WorkflowStep["key"] | null>(null);

  const ensureDefaultSources = trpc.intelligence.ensureDefaultSources.useMutation();
  const runDiscovery = trpc.discovery.runWebDiscovery.useMutation();
  const executeQueryTargets = trpc.discovery.executeQueryTargets.useMutation();
  const promoteAllTargets = trpc.discovery.promoteAllTargets.useMutation();
  const collectPromotedSources = trpc.discovery.collectPromotedSources.useMutation();
  const collectIntelligence = trpc.intelligence.collect.useMutation();
  const generateReport = trpc.reports.generateReport.useMutation();

  const statusCounts = useMemo(() => {
    return WORKFLOW_STEPS.reduce(
      (acc, step) => {
        const status = stepStates[step.key] || "idle";
        acc[status] += 1;
        return acc;
      },
      { idle: 0, running: 0, success: 0, error: 0 } as Record<StepStatus, number>
    );
  }, [stepStates]);

  const setStepStatus = (key: WorkflowStep["key"], status: StepStatus) => {
    setStepStates((prev) => ({ ...prev, [key]: status }));
  };

  const invalidateAll = async () => {
    await Promise.all([
      utils.discovery.getRuns.invalidate({ competitorId }),
      utils.discovery.getTargets.invalidate({ competitorId }),
      utils.intelligence.getSources.invalidate({ competitorId }),
      utils.intelligence.getDocuments.invalidate({ competitorId }),
      utils.intelligence.getEvents.invalidate({ competitorId }),
      utils.reports.getAnalysisReport.invalidate({ competitorId }),
      utils.dynamics.getNewsArticles.invalidate({ competitorId }),
      utils.organization.getStructure.invalidate({ competitorId }),
    ]);
  };

  const runStep = async <T,>(
    step: WorkflowStep,
    action: () => Promise<T>,
    buildSummary?: (result: T) => string
  ) => {
    currentStepRef.current = step.key;
    setStepStatus(step.key, "running");
    const result = await action();
    setStepStatus(step.key, "success");
    currentStepRef.current = null;

    if (buildSummary) {
      const summary = buildSummary(result);
      if (summary) {
        setLastSummary(summary);
      }
    }

    await invalidateAll();
    return result;
  };

  const handleRunDemo = async () => {
    setIsRunning(true);
    setLastSummary("");
    setStepStates({});

    try {
      await runStep(
        WORKFLOW_STEPS[0],
        () => ensureDefaultSources.mutateAsync({ competitorId }),
        (result) => `已初始化 ${result.sources.length} 个默认情报源`
      );

      await runStep(
        WORKFLOW_STEPS[1],
        () => runDiscovery.mutateAsync({ competitorId }),
        (result) => `全网发现生成 ${result.result.targetCount} 个候选目标`
      );

      await runStep(
        WORKFLOW_STEPS[2],
        () => executeQueryTargets.mutateAsync({ competitorId }),
        (result) => `执行 ${result.executedTargets} 个查询目标，物化 ${result.materializedCount} 条链接`
      );

      await runStep(
        WORKFLOW_STEPS[3],
        () => promoteAllTargets.mutateAsync({ competitorId }),
        (result) => `已批量晋升 ${result.promotedCount} 个情报源`
      );

      await runStep(
        WORKFLOW_STEPS[4],
        () => collectPromotedSources.mutateAsync({ competitorId }),
        (result) => `已从 ${result.collectedCount} 个晋升源回收证据`
      );

      await runStep(
        WORKFLOW_STEPS[5],
        () => collectIntelligence.mutateAsync({ competitorId }),
        (result) => {
          if (result.result.failed.length > 0) {
            return `已处理 ${result.result.documentCount} 个原始文档，但有 ${result.result.failed.length} 个默认源抓取失败。常见原因是示例官网域名不可访问。`;
          }
          return `共处理 ${result.result.documentCount} 个原始文档`;
        }
      );

      await runStep(
        WORKFLOW_STEPS[6],
        () => generateReport.mutateAsync({ competitorId }),
        () => "深度分析报告已更新"
      );

      toast.success("演示闭环已跑完，可以直接查看时间线、情报和报告");
    } catch (error) {
      const message = error instanceof Error ? error.message : "演示流程执行失败";
      if (currentStepRef.current) {
        setStepStatus(currentStepRef.current, "error");
      }
      toast.error(message);
      setLastSummary(`执行中断：${message}`);
    } finally {
      setIsRunning(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-accent" />
              一键演示闭环
            </CardTitle>
            <CardDescription>
              按顺序执行全网发现、证据回收、结构化抽取和报告生成，适合现场演示。
            </CardDescription>
          </div>
          <Button onClick={handleRunDemo} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                正在跑闭环...
              </>
            ) : (
              "运行完整演示"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className="badge-muted">待执行 {statusCounts.idle}</Badge>
          <Badge className="badge-muted">进行中 {statusCounts.running}</Badge>
          <Badge className="badge-muted">成功 {statusCounts.success}</Badge>
          <Badge className="badge-muted">失败 {statusCounts.error}</Badge>
        </div>

        {lastSummary ? (
          <div className="rounded-lg border border-border/30 bg-background/30 p-4 text-sm text-muted-foreground">
            {lastSummary}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {WORKFLOW_STEPS.map((step) => {
            const status = stepStates[step.key] || "idle";
            return (
              <div
                key={step.key}
                className="rounded-lg border border-border/30 bg-background/30 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{step.label}</p>
                  <Badge className={statusBadgeClassName(status)}>
                    {renderStatusLabel(status)}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function renderStatusLabel(status: StepStatus) {
  switch (status) {
    case "running":
      return "进行中";
    case "success":
      return "已完成";
    case "error":
      return "失败";
    default:
      return "待执行";
  }
}

function statusBadgeClassName(status: StepStatus) {
  switch (status) {
    case "running":
      return "bg-blue-500/15 text-blue-200 border border-blue-400/20";
    case "success":
      return "bg-emerald-500/15 text-emerald-200 border border-emerald-400/20";
    case "error":
      return "bg-red-500/15 text-red-200 border border-red-400/20";
    default:
      return "badge-muted";
  }
}
