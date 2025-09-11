const path = require('path');

module.exports = {
  // Performance optimizations for development
  optimization: {
    removeAvailableModules: false,
    removeEmptyChunks: false,
    splitChunks: false,
  },
  
  // Faster source maps for development
  devtool: 'eval-cheap-module-source-map',
  
  // Reduce file system calls
  snapshot: {
    managedPaths: [path.resolve(__dirname, '../node_modules')],
    immutablePaths: [],
    buildDependencies: {
      hash: true,
      timestamp: true,
    },
  },
  
  // Cache configuration
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, '.next/cache/webpack'),
    compression: 'gzip',
    hashAlgorithm: 'xxhash64',
  },
};
