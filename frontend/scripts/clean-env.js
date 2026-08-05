/**
 * clean-env.js
 * Removes environment-specific build output folders.
 * Called by build:dev, build:qa, build:prod before webpack runs.
 */
const fs = require("fs");
const path = require("path");

const env = process.env.ENVIRONMENT || "dev";
const appDisplayCode = env === "prod" ? "nfc" : `nfc-${env === "dev" ? "" : env}`.replace(/-$/, "") || "nfc";

const buildDir = path.resolve(__dirname, `../build/${appDisplayCode}`);

if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
  console.log(`Cleaned: ${buildDir}`);
} else {
  console.log(`Build dir does not exist, skipping: ${buildDir}`);
}
