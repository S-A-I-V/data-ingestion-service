module.exports = {
  app: {
    name: "Nielsen Fulfillment Center Admin",
    displayCode: "nfc-admin",
    token: "9686de06-7b31-49f6-8db2-541dc257bf2c",
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
