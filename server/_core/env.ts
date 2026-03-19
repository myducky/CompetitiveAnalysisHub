export const ENV = {
  appId: process.env.VITE_APP_ID ?? "local-dev",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  initialAdminUsername: process.env.INITIAL_ADMIN_USERNAME ?? "admin",
  initialAdminPassword: process.env.INITIAL_ADMIN_PASSWORD ?? "admin",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  forgeModel: process.env.BUILT_IN_FORGE_MODEL ?? "qwen3.5-plus",
  searchProviderUrl: process.env.SEARCH_PROVIDER_URL ?? "",
  searchProviderApiKey: process.env.SEARCH_PROVIDER_API_KEY ?? "",
};
