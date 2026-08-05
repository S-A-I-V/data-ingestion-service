const { merge } = require("webpack-merge");
const baseConfig = require("./webpack.base.config");
const commons = require("./commons");

module.exports = merge(baseConfig, {
  mode: "development",
  devtool: "eval-source-map",
  entry: commons.entry,
  output: {
    library: {
      name: commons.appName,
      type: "umd",
    },
    path: commons.path,
    chunkLoadingGlobal: commons.chunkLoadingGlobal,
    filename: commons.filenameTemplate,
    chunkLoading: "jsonp",
    chunkFilename: commons.filenameTemplate,
    publicPath: `/${commons.appName}/`,
  },
  watchOptions: {
    ignored: /node_modules/,
    poll: 1000,
  },
});
