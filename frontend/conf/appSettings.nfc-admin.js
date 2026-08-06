// MAF Application Settings — nfc-admin standalone app
// All screen entry points for the nfc-admin MAF application.

const dotenv = require("dotenv");
const path = require("path");

const envFile = process.env.ENVIRONMENT || "dev";
const envPath = path.resolve(__dirname, `../.env.${envFile}`);
dotenv.config({ path: envPath });

const appName = "nfc-admin";

module.exports = {
  appName,
  appEntry: {
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
