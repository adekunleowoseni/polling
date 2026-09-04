export default async function run(page, ui) {
  await page.evaluate(() => {
    localStorage.setItem("lado_admin_token", "visual-qa");
    localStorage.setItem(
      "lado_admin",
      JSON.stringify({
        id: "qa",
        name: "Lead Organizer",
        email: "superadmin@lado.monitor",
        role: "super_admin",
        created_at: new Date().toISOString(),
      }),
    );
  });
  await page.goto("http://localhost:3000/admin/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("aside", { timeout: 20000 });
  await page.waitForTimeout(800);
  const overview = await page.evaluate(() => ({
    title: document.querySelector("h1")?.textContent?.trim(),
    aside: Boolean(document.querySelector("aside")),
    navCount: document.querySelectorAll("aside button").length,
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }));
  await page.screenshot({
    path: "C:\\Users\\Administrator\\Desktop\\project-am working-on\\Lado\\frontend\\admin-dash.png",
    fullPage: false,
  });

  const snap = await ui.snapshot();
  const feeds = snap.match(/@(e\d+) button "Live Operations & Maps"/);
  if (feeds) {
    await ui.click(`@${feeds[1]}`);
    await page.waitForTimeout(600);
  }
  const after = await page.evaluate(() => document.querySelector("h1")?.textContent?.trim());
  await page.screenshot({
    path: "C:\\Users\\Administrator\\Desktop\\project-am working-on\\Lado\\frontend\\admin-feeds.png",
    fullPage: false,
  });
  return { overview, after, snapPreview: snap.slice(0, 1200) };
}
