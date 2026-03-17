import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Download, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface ReportGeneratorProps {
  competitorId: number;
  competitorName: string;
}

export function ReportGenerator({ competitorId, competitorName }: ReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: existingReport } = trpc.reports.getAnalysisReport.useQuery(
    { competitorId },
    { enabled: !!competitorId }
  );

  const utils = trpc.useUtils();

  const generateReportMutation = trpc.reports.generateReport.useMutation();

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const result = await generateReportMutation.mutateAsync({
        competitorId,
      });

      toast.success("报告生成成功！");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("报告生成失败，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = () => {
    if (existingReport?.reportContent) {
      const element = document.createElement("a");
      const file = new Blob([existingReport.reportContent], { type: "text/markdown" });
      element.href = URL.createObjectURL(file);
      element.download = `${competitorName}_analysis_report.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("报告已下载");
    }
  };

  return (
    <div className="space-y-4">
      {/* Report Status Card */}
      {existingReport ? (
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  穿透式深度分析报告
                </CardTitle>
                <CardDescription>
                  生成于 {new Date(existingReport.generatedAt || new Date()).toLocaleDateString("zh-CN")}
                </CardDescription>
              </div>
              <Badge className="badge-accent">已生成</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Report Preview */}
            <div className="max-h-96 overflow-y-auto rounded-lg bg-background/50 p-4 border border-border/30">
              <Streamdown>{existingReport.reportContent || ""}</Streamdown>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadReport}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                下载报告
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateReport}
                disabled={isGenerating || generateReportMutation.isPending}
                className="flex-1"
              >
                {isGenerating || generateReportMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重新生成
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              生成穿透式深度分析报告
            </CardTitle>
            <CardDescription>
              基于 AI 分析生成专业的竞品分析报告，包含商业模式、竞争优势、风险分析等内容
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating || generateReportMutation.isPending}
              className="w-full"
              size="lg"
            >
              {isGenerating || generateReportMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  正在生成报告...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  生成深度分析报告
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              报告生成通常需要 30-60 秒，请耐心等待
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
