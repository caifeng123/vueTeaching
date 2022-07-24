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
    resolve: {
        extensions: [".ts", ".js", ".json"],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
            },
        ],
    },
};

module.exports = config;
