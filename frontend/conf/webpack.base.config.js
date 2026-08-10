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
    // Ensure webpack can resolve ESM-only packages that use "exports" field
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
    },
  },
  module: {
    rules: [
      {
        // Handle ESM .mjs files from node_modules (framer-motion, motion, etc.)
        // Disable fullySpecified so webpack doesn't require explicit extensions
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
              // Use webpack-specific tsconfig with moduleResolution: "node"
              configFile: path.resolve(__dirname, "../tsconfig.webpack.json"),
            },
          },
        ],
      },
      {
        // Our source CSS — processed through Tailwind v4 via @tailwindcss/postcss
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              // Let postcss-loader (via @tailwindcss/postcss) handle all @import
              // resolution. Tailwind v4 bundles imports internally — css-loader
              // must NOT try to resolve them or it will fail on `@import "tailwindcss"`.
              import: false,
              // Still run postcss-loader on any remaining inlined @import content
              importLoaders: 1,
              // Disable CSS Modules — we use plain CSS + Tailwind utilities
              modules: false,
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
        // Third-party CSS from node_modules (e.g. @xyflow/react, react-day-picker)
        // Plain injection — no Tailwind processing needed
        test: /\.css$/,
        include: /node_modules/,
        use: ["style-loader", "css-loader"],
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
    // MAF shell provides React and ReactDOM as globals
    react: "React",
    "react-dom": "ReactDOM",
  },
};
