const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;

function blockDir(...segments) {
  const abs = path.join(projectRoot, ...segments);
  const escaped = abs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped}/.*`);
}

const config = {
  maxWorkers: 2,
  resolver: {
    unstable_enablePackageExports: true,
    blockList: [blockDir('build'), blockDir('android', 'build'), blockDir('ios', 'build')],
  },
  watchFolders: [path.resolve(projectRoot)],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
