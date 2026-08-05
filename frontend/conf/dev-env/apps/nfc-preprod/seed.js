module.exports = {
  app: {
    name: "Nielsen Fulfillment Center Pre-Prod",
    displayCode: "nfc-preprod",
    token: "REPLACE_WITH_NFC_PREPROD_APP_TOKEN",
    entryPoint: "http://host.docker.internal:6101",
    frontendLayerVersion: 2,
    reactVersion: 18,
  },
  initScripts: ["vendors", "commons"],
  menus: [
    {
      name: "NFC Admin",
      screenId: "nfc-admin",
      menuType: "SIDE_NAV",
      icon: "DatabaseIcon",
    },
  ],
};
