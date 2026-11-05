import { defineConfig, devices } from "@playwright/test";
const baseURL = `http://127.0.0.1:${process.env.PORT || 4178}`;
export default defineConfig({
  testDir: "./test/browser",
  use: { baseURL },
  webServer: {
    command: "bun demo/server.js",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
