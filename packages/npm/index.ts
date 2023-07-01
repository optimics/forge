import type { IPackageJson, IScriptsMap } from 'package-json-type'

import { execSync } from 'child_process'
import { lstatSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
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

export function getRoot(cwd?: string): string {
  return execSync('npm prefix', { cwd: cwd && urlToCwd(cwd) })
    .toString()
    .trim()
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

export function extractPackageName(p: PackageJson | string): string {
  if (typeof p === 'string') {
    return p.split('/')[1]
  }
  return p.name.split('/')[1]
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

export function createPackageFilter(options: GetPackagesOptions): PackageFilter | null {
  const { scope, startsWith, withScript } = options
  if (!(scope || startsWith || withScript)) {
    return null
  }
  return function(p: PackageLike) {
    let result = true
    if (scope) {
      const projectScope = padScope(scope)
      result = p.name.startsWith(`${projectScope}/`)
    }
    if (startsWith) {
      result = result && extractPackageName(p).startsWith(startsWith)
    }
    if (withScript) {
      result = result && Boolean(p.scripts && p.scripts[withScript])
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
