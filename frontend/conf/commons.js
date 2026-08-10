const path = require("path");
const { appName, appEntry } = require("./appSettings");

module.exports = {
  appName: appName,
  entry: appEntry,
  assetsManifestFileName: `${appName}-assets-manifest.json`,
  chunkManifestFileName: `${appName}-chunk-manifest.json`,
  chunkManifestVariable: `${appName}ChunkManifest`,
  filenameTemplate: "[name].js",
  filenameChunkhashTemplate: "[name].js?[chunkhash]",
  initScreens: ["vendors", "commons"],
  chunkLoadingGlobal: `${appName}ChunkLoadingGlobal`,
  path: path.join(__dirname, `/../build/${appName}`),
  urlLoaderNameTemplate: "[path][name].[ext]?[contenthash]",
  version: require("../package.json").version,
};
