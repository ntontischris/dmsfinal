import { defineConfig, devices } from "@playwright/test";

// Τεστ από άκρη σε άκρη: τρέχουν στο CI πάνω σε τοπικό Supabase (βάση + είσοδος) και στην εφαρμογή σε production build.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],
  outputDir: "e2e-results",
  use: {
    baseURL: "http://localhost:3000",
    locale: "el-GR",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "pnpm start -p 3000",
    url: "http://localhost:3000/login",
    reuseExistingServer: false,
    stdout: "pipe",
    timeout: 60_000,
  },
});
