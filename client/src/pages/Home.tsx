import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, TrendingUp, Users, Zap, BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { CompetitorDialog } from "@/components/CompetitorDialog";
import { toast } from "sonner";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated, logout, loginWithPassword, authSubmitting } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [financingStageFilter, setFinancingStageFilter] = useState("all");
  const [identifier, setIdentifier] = useState("admin");
  const [password, setPassword] = useState("admin");

  const { data: competitors, isLoading: competitorsLoading } = trpc.competitors.list.useQuery();

  // Filter competitors based on search and filters
  const filteredCompetitors = competitors?.filter((comp) => {
    const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comp.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = industryFilter === "all" || comp.industry === industryFilter;
    const matchesStage = financingStageFilter === "all" || comp.financingStage === financingStageFilter;
    return matchesSearch && matchesIndustry && matchesStage;
  }) || [];

  // Get unique industries and financing stages for filters
  const industries = Array.from(new Set(competitors?.map(c => c.industry).filter(Boolean))) || [];
  const financingStages = Array.from(new Set(competitors?.map(c => c.financingStage).filter(Boolean))) || [];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const handlePasswordLogin = async (event: React.FormEvent) => {
      event.preventDefault();
      try {
        await loginWithPassword(identifier, password);
        toast.success("登录成功");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "登录失败");
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="glass w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-bold gradient-text">竞品情报平台</CardTitle>
            <CardDescription>账号密码登录，系统不开放注册</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handlePasswordLogin}>
              <div className="space-y-2">
                <label className="text-sm font-medium">账号</label>
                <Input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">密码</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button className="w-full" type="submit" size="lg" disabled={authSubmitting}>
                {authSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  "登录"
                )}
              </Button>
            </form>
            <div className="mt-4 rounded-xl border border-border/40 bg-muted/40 p-4 text-sm text-muted-foreground">
              初始账号：`admin`
              <br />
              初始密码：`admin`
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="container py-4 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold gradient-text">竞品情报平台</h1>
            <p className="text-sm text-muted-foreground">穿透式深度分析看板</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.name ?? user?.email}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              退出
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                监控竞品
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{competitors?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">个竞品在线</p>
            </CardContent>
          </Card>

          <Card className="glass card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                最新动态
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">--</div>
              <p className="text-xs text-muted-foreground mt-1">条最新事件</p>
            </CardContent>
          </Card>

          <Card className="glass card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                团队规模
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">--</div>
              <p className="text-xs text-muted-foreground mt-1">平均人数</p>
            </CardContent>
          </Card>

          <Card className="glass card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-accent" />
                融资总额
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">--</div>
              <p className="text-xs text-muted-foreground mt-1">总融资规模</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>竞品搜索与筛选</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索竞品名称或行业..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="选择行业" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部行业</SelectItem>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry || ""}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={financingStageFilter} onValueChange={setFinancingStageFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="选择融资阶段" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部阶段</SelectItem>
                  {financingStages.map((stage) => (
                    <SelectItem key={stage} value={stage || ""}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Competitors Grid */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">竞品列表</h2>
              <p className="text-muted-foreground mt-1">
                共 {filteredCompetitors.length} 个竞品
              </p>
            </div>
            {user?.role === "admin" && (
              <CompetitorDialog mode="create" />
            )}
          </div>

          {competitorsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : filteredCompetitors.length === 0 ? (
            <Card className="glass">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">暂无竞品数据</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompetitors.map((competitor) => (
                <Card
                  key={competitor.id}
                  className="glass card-hover cursor-pointer"
                  onClick={() => setLocation(`/competitor/${competitor.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="line-clamp-2">{competitor.name}</CardTitle>
                        {competitor.industry && (
                          <Badge className="badge-accent mt-2">{competitor.industry}</Badge>
                        )}
                      </div>
                      {competitor.logo && (
                        <img
                          src={competitor.logo}
                          alt={competitor.name}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {competitor.foundingDate && (
                      <div>
                        <p className="text-xs text-muted-foreground">成立日期</p>
                        <p className="text-sm font-medium">
                          {new Date(competitor.foundingDate).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                    )}
                    {competitor.registeredCapital && (
                      <div>
                        <p className="text-xs text-muted-foreground">注册资本</p>
                        <p className="text-sm font-medium">{competitor.registeredCapital}</p>
                      </div>
                    )}
                    {competitor.legalRepresentative && (
                      <div>
                        <p className="text-xs text-muted-foreground">法人代表</p>
                        <p className="text-sm font-medium">{competitor.legalRepresentative}</p>
                      </div>
                    )}
                    {competitor.financingStage && (
                      <div>
                        <Badge className="badge-muted">{competitor.financingStage}</Badge>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2 border-t border-border/30">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/competitor/${competitor.id}`);
                        }}
                      >
                        查看详情
                      </Button>
                      {user?.role === "admin" && (
                        <CompetitorDialog
                          competitor={competitor}
                          mode="edit"
                          onSuccess={() => {}}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
