import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { Competitor } from "../../../drizzle/schema";

interface CompetitorDialogProps {
  competitor?: Competitor;
  onSuccess?: () => void;
  mode?: "create" | "edit";
}

export function CompetitorDialog({
  competitor,
  onSuccess,
  mode = "create",
}: CompetitorDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: competitor?.name || "",
    website: competitor?.website || "",
    industry: competitor?.industry || "",
    foundingDate: competitor?.foundingDate
      ? new Date(competitor.foundingDate).toISOString().split("T")[0]
      : "",
    registeredCapital: competitor?.registeredCapital || "",
    legalRepresentative: competitor?.legalRepresentative || "",
    businessScope: competitor?.businessScope || "",
    headquartersLocation: competitor?.headquartersLocation || "",
    companySize: competitor?.companySize || "",
    financingStage: competitor?.financingStage || "",
    description: competitor?.description || "",
  });

  const createMutation = trpc.competitors.create.useMutation();
  const updateMutation = trpc.competitors.update.useMutation();
  const utils = trpc.useUtils();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("请输入竞品名称");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          name: formData.name,
          website: formData.website || undefined,
          industry: formData.industry || undefined,
          foundingDate: formData.foundingDate
            ? new Date(formData.foundingDate)
            : undefined,
          registeredCapital: formData.registeredCapital || undefined,
          legalRepresentative: formData.legalRepresentative || undefined,
          businessScope: formData.businessScope || undefined,
          headquartersLocation: formData.headquartersLocation || undefined,
          companySize: formData.companySize || undefined,
          financingStage: formData.financingStage || undefined,
          description: formData.description || undefined,
        });
        toast.success("竞品添加成功！");
      } else if (competitor) {
        await updateMutation.mutateAsync({
          id: competitor.id,
          name: formData.name,
          website: formData.website || undefined,
          industry: formData.industry || undefined,
          foundingDate: formData.foundingDate
            ? new Date(formData.foundingDate)
            : undefined,
          registeredCapital: formData.registeredCapital || undefined,
          legalRepresentative: formData.legalRepresentative || undefined,
          businessScope: formData.businessScope || undefined,
          headquartersLocation: formData.headquartersLocation || undefined,
          companySize: formData.companySize || undefined,
          financingStage: formData.financingStage || undefined,
          description: formData.description || undefined,
        });
        toast.success("竞品信息更新成功！");
      }

      // Invalidate queries to refresh data
      await utils.competitors.list.invalidate();

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        mode === "create" ? "添加竞品失败，请重试" : "更新竞品失败，请重试"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={mode === "create" ? "default" : "outline"}
          size={mode === "create" ? "default" : "sm"}
        >
          {mode === "create" ? (
            <>
              <Plus className="w-4 h-4 mr-2" />
              添加竞品
            </>
          ) : (
            <>
              <Pencil className="w-4 h-4 mr-2" />
              编辑
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "添加新竞品" : "编辑竞品信息"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "填写竞品的基础信息"
              : "更新竞品的相关信息"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">竞品名称 *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., 出海匠"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">官方网站</Label>
              <Input
                id="website"
                name="website"
                type="url"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">行业</Label>
              <Input
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                placeholder="e.g., 跨境电商"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="foundingDate">成立日期</Label>
              <Input
                id="foundingDate"
                name="foundingDate"
                type="date"
                value={formData.foundingDate}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registeredCapital">注册资本</Label>
              <Input
                id="registeredCapital"
                name="registeredCapital"
                value={formData.registeredCapital}
                onChange={handleInputChange}
                placeholder="e.g., 1000万元"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalRepresentative">法人代表</Label>
              <Input
                id="legalRepresentative"
                name="legalRepresentative"
                value={formData.legalRepresentative}
                onChange={handleInputChange}
                placeholder="e.g., 张三"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="headquartersLocation">总部位置</Label>
              <Input
                id="headquartersLocation"
                name="headquartersLocation"
                value={formData.headquartersLocation}
                onChange={handleInputChange}
                placeholder="e.g., 深圳"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companySize">公司规模</Label>
              <Select
                value={formData.companySize}
                onValueChange={(value) =>
                  handleSelectChange("companySize", value)
                }
              >
                <SelectTrigger id="companySize">
                  <SelectValue placeholder="选择公司规模" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10 人</SelectItem>
                  <SelectItem value="11-50">11-50 人</SelectItem>
                  <SelectItem value="50-100">50-100 人</SelectItem>
                  <SelectItem value="100-500">100-500 人</SelectItem>
                  <SelectItem value="500-1000">500-1000 人</SelectItem>
                  <SelectItem value="1000+">1000+ 人</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="financingStage">融资阶段</Label>
              <Select
                value={formData.financingStage}
                onValueChange={(value) =>
                  handleSelectChange("financingStage", value)
                }
              >
                <SelectTrigger id="financingStage">
                  <SelectValue placeholder="选择融资阶段" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Seed">Seed</SelectItem>
                  <SelectItem value="Angel">Angel</SelectItem>
                  <SelectItem value="Pre-A">Pre-A</SelectItem>
                  <SelectItem value="Series A">Series A</SelectItem>
                  <SelectItem value="Series B">Series B</SelectItem>
                  <SelectItem value="Series C">Series C</SelectItem>
                  <SelectItem value="Series D+">Series D+</SelectItem>
                  <SelectItem value="IPO">IPO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Business Scope */}
          <div className="space-y-2">
            <Label htmlFor="businessScope">经营范围</Label>
            <Textarea
              id="businessScope"
              name="businessScope"
              value={formData.businessScope}
              onChange={handleInputChange}
              placeholder="描述公司的主要业务范围"
              rows={3}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">公司描述</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="公司简介和核心信息"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === "create" ? "添加中..." : "更新中..."}
                </>
              ) : mode === "create" ? (
                "添加竞品"
              ) : (
                "更新信息"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
