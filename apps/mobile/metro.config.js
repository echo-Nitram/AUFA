const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root for changes in shared packages
config.watchFolders = [monorepoRoot];

// Disable default hierarchical lookup so we control resolution order.
// This prevents Metro from walking up and finding the web app's React 18
// instead of mobile's React 19.
config.resolver.disableHierarchicalLookup = true;

// Resolve packages: project-level first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force critical native packages to resolve from the correct location.
// In a monorepo, web (React 18) and mobile (React 19) coexist; Metro must
// pick the versions installed for the mobile workspace.
const mobileModules = path.resolve(projectRoot, 'node_modules');
const rootModules = path.resolve(monorepoRoot, 'node_modules');

function resolveFrom(pkg) {
  // Prefer mobile's own node_modules, fall back to monorepo root
  const localPath = path.resolve(mobileModules, pkg);
  try { require.resolve(localPath); return localPath; } catch {}
  return path.resolve(rootModules, pkg);
}

config.resolver.extraNodeModules = {
  'react': resolveFrom('react'),
  'react-native': resolveFrom('react-native'),
  'react/jsx-runtime': resolveFrom('react/jsx-runtime'),
};

module.exports = config;
