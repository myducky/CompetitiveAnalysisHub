import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, ExternalLink, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { CompetitorDialog } from "./CompetitorDialog";
import type { Competitor } from "../../../drizzle/schema";

interface CompetitorCardProps {
  competitor: Competitor;
  isAdmin?: boolean;
  onDeleted?: () => void;
}

export function CompetitorCard({ competitor, isAdmin = false, onDeleted }: CompetitorCardProps) {
  const [, setLocation] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMutation = trpc.competitors.delete.useMutation();
  const utils = trpc.useUtils();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ id: competitor.id });
      toast.success("竞品已删除");
      await utils.competitors.list.invalidate();
      setShowDeleteDialog(false);
      onDeleted?.();
    } catch (error) {
      console.error("Error deleting competitor:", error);
      toast.error("删除失败，请重试");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card
        className="glass cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setLocation(`/competitor/${competitor.id}`)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl">{competitor.name}</CardTitle>
              <CardDescription className="mt-1">
                {competitor.industry || "行业未知"}
              </CardDescription>
            </div>
            {competitor.financingStage && (
              <Badge className="badge-accent ml-2">{competitor.financingStage}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {competitor.foundingDate && (
              <div>
                <p className="text-muted-foreground">成立日期</p>
                <p className="font-medium">
                  {new Date(competitor.foundingDate).toLocaleDateString("zh-CN")}
                </p>
              </div>
            )}
            {competitor.registeredCapital && (
              <div>
                <p className="text-muted-foreground">注册资本</p>
                <p className="font-medium">{competitor.registeredCapital}</p>
              </div>
            )}
            {competitor.companySize && (
              <div>
                <p className="text-muted-foreground">公司规模</p>
                <p className="font-medium">{competitor.companySize}</p>
              </div>
            )}
            {competitor.headquartersLocation && (
              <div>
                <p className="text-muted-foreground">总部位置</p>
                <p className="font-medium">{competitor.headquartersLocation}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {competitor.description && (
            <p className="text-sm text-foreground line-clamp-2">{competitor.description}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-border/30">
            {competitor.website && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(competitor.website!, "_blank");
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                访问网站
              </Button>
            )}

            {isAdmin && (
              <>
                <CompetitorDialog
                  competitor={competitor}
                  mode="edit"
                  onSuccess={() => utils.competitors.list.invalidate()}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 "{competitor.name}" 吗？此操作不可撤销，相关的动态、融资、产品等数据也将被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
