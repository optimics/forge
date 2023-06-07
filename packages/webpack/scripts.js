import { getPackageDistDir } from './dirs.js'
import { getBranchVars, getMode } from './env.js'
import { readFileSync } from 'fs'
import { join } from 'path'

import webpack from 'webpack'
import WebpackDevServer from 'webpack-dev-server'

const defaultPort = 3000

export const readManifest = (packageDir) =>
  JSON.parse(readFileSync(join(packageDir, 'package.json')))

/**
 * A shortcut to wait until webpack transiplation finishes
 * @param {WebpackCompiler} compiler
 * @async
 * @returns WebpackStats
 */
export const compile = (compiler) =>
  new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        return reject(err)
      }
      const info = stats.toJson()
      if (stats.hasErrors()) {
        const statsErr = new Error()
        const src = info.errors[0]
        statsErr.message = src.message
        statsErr.stack = [
          `Module: ${src.moduleIdentifier}:${src.loc}`,
          src.stack,
        ].join('\n')
        return reject(statsErr)
      }
      compiler.close((closeErr) => {
        if (closeErr) {
          reject(closeErr)
        }
      })
      if (!err) {
        return resolve(stats)
      }
      return Promise.resolve()
    })
  })

export const getWebpackConfig = ({
  distDir,
  bundleName,
  entryPath,
  env,
  manifest,
  plugins = [],
}) => ({
  entry: entryPath,
  externals: {
    'cross-fetch': 'fetch',
  },
  mode: getMode(env),
  resolve: {
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: ['.ts', '.tsx', '.js'],
    // Add support for TypeScripts fully qualified ESM imports.
    extensionAlias: {
      '.js': ['.js', '.ts'],
      '.cjs': ['.cjs', '.cts'],
      '.mjs': ['.mjs', '.mts'],
    },
  },
  module: {
    rules: [
      {
        test: /\.([cm]?ts|tsx)$/,
        loader: 'ts-loader',
      },
    ],
  },
  output: {
    path: distDir || getPackageDistDir(manifest.name),
    filename: bundleName && `${bundleName}.js`,
  },
  plugins: [new webpack.EnvironmentPlugin(env), ...plugins],
  target: 'web',
})

export const transpileScript = async ({ env, ...props }) => {
  const config = getWebpackConfig({
    ...props,
    env: {
      ...env,
      ...getBranchVars(),
      NODE_ENV: 'production',
    },
  })
  const result = await compile(webpack(config))
  return { result, config }
}

export const createDevServer = (webpackEnv) => {
  const webpackConfig = getWebpackConfig({ devServer: true, ...webpackEnv })
  const compilerConfig = {
    ...webpackConfig,
    entry: webpackEnv.entryPathDev || webpackEnv.entryPath,
    plugins: [...webpackConfig.plugins].filter(Boolean),
  }
  const compiler = webpack(compilerConfig)
  const devServerOptions = {
    open: false,
    port: process.env.NODE_PORT || webpackEnv.defaultPort || defaultPort,
    ...webpackEnv.devServerOptions,
  }
  return new WebpackDevServer(devServerOptions, compiler)
}

export const configurePackage = ({
  defaultPort,
  entryPath,
  env,
  srcDir,
}) => {
  const getWebpackEnvironment = () => ({
    defaultPort,
    entryPath,
    env: {
      NODE_DEBUG: Boolean(process.env.NODE_DEBUG),
      ...process.env,
      ...env,
    },
    manifest: readManifest(srcDir),
  })

  const build = () => transpileScript(getWebpackEnvironment())
  const runDevServer = () =>
    createDevServer(getWebpackEnvironment()).start()
  return { build, runDevServer }
}
