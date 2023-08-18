import { log } from './cli.js'
import {
  GetPackagesOptions,
  extractPackageName,
  getPackageNames,
  getPackageScopes,
} from '@optimics/npm'

export function printScopes(cwd: string, options?: GetPackagesOptions): void {
  getPackageScopes(cwd, options).map((s: string) => log(s))
}

export function printPackages(cwd: string, options?: GetPackagesOptions): void {
  const packages = getPackageNames(cwd, options)
  const noScope = Boolean(options?.scope)
  packages.map((p: string) => log(noScope ? extractPackageName(p) : p))
}
