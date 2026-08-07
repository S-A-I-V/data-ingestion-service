const path = require("path");
const commons = require("./commons");
const DotenvWebpack = require("dotenv-webpack");

const envFile = process.env.ENVIRONMENT || "dev";

module.exports = {
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    alias: {
      "@": path.resolve(__dirname, "../src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              // Ensure @import'ed CSS files also pass through postcss-loader
              importLoaders: 1,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                // Explicit path so postcss-loader always finds the config
                // regardless of which directory webpack is invoked from
                config: path.resolve(__dirname, "../postcss.config.js"),
              },
            },
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|woff|woff2|eot|ttf|otf)$/i,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    new DotenvWebpack({
      path: path.resolve(__dirname, `../.env.${envFile}`),
      safe: false,
      systemvars: true,
    }),
  ],
  externals: {
    react: "React",
    "react-dom": "ReactDOM",
  },
};
