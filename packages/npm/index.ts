import type { IPackageJson } from 'package-json-type'

import { execSync } from 'child_process'
import { lstatSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

export interface PackageJson extends IPackageJson {
  readonly name: string // enforce package name
  readonly root: string // absolute path to the multirepository root
}

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

export function getPackages(cwd?: string): PackageJson[] {
  return query('npm query .workspace', cwd).map(createFormatter(cwd))
}

export function getPackageNames(cwd?: string): string[] {
  return getPackages(cwd).map((p) => p.name)
}

export function getPackageJsonByName(
  cwd: string,
  packageName: string,
): PackageJson {
  return appendRoot(
    getRoot(cwd),
    query(`npm query [name="${packageName}"]`, cwd)[0]
  )
}

export function readPackageJson(cwd: string): PackageJson {
  return appendRoot(
    getRoot(cwd),
    JSON.parse(readFileSync(join(cwd, 'package.json')).toString()),
  )
}
