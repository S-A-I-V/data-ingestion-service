// MAF Application Settings — nfc-admin standalone deployment
// Builds the nfc-admin screen as a standalone MAF application.

const dotenv = require("dotenv");
const path = require("path");

const envFile = process.env.ENVIRONMENT || "dev";
const envPath = path.resolve(__dirname, `../.env.${envFile}`);
dotenv.config({ path: envPath });

// Standalone app with display_code "nfc-admin"
const appName = "nfc-admin";

module.exports = {
  appName,
  appEntry: {
    "nfc-admin": "./src/maf-routes/nfc-admin.tsx",
  },
};
