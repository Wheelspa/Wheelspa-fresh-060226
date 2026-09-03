// craco.config.js
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Check if plugin files exist before enabling
const hasVisualEdits = fs.existsSync(path.join(__dirname, "plugins/visual-edits/dev-server-setup.js"));
const hasHealthCheck = fs.existsSync(path.join(__dirname, "plugins/health-check/webpack-health-plugin.js"));

const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true" && hasHealthCheck,
  enableVisualEdits: isDevServer && process.env.ENABLE_VISUAL_EDITS === "true" && hasVisualEdits,
};

// Conditionally load visual edits modules only in dev mode if enabled and present
let setupDevServer;
let babelMetadataPlugin;

if (config.enableVisualEdits) {
  try {
    setupDevServer = require("./plugins/visual-edits/dev-server-setup");
    babelMetadataPlugin = require("./plugins/visual-edits/babel-metadata-plugin");
  } catch (err) {
    console.warn("Visual edits plugin not found. Running without visual edits.");
  }
}

// Conditionally load health check modules only if enabled and present
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  try {
    WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
    setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
    healthPluginInstance = new WebpackHealthPlugin();
  } catch (err) {
    console.warn("Health check plugin not found. Running without health check.");
  }
}

const webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
    },
  },
};

// Only add babel metadata plugin during dev server
if (config.enableVisualEdits && babelMetadataPlugin) {
  webpackConfig.babel = {
    plugins: [babelMetadataPlugin],
  };
}

webpackConfig.devServer = (devServerConfig) => {
  // Apply visual edits dev server setup only if enabled
  if (config.enableVisualEdits && setupDevServer) {
    devServerConfig = setupDevServer(devServerConfig);
  }

  // Add health check endpoints if enabled
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Call original setup if exists
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }

      // Setup health endpoints
      setupHealthEndpoints(devServer, healthPluginInstance);

      return middlewares;
    };
  }

  return devServerConfig;
};

module.exports = webpackConfig;
