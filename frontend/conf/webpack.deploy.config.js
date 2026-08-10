/**
 * Webpack config for MAF deployment (dev/qa/prod).
 * Uses chunkhash in filenames for cache busting + generates an assets manifest
 * that MAF's nginx uses to resolve which JS files to load per screen.
 *
 * The ASSETS_VERSION in CI stays at 1.0.0 forever — the chunkhash in each
 * filename is what actually busts the browser cache on every deploy.
 */
const { merge } = require("webpack-merge");
const AssetsPlugin = require("assets-webpack-plugin");
const baseConfig = require("./webpack.base.config");
const commons = require("./commons");

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
    publicPath: `/${commons.appName}/`,
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
          priority: -10,
        },
        commons: {
          name: "commons",
          minChunks: 2,
          chunks: "all",
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
  },
  plugins: [
    new AssetsPlugin({
      filename: commons.assetsManifestFileName,
      path: commons.path,
      removeFullPathAutoPrefix: true,
      processOutput: function (assets) {
        assets.init_scripts = commons.initScreens;
        assets.version = commons.version;
        return JSON.stringify(assets, null, 2);
      },
    }),
  ],
});
