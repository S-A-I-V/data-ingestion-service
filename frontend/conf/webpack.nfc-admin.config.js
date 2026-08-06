/**
 * Webpack production config for nfc-admin standalone MAF app.
 * Builds all screen bundles for deployment to the nfc-admin MAF application.
 */
const { merge } = require("webpack-merge");
const baseConfig = require("./webpack.base.config");
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const AssetsPlugin = require("assets-webpack-plugin");

const { appName, appEntry } = require("./appSettings.nfc-admin");

const outputPath = path.join(__dirname, `/../build/${appName}`);

module.exports = merge(baseConfig, {
  mode: "production",
  devtool: false,
  entry: appEntry,
  output: {
    library: {
      name: appName,
      type: "umd",
    },
    path: outputPath,
    chunkLoadingGlobal: `${appName}ChunkLoadingGlobal`,
    filename: "[name].js?[chunkhash]",
    chunkLoading: "jsonp",
    chunkFilename: "[name].js?[chunkhash]",
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
          },
        },
      }),
    ],
  },
  plugins: [
    new AssetsPlugin({
      filename: `${appName}-assets-manifest.json`,
      path: outputPath,
      prettyPrint: true,
    }),
  ],
});
