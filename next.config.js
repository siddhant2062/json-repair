const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/**
 * @type {import('next').NextConfig}
 */
const config = {
  // output: "export", // Commented out for development - only needed for production build
  reactStrictMode: false,
  productionBrowserSourceMaps: true,
  typescript: {
    // Disable TypeScript checking during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Disable ESLint during build
    ignoreDuringBuilds: true,
  },
  compiler: {
    styledComponents: true,
  },
  // Performance optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  webpack: (config, { isServer, dev }) => {
    config.resolve.fallback = { fs: false };
    config.output.webassemblyModuleFilename = "static/wasm/[modulehash].wasm";
    config.experiments = { asyncWebAssembly: true, layers: true };

    if (!isServer) {
      config.output.environment = { ...config.output.environment, asyncFunction: true };
      
      // Fix AMD module conflicts (Monaco Editor, json-schema-faker)
      // These libraries use AMD (define/require) which conflicts with webpack
      const webpack = require('webpack');
      config.plugins = config.plugins || [];
      
      // Configure webpack to handle AMD modules properly
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      
      // Add rule to handle AMD modules from json-schema-faker and similar packages
      config.module.rules.push({
        test: /node_modules[\\/](json-schema-faker|monaco-editor)[\\/].*\.js$/,
        parser: {
          amd: false, // Disable AMD parsing for these modules
        },
      });
    }

    // Optimize chunk splitting for better caching
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Separate heavy libraries
            monaco: {
              name: 'monaco',
              test: /[\\/]node_modules[\\/](@monaco-editor|monaco-editor)[\\/]/,
              priority: 20,
            },
            reaflow: {
              name: 'reaflow',
              test: /[\\/]node_modules[\\/](reaflow|react-zoomable-ui)[\\/]/,
              priority: 20,
            },
            mantine: {
              name: 'mantine',
              test: /[\\/]node_modules[\\/]@mantine[\\/]/,
              priority: 15,
            },
          },
        },
      };
    }

    return config;
  },
};

const configExport = () => {
  if (process.env.ANALYZE === "true") return withBundleAnalyzer(config);

  // Sentry configuration - update with your own Sentry org and project if needed
  // if (process.env.GITHUB_REPOSITORY === "your-username/your-repo") {
  //   return withSentryConfig(
  //     config,
  //     {
  //       silent: true,
  //       org: "your-sentry-org",
  //       project: "your-sentry-project",
  //     },
  //     {
  //       widenClientFileUpload: true,
  //       hideSourceMaps: true,
  //       disableLogger: true,
  //       disableServerWebpackPlugin: true,
  //     }
  //   );
  // }

  return config;
};

module.exports = configExport();
