import "dotenv/config";
import { runCreativeRotation } from "../agent/creativeRotation.js";

const force = process.argv.includes("--force");

runCreativeRotation({ force })
  .then((entries) => {
    console.log(JSON.stringify(entries, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("Creative rotation failed:", err.message);
    process.exit(1);
  });
