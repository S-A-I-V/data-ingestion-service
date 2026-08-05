const { merge } = require("webpack-merge");
const baseConfig = require("./webpack.base.config");
const commons = require("./commons");
const TerserPlugin = require("terser-webpack-plugin");
const AssetsPlugin = require("assets-webpack-plugin");

module.exports = merge(baseConfig, {
  mode: "production",
  devtool: false,
  entry: commons.entry,
  output: {
    library: {
      name: commons.appName,
      type: "umd",
    },
    path: commons.path,
    chunkLoadingGlobal: commons.chunkLoadingGlobal,
    filename: commons.filenameChunkhashTemplate,
    chunkLoading: "jsonp",
    chunkFilename: commons.filenameChunkhashTemplate,
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
      filename: commons.assetsManifestFileName,
      path: commons.path,
      prettyPrint: true,
    }),
  ],
});
