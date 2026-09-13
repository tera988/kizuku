import { test, expect } from "@playwright/test";
test("iPhone demo: five screens, editing, sources, consent and responsive layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "デモを見る" })
    .click();
  await expect(
    page.getByRole("heading", { name: "今日の記録" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/iphone-home.png",
    fullPage: true,
  });
  for (const name of [
    "カレンダー",
    "傾向",
    "プラン",
    "設定",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("switch", { name: "スマートウォッチのデータを使う" })
    .uncheck();
  await page.getByRole("button", { name: "プラン", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "睡眠のプラン" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /鶏肉と野菜の蒸し焼き/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "お願い", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "買い物リスト" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "今日", exact: true }).click();
  await page.getByRole("button", { name: "今日を記録" }).click();
  await page.locator("input[name=sleep]").fill("7.5");
  await page.getByRole("button", { name: "記録を保存", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(errors).toEqual([]);
});
test("D1: authentication, CRUD, isolation, integration deduplication and revocation", async ({
  playwright,
}) => {
  const baseURL = process.env.TEST_URL || "http://localhost:8791";
  const a = await playwright.request.newContext({ baseURL }),
    b = await playwright.request.newContext({ baseURL });
  const suffix = Date.now();
  const password = "test-only-password-very-long";
  for (const [context, name] of [
    [a, "a"],
    [b, "b"],
  ] as const) {
    const r = await context.post("/api/register", {
      data: { username: `test_${suffix}_${name}`, password },
    });
    expect(r.status(), await r.text()).toBe(200);
  }
  const entry = {
    date: "2026-09-13",
    time: "07:00",
    source: "manual",
    title: "test record",
    values: { sleep: 7.5, steps: 5200 },
    estimated: false,
    note: "",
  };
  const created = await a.post("/api/records", { data: entry });
  expect(created.status()).toBe(200);
  const { id } = await created.json();
  expect((await (await a.get("/api/state")).json()).entries).toHaveLength(1);
  expect((await (await b.get("/api/state")).json()).entries).toHaveLength(0);
  expect(
    (await b.post("/api/records", { data: { ...entry, id } })).status(),
  ).toBe(404);
  expect(
    (
      await a.post("/api/records", {
        data: { ...entry, values: { sleep: -1 } },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await a.post("/api/records", {
        data: entry,
        headers: { Origin: "https://evil.example" },
      })
    ).status(),
  ).toBe(403);
  const token = (await (await a.post("/api/token")).json()).token;
  const ingest = { ...entry, source: "watch", externalId: "night-1" };
  for (let i = 0; i < 2; i++)
    expect(
      (
        await a.post("/api/ingest", {
          data: ingest,
          headers: { Authorization: `Bearer ${token}` },
        })
      ).status(),
    ).toBe(200);
  expect((await (await a.get("/api/state")).json()).entries).toHaveLength(2);
  let s = await (await a.get("/api/state")).json();
  s.settings.enabled.watch = false;
  await a.put("/api/settings", { data: s.settings });
  expect(
    (
      await a.post("/api/ingest", {
        data: ingest,
        headers: { Authorization: `Bearer ${token}` },
      })
    ).status(),
  ).toBe(409);
  await a.delete("/api/token");
  expect(
    (
      await a.post("/api/ingest", {
        data: ingest,
        headers: { Authorization: `Bearer ${token}` },
      })
    ).status(),
  ).toBe(401);
  const plan = await (
    await a.post("/api/plans", {
      data: {
        title: "散歩",
        date: "2026-09-13",
        detail: "確認済み",
        kind: "walk",
      },
    })
  ).json();
  expect(
    (await a.patch("/api/plans/" + plan.id, { data: { done: true } })).status(),
  ).toBe(200);
  expect((await (await a.get("/api/state")).json()).plans[0].done).toBe(true);
  expect((await a.post("/api/insights")).status()).toBe(403);
  await a.delete("/api/records/" + id);
  expect((await (await a.get("/api/state")).json()).entries).toHaveLength(1);
  for (const c of [a, b]) {
    expect((await c.delete("/api/account")).status()).toBe(200);
    expect((await c.get("/api/state")).status()).toBe(401);
    await c.dispose();
  }
});
test("desktop dashboard", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "デモを見る" })
    .click();
  await page.screenshot({
    path: "test-results/desktop-home.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('60-second demo can pause, confirm a plan and finish', async ({page}) => {
  await page.clock.install();
  await page.setViewportSize({width:375,height:812});
  await page.goto('/');
  await page.getByRole('button',{name:'デモを見る'}).click();
  await page.getByRole('button',{name:'1日を再生',exact:true}).click();
  await page.clock.runFor(31000);
  await page.getByRole('button',{name:'一時停止',exact:true}).click();
  await expect(page.getByRole('button',{name:'再開',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'選択肢を確認',exact:true}).click();
  await page.getByRole('button',{name:'お願い',exact:true}).click();
  await page.getByRole('button',{name:'再開',exact:true}).click();
  await page.clock.runFor(30000);
  await expect(page.getByText('1日の体験が完了しました。')).toBeVisible();
  await expect(page.getByText(/室温26℃・暖かい照明/)).toBeVisible();
});
