import "dotenv/config";
import { runDailyCheck } from "../agent/dailyCheck.js";

runDailyCheck()
  .then((entry) => {
    console.log(JSON.stringify(entry, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("Daily check failed:", err.message);
    process.exit(1);
  });
