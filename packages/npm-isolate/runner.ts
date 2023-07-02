import { execute, log } from './cli.js'
import { getPackageNames, getPackageScopes, getRoot } from '@optimics/npm'
import { join } from 'path'

function serializeFilter(filter: Record<string, unknown>): string {
  return JSON.stringify(filter)
}

function printAvailableScopes(script: string): void {
  const scopes = getPackageScopes(undefined, { withScript: script })
  log(`Available "${script}" project scopes:`)
  scopes.map((s) => log(s, { padding: 2 }))
}

function printAvailablePackages(scope: string, script: string): void {
  const scopes = getPackageNames(undefined, { scope, withScript: script })
  log(`Available "${script}" packages${scope ? ` from scope "${scope}"` : ''}:`)
  scopes.map((s) => log(s, { padding: 2 }))
}

export interface ScopeCommandOptions {
  all?: boolean
  scope?: string
  pkg?: string
  script?: string
}

export async function runScopeCommand(
  options: ScopeCommandOptions,
): Promise<void> {
  const { all, scope, pkg, script } = options
  if (!(pkg || all)) {
    printAvailablePackages(scope || '', script || 'dev')
    return
  }
  if (!(scope || all)) {
    printAvailableScopes(script || 'dev')
    return
  }
  const packages = getPackageNames(undefined, {
    scope,
    startsWith: pkg,
    withScript: script,
  })

  if (!packages.length) {
    log(
      `No packages after filtering for ${serializeFilter({
        scope,
        pkg,
        script,
      })}`,
    )
    process.exit(1)
  }

  log(`Starting ${packages.length} projects\n`)
  for (const pack of packages) {
    log(`* ${pack}\n`)
  }
  const baseDir = getRoot()
  const lerna = join(baseDir, 'node_modules', '.bin', 'lerna')
  const noPrefix = packages.length <= 1
  const lernaArgs = [
    'run',
    script,
    noPrefix && '--no-prefix',
    '--stream',
    '--parallel',
    ...packages.flatMap((p) => ['--scope', p]),
  ].filter(Boolean)
  await execute(lerna, lernaArgs as string[], { cwd: baseDir })
}
