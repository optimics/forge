import type { IPackageJson, IScriptsMap } from 'package-json-type'

import { execSync } from 'child_process'
import { lstatSync, readFileSync } from 'fs'
import { dirname, join, sep } from 'path'
import { fileURLToPath } from 'url'

export type ScriptsMap = IScriptsMap & {
  [scriptName: string]: string
}

interface PackageLike {
  readonly name: string // enforce package name
  readonly root: string // absolute path to the multirepository root
  readonly scripts?: ScriptsMap
}

export type PackageJson = IPackageJson & PackageLike

function query(cmd: string, cwd?: string): PackageJson[] {
  return JSON.parse(execSync(cmd, { cwd }).toString())
}

export function urlToPath(url: string): string {
  return url.includes('://') ? fileURLToPath(url) : url
}

export function urlToCwd(url: string): string {
  const pathSrc = urlToPath(url)
  return lstatSync(pathSrc).isDirectory() ? pathSrc : dirname(pathSrc)
}

function getPrefix(cwd?: string): string {
  return execSync('npm prefix', { cwd }).toString().trim()
}

export function getRoot(cwd?: string): string {
  const rawCwd = cwd && urlToCwd(cwd)
  const prefix = getPrefix(rawCwd)
  /* npm prefix returns path, that goes to the first directory containing
   * node_modules, however, we want to get the monorepository root even from
   * node_modules, so we just get the prefix and then trim the path to the top
   * level directory containing node_modules */
  const prefixSplit = prefix.split(sep)
  const modulesIndex = prefixSplit.indexOf('node_modules')
  if (modulesIndex === -1) {
    return prefix
  }
  return prefixSplit.slice(0, modulesIndex).join(sep)
}

function appendRoot(root: string, pkg: PackageJson): PackageJson {
  return { ...pkg, root }
}

function createFormatter(cwd?: string) {
  const root = getRoot(cwd)
  return function (pkg: PackageJson): PackageJson {
    return appendRoot(root, pkg)
  }
}

export function filterUnique<T>(item: T, index: number, src: T[]): boolean {
  return src.indexOf(item) === index
}

export function extractProjectScope(p: PackageJson): string {
  return p.name.split('/')[0]
}

function extractPackageNameFromString(p: string): string {
  return p.split('/').reverse()[0]
}

export function extractPackageName(p: PackageJson | string): string {
  if (typeof p === 'string') {
    return extractPackageNameFromString(p)
  }
  return extractPackageNameFromString(p.name)
}

export function padScope(scope: string): string | null {
  if (!scope) {
    return null
  }
  return scope.startsWith('@') ? scope : `@${scope}`
}

export interface GetPackagesOptions {
  scope?: string
  startsWith?: string
  withScript?: string
}

type PackageFilter = (p: PackageLike) => boolean

export function createPackageFilter(
  options: GetPackagesOptions,
): PackageFilter | null {
  const { scope, startsWith, withScript } = options
  if (!(scope || startsWith || withScript)) {
    return null
  }
  return function (p: PackageLike) {
    let result = true
    if (scope) {
      const projectScope = padScope(scope)
      result = p.name.startsWith(`${projectScope}/`)
    }
    if (startsWith) {
      result = result && extractPackageName(p).startsWith(startsWith)
    }
    if (withScript) {
      result = result && Boolean(p?.scripts?.[withScript])
    }
    return result
  }
}

export function getPackages(
  cwd?: string,
  options: GetPackagesOptions = {},
): PackageJson[] {
  const packages = query('npm query .workspace', cwd).map(createFormatter(cwd))
  const filter = createPackageFilter(options)
  if (filter) {
    return packages.filter(filter)
  }
  return packages
}

export function getPackageNames(
  cwd?: string,
  options: GetPackagesOptions = {},
): string[] {
  return getPackages(cwd, options).map((p) => p.name)
}

export function getPackageScopes(
  cwd?: string,
  options: GetPackagesOptions = {},
): string[] {
  const packages = getPackages(cwd, options)
  return packages.map(extractProjectScope).filter(filterUnique)
}

export function getPackageJsonByName(
  cwd: string,
  packageName: string,
): PackageJson {
  return appendRoot(
    getRoot(cwd),
    query(`npm query [name="${packageName}"]`, cwd)[0],
  )
}

export function readPackageJson(cwd: string): PackageJson {
  return appendRoot(
    getRoot(cwd),
    JSON.parse(readFileSync(join(cwd, 'package.json')).toString()),
  )
}
