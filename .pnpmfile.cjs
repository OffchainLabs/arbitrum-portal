// Oxlint runs eslint-plugin-zustand-rules as a JS plugin, so the plugin never loads ESLint.
// Drop its eslint peer: with autoInstallPeers, pnpm installs a peer even when
// peerDependenciesMeta marks it optional.
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === 'eslint-plugin-zustand-rules') {
        delete pkg.peerDependencies?.eslint;
        delete pkg.peerDependenciesMeta?.eslint;
      }
      return pkg;
    },
  },
};
