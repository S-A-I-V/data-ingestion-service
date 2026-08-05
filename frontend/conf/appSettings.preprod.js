// MAF Application Settings — nfc-preprod single-screen deployment
// Builds only the nfc-admin screen bundle for deployment to nfc-preprod app.

const dotenv = require("dotenv");
const path = require("path");

const envFile = process.env.ENVIRONMENT || "dev";
const envPath = path.resolve(__dirname, `../.env.${envFile}`);
dotenv.config({ path: envPath });

// For preprod, the display_code is "nfc-preprod" (the MAF app)
// and the screen is "nfc-admin"
const appName = "nfc-preprod";

module.exports = {
  appName,
  appEntry: {
    "nfc-admin": "./src/maf-routes/nfc-admin.tsx",
  },
};
