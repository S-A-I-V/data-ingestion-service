module.exports = {
  app: {
    name: "Nielsen Fulfillment Center Admin",
    displayCode: "nfc-admin",
    token: "REPLACE_WITH_NFC_ADMIN_APP_TOKEN",
    entryPoint: "http://host.docker.internal:8000",
    frontendLayerVersion: 2,
    reactVersion: 18,
  },
  initScripts: [],
  menus: [
    {
      name: "NFC Admin",
      screenId: "nfc-admin",
      menuType: "SIDE_NAV",
      icon: "DatabaseIcon",
    },
  ],
};
