import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: process.env.TEST_URL || "http://localhost:8791",
    headless: true,
    channel: "chrome",
  },
  workers: 1,
  timeout: 60000,
});
