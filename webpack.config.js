const path = require('path');
const fs = require('fs-extra');
const tar = require('tar');
const CopyPlugin = require('copy-webpack-plugin');
const { builtinModules } = require('node:module');

const rootDir = __dirname;
const distDir = path.resolve(rootDir, 'dist');
const publishDir = path.resolve(rootDir, 'publish');
const srcDir = path.resolve(rootDir, 'src');
const userConfig = fs.pathExistsSync(path.resolve(rootDir, 'plugin.config.json')) ? require('./plugin.config.json') : { extraScripts: [] };
const manifest = require('./src/manifest.json');
const fallback = {};
for (const moduleName of builtinModules) fallback[moduleName] = false;

const baseConfig = {
  mode: 'production',
  target: 'node',
  stats: 'errors-warnings',
  module: { rules: [{ test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ }] },
  resolve: {
    alias: { api: path.resolve(rootDir, 'api') },
    fallback,
    extensions: ['.js', '.tsx', '.ts', '.json'],
  },
};

const pluginConfig = {
  ...baseConfig,
  entry: './src/index.ts',
  output: { filename: 'index.js', path: distDir, libraryTarget: 'commonjs' },
  plugins: [new CopyPlugin({ patterns: [{ from: '**/*', context: srcDir, to: distDir, globOptions: { ignore: ['**/*.ts', '**/*.tsx'] } }] })],
};

const externalContentScriptLibraries = [
  '@codemirror/view', '@codemirror/state', '@codemirror/search', '@codemirror/language',
  '@codemirror/autocomplete', '@codemirror/commands', '@codemirror/highlight', '@codemirror/lint',
  '@codemirror/lang-html', '@codemirror/lang-markdown', '@codemirror/language-data',
  '@lezer/common', '@lezer/markdown', '@lezer/highlight'
];
const extraScriptExternals = {};
for (const library of externalContentScriptLibraries) extraScriptExternals[library] = { commonjs: library };

function resolveExtraScriptPath(name) {
  const relativePath = `./src/${name}`;
  const s = name.split('.');
  s.pop();
  return {
    entry: relativePath,
    output: {
      filename: `${s.join('.')}.js`,
      path: distDir,
      library: 'default',
      libraryTarget: 'commonjs',
      libraryExport: 'default',
    },
  };
}

function buildExtraScriptConfigs() {
  return (userConfig.extraScripts || []).map(name => ({
    ...baseConfig,
    ...resolveExtraScriptPath(name),
    externalsType: 'commonjs',
    externals: extraScriptExternals,
  }));
}

function archivePlugin() {
  fs.mkdirpSync(publishDir);
  const jplPath = path.resolve(publishDir, `${manifest.id}.jpl`);
  const files = [];
  const walk = dir => {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) walk(full);
      else files.push(path.relative(distDir, full));
    }
  };
  walk(distDir);
  fs.removeSync(jplPath);
  tar.create({ strict: true, portable: true, file: jplPath, cwd: distDir, sync: true }, files);
  fs.writeJsonSync(path.resolve(publishDir, `${manifest.id}.json`), manifest, { spaces: 2 });
  console.info(`Plugin archive has been created in ${jplPath}`);
}

const createArchiveConfig = {
  ...baseConfig,
  entry: './dist/index.js',
  output: { filename: 'index.js.tmp', path: publishDir },
  plugins: [{ apply(compiler) { compiler.hooks.done.tap('archiveOnBuildListener', archivePlugin); } }],
};

module.exports = env => {
  const configName = env && env['joplin-plugin-config'];
  if (configName === 'buildMain') {
    fs.removeSync(distDir);
    fs.removeSync(publishDir);
    fs.mkdirpSync(publishDir);
    return [pluginConfig];
  }
  if (configName === 'buildExtraScripts') return buildExtraScriptConfigs();
  if (configName === 'createArchive') return [createArchiveConfig];
  throw new Error('A config file must be specified via the --joplin-plugin-config flag');
};
