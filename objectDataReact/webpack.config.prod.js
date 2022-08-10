const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

/**
 * @type {webpack.Configuration}
 */
const config = {
    mode: "development",
    entry: "./src/index.ts",
    plugins: [new HtmlWebpackPlugin()],
    module: {
        rules: [
            {
                test: /\.png$/,
                type: "asset", // 'asset/resource'|'asset/inline'|'asset/source'|'asset'
            },
            {
                test: /\.txt|md|csv$/,
                type: "asset/source", // 'asset/resource'|'asset/inline'|'asset/source'|'asset'
            },
        ],
    },
};

module.exports = config;
