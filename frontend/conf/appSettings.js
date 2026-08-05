// MAF Application Settings
// Entry points correspond to screen display_codes in the manifest.
// Each entry becomes a separate JS bundle deployed as a MAF screen.
//
// IMPORTANT: display_code should use lowercase kebab-case.

const dotenv = require("dotenv");
const path = require("path");

// Determine which .env file to load based on ENVIRONMENT variable
const envFile = process.env.ENVIRONMENT || "dev";
const envPath = path.resolve(__dirname, `../.env.${envFile}`);

// Load the environment file
dotenv.config({ path: envPath });

// Read appName from environment variable with fallback
const appName = process.env.REACT_APP_APP_DISPLAY_CODE || "nfc";

module.exports = {
  appName,
  appEntry: {
    // Individual screen entries (for full multi-screen deployment)
    "nfc-admin": "./src/maf-routes/nfc-admin.tsx",
    index: "./src/maf-routes/index.ts",
    home: "./src/maf-routes/home.tsx",
    dashboard: "./src/maf-routes/dashboard.tsx",
    ingest: "./src/maf-routes/ingest.tsx",
    "report-health": "./src/maf-routes/report-health.tsx",
    "report-mapping": "./src/maf-routes/report-mapping.tsx",
    "report-policies": "./src/maf-routes/report-policies.tsx",
    "job-sla": "./src/maf-routes/job-sla.tsx",
    "job-onboarding": "./src/maf-routes/job-onboarding.tsx",
    "client-onboarding": "./src/maf-routes/client-onboarding.tsx",
    "associate-lookup": "./src/maf-routes/associate-lookup.tsx",
    "email-discrepancy": "./src/maf-routes/email-discrepancy.tsx",
    "user-management": "./src/maf-routes/user-management.tsx",
    "audit-log": "./src/maf-routes/audit-log.tsx",
    admin: "./src/maf-routes/admin.tsx",
  },
};
