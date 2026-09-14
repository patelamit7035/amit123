import "dotenv/config";
import express from "express";
import cors from "cors";
import cron from "node-cron";
import { runDailyCheck } from "./agent/dailyCheck.js";
import { approvePendingCreative, rejectPendingCreative, runCreativeRotation } from "./agent/creativeRotation.js";
import { getStoreState } from "./store.js";

const app = express();
app.use(express.json());

const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin === "*" ? true : corsOrigin.split(",") }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, configured: Boolean(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID) });
});

app.get("/api/state", async (_req, res) => {
  const state = await getStoreState();
  res.json(state);
});

app.post("/api/agent/run-daily-check", async (_req, res) => {
  try {
    const entry = await runDailyCheck();
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/agent/run-creative-rotation", async (req, res) => {
  try {
    const entries = await runCreativeRotation({ force: Boolean(req.body?.force) });
    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/creatives/:adSetId/:adId/approve", async (req, res) => {
  try {
    await approvePendingCreative(req.params.adSetId, req.params.adId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/creatives/:adSetId/:adId/reject", async (req, res) => {
  try {
    await rejectPendingCreative(req.params.adSetId, req.params.adId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`Meta Ads AI agent server listening on :${port}`);

  const dailyCheckCron = process.env.DAILY_CHECK_CRON || "0 8 * * *";
  const rotationCron = process.env.CREATIVE_ROTATION_CRON || "0 9 * * *";

  if (!process.env.META_ACCESS_TOKEN || !process.env.META_AD_ACCOUNT_ID) {
    console.warn(
      "META_ACCESS_TOKEN / META_AD_ACCOUNT_ID not set — cron jobs are scheduled but will error until you configure server/.env",
    );
  }

  cron.schedule(dailyCheckCron, () => {
    console.log("[cron] running daily check…");
    runDailyCheck().catch((err) => console.error("[cron] daily check failed:", err.message));
  });

  cron.schedule(rotationCron, () => {
    console.log("[cron] running creative rotation…");
    runCreativeRotation().catch((err) => console.error("[cron] creative rotation failed:", err.message));
  });

  console.log(`Daily check scheduled: "${dailyCheckCron}" · Creative rotation scheduled: "${rotationCron}"`);
});
