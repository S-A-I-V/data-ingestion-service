module.exports = {
  app: {
    name: "Nielsen Fulfillment Center - Data Ingestion",
    displayCode: "nfc",
    token: "REPLACE_WITH_YOUR_MAF_APP_TOKEN",
    entryPoint: "http://host.docker.internal:6101",
    frontendLayerVersion: 2,
    reactVersion: 18,
  },
  initScripts: ["vendors", "commons"],
  menus: [
    {
      name: "Home",
      screenId: "home",
      menuType: "SIDE_NAV",
      icon: "HomeOutlineIcon",
    },
    {
      name: "Dashboard",
      screenId: "dashboard",
      menuType: "SIDE_NAV",
      icon: "DashboardIcon",
    },
    {
      name: "Data Ingestion",
      screenId: "ingest",
      menuType: "SIDE_NAV",
      icon: "UploadIcon",
    },
    {
      name: "Report Health",
      screenId: "report-health",
      menuType: "SIDE_NAV",
      icon: "MonitorIcon",
    },
    {
      name: "Report Mapping",
      screenId: "report-mapping",
      menuType: "SIDE_NAV",
      icon: "ShareIcon",
    },
    {
      name: "Report Policies",
      screenId: "report-policies",
      menuType: "SIDE_NAV",
      icon: "SettingsOutlineIcon",
    },
    {
      name: "Job SLA",
      screenId: "job-sla",
      menuType: "SIDE_NAV",
      icon: "TimerIcon",
    },
    {
      name: "Onboarding",
      screenId: "job-onboarding",
      menuType: "SIDE_NAV",
      icon: "AddCircleOutlineIcon",
      children: [
        {
          name: "Job Onboarding",
          screenId: "job-onboarding",
          menuType: "SIDE_NAV",
        },
        {
          name: "Client Onboarding",
          screenId: "client-onboarding",
          menuType: "SIDE_NAV",
        },
      ],
    },
    {
      name: "Admin",
      screenId: "admin",
      menuType: "SIDE_NAV",
      icon: "DatabaseIcon",
      children: [
        {
          name: "Connections",
          screenId: "admin",
          menuType: "SIDE_NAV",
        },
        {
          name: "Associate Lookup",
          screenId: "associate-lookup",
          menuType: "SIDE_NAV",
        },
        {
          name: "Email Discrepancy",
          screenId: "email-discrepancy",
          menuType: "SIDE_NAV",
        },
        {
          name: "User Management",
          screenId: "user-management",
          menuType: "SIDE_NAV",
        },
        {
          name: "Audit Log",
          screenId: "audit-log",
          menuType: "SIDE_NAV",
        },
      ],
    },
  ],
};
