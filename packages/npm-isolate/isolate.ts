#!/usr/bin/env node

import type { ScopeCommandOptions } from './runner'
import type { GetPackagesOptions } from '@optimics/npm'

import fg from 'fast-glob'
import yargs, { Argv } from 'yargs'

import { log } from './cli.js'
import { exists, rmrf } from './fs.js'
import { JobRunner } from './jobs.js'
import { Package, Project } from './projects.js'
import { runScopeCommand } from './runner.js'
import { printPackages, printScopes } from './scopes.js'
import { getRoot } from '@optimics/npm'
import { join, relative } from 'path'
import { hideBin } from 'yargs/helpers'

interface IsolatePackagesOptions extends GetPackagesOptions {
  packages?: string[]
}

async function isolatePackages(argv: IsolatePackagesOptions): Promise<void> {
  const root = getRoot()
  const jobRunner = new JobRunner()
  const project = new Project(root, jobRunner)
  const available = project.filterPackages(argv)
  const toIsolate = resolvePackages(available, argv.packages)
  let products: string[] = []
  project.on('productAdded', ({ productPath }) => {
    products.push(productPath)
  })
  project.on('packageIsolated', () => {
    products.map((productPath: string) =>
      log(relative(process.cwd(), productPath), { clear: true, padding: 2 }),
    )
    products = []
  })

  const terminate = () => () => {
    project.cleanup()
  }

  process.on('exit', terminate())
  process.on('SIGTERM', terminate())
  process.on('SIGINT', terminate())
  await project.isolatePackages(toIsolate)
  project.cleanup()
}

function findMatchingPackage(available: Package[], pkg: string): Package {
  const match = available.find((availablePkg) => pkg === availablePkg.name)
  if (match) {
    return match
  }
  throw new Error(`Failed to find package "${pkg}"`)
}

function resolvePackages(
  available: Package[],
  packageList?: string[],
): Package[] {
  if (packageList?.length) {
    return packageList.map((arg) => findMatchingPackage(available, arg))
  }
  return available
}

async function cleanPackages() {
  const baseDir = getRoot()
  const formatPath = (...args: string[]) => join(baseDir, ...args)
  const verboseRemove = async (dir: string) => {
    process.stdout.write(`Remove ${relative(baseDir, dir)}\n`)
    await rmrf(dir)
  }

  const dirs = await Promise.all([formatPath('dist')].map(exists))
  const packages = (await fg('packages/*/*.(tgz|zip)')).filter(
    (path) => !path.match(/\/__/),
  )
  const dist = (await fg('packages/*/dist')).filter(
    (path) => !path.match(/\/__/),
  )
  const rmlist = [...dirs, ...packages, ...dist].filter(Boolean) as string[]

  if (rmlist.length > 0) {
    process.stdout.write(`Cleaning ${baseDir}\n`)
    for (const dir of rmlist) {
      await verboseRemove(dir)
    }
  } else {
    process.stdout.write('Nothing to do\n')
  }
}

const argv = await yargs(hideBin(process.argv))
  .help('h')
  .alias('h', 'help')
  .command('bundle [packages..]', 'bundle packages', (y: Argv) => {
    return y
      .positional('packages', {
        describe: 'list of packages',
      })
      .option('scope', {
        alias: 's',
        describe: 'project scope, like "@foo" or "foo"',
        string: true,
      })
  })
  .command('run [scope] [pkg]', 'run scripts on project scope', (y: Argv) => {
    return y
      .positional('scope', {
        describe: 'project scope, like "@foo" or "foo"',
      })
      .positional('pkg', {
        describe: 'package name',
      })
      .option('all', {
        alias: 'a',
        boolean: true,
        default: false,
      })
      .option('script', {
        alias: 's',
        default: 'dev',
        describe: 'run this npm script',
        string: true,
      })
  })
  .command('packages', 'work with packages', (y: Argv) => {
    return y
      .option('scope', {
        alias: 's',
        describe: 'filter packages from this scope',
        string: true,
      })
      .option('with-script', {
        alias: 'w',
        describe: 'filter scopes supporting this npm script',
        string: true,
      })
  })
  .command('scopes', 'work with project scopes', (y: Argv) => {
    return y.option('with-script', {
      alias: 'w',
      describe: 'filter scopes supporting this npm script',
      string: true,
    })
  })
  .command('clean', 'clean artifacts')
  .demandCommand().argv

const [command] = argv._

if (command === 'bundle') {
  await isolatePackages(argv as IsolatePackagesOptions)
} else if (command === 'run') {
  await runScopeCommand(argv as ScopeCommandOptions)
} else if (command === 'packages') {
  await printPackages(getRoot(), argv as GetPackagesOptions)
} else if (command === 'scopes') {
  await printScopes(getRoot(), argv as GetPackagesOptions)
} else if (command === 'clean') {
  await cleanPackages()
}
