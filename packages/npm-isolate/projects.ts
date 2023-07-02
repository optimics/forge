import type { IsolateConfig } from './flags'
import type { Job, JobRunner } from './jobs'
import type { GetPackagesOptions, PackageJson } from '@optimics/npm'
import type { IDependencyMap } from 'package-json-type'
import type { FileResult } from 'tmp-promise'

import archiver from 'archiver'
import zlib from 'node:zlib'
import tar from 'tar'
import tmp from 'tmp-promise'

import { execute } from './cli.js'
import { PackageDoesNotExistError, PrivatePackageError } from './errors.js'
import { resolveFlags } from './flags.js'
import { ensureDir, ensureUnlink } from './fs.js'
import { packageProject } from './npm.js'
import { createPackageFilter, getPackages, readPackageJson } from '@optimics/npm'
import {
  copyFileSync,
  createReadStream,
  createWriteStream,
  readdirSync,
  writeFileSync,
} from 'fs'
import { copyFile, mkdir, stat } from 'fs/promises'
import { join } from 'path'
import { rimrafSync } from 'rimraf'

type EventHandlerProps = Record<string, string>
type EventHandler = (props: EventHandlerProps) => void

export class Package {
  backups: Record<string, FileResult> = {}
  done = false
  flags: IsolateConfig
  integratedDependencies: Package[] = []
  isolatedPackagePrefix = 'isolated-'
  manifest: PackageJson
  npmPackageExtractTempPath = ''
  npmPackagePathTemp = ''
  project: Project
  storedDependencies: string[] = []
  zipPackagePathTemp = ''

  static from(pkg: PackageJson | Package, project: Project) {
    if (pkg instanceof Package) {
      return pkg
    }
    return new this(pkg, project)
  }

  constructor(pkg: PackageJson, project: Project) {
    this.manifest = pkg
    this.flags = resolveFlags(pkg)
    this.project = project
    this.integratedDependencies = []
    this.isolatedPackagePrefix = 'isolated-'
    this.storedDependencies = []
  }

  get path(): string {
    return this.manifest.path
  }

  get root(): string {
    return this.manifest.root
  }

  get reporter() {
    return this.project.reporter
  }

  get name(): string {
    return this.manifest.name
  }

  get version(): string {
    return this.manifest.version || '0.0.0'
  }

  get dependencies(): IDependencyMap | undefined {
    return this.manifest.dependencies
  }

  set dependencies(value: IDependencyMap | undefined) {
    this.manifest = {
      ...this.manifest,
      dependencies: value,
    }
  }

  get safeName(): string {
    return this.name.replace('@', '').replace('/', '-')
  }

  get npmPackageNameDefault(): string {
    return `${this.safeName}-${this.version}.tgz`
  }

  get npmPackageName() {
    return this.flags.versionNeutral
      ? `${this.safeName}.tgz`
      : this.npmPackageNameDefault
  }

  get zipPackageName(): string {
    return this.flags.versionNeutral
      ? `${this.safeName}.zip`
      : `${this.safeName}-${this.version}.zip`
  }

  get npmPackagePathLocal(): string {
    return join(this.path, this.npmPackageName)
  }

  get npmPackagePathRoot(): string {
    return join(this.project.distPath, this.npmPackageName)
  }

  get zipPackagePathRoot(): string {
    return join(this.project.distPath, this.zipPackageName)
  }

  get zipPackagePathLocal(): string {
    return join(this.path, this.zipPackageName)
  }

  get depsPath(): string {
    return join(this.path)
  }

  get manifestLocation(): string {
    return join(this.path, 'package.json')
  }

  get manifestLockLocation(): string {
    return join(this.path, 'package-lock.json')
  }

  async backupFile(filePath: string): Promise<FileResult | null> {
    if (this.backups[filePath]) {
      return this.backups[filePath]
    }
    try {
      await stat(filePath)
    } catch (_e) {
      return null
    }
    const tmpFile = await tmp.file()
    this.project.addTemp(tmpFile.path)
    copyFileSync(filePath, tmpFile.path)
    this.backups[filePath] = tmpFile
    return tmpFile
  }

  async backupConfig(): Promise<void> {
    await Promise.all([
      this.backupFile(this.manifestLocation),
      this.backupFile(this.manifestLockLocation),
    ])
  }

  getLinkedDependencies(): Package[] {
    const required = Object.keys(this.dependencies || {})
    const available = this.project.getPackages()
    return available.filter((pkg) => required.includes(pkg.name))
  }

  async confirmPublishedVersion(dep: Package): Promise<Package> {
    if (dep.manifest.private) {
      throw new PrivatePackageError(
        `Cannot install ${dep.name}@${dep.version} because it is private`,
      )
    }
    try {
      await execute(
        'npm',
        ['show', `${dep.name}@${dep.version}`],
        {
          cwd: this.path,
        },
      )
      return dep
    } catch (e) {
      if (e?.code === 1) {
        throw PackageDoesNotExistError.fromError(e)
      }
      throw e
    }
  }

  async integrateDependency(dep: Package): Promise<Package | null> {
    try {
      await this.confirmPublishedVersion(dep)
      return null
    } catch (e) {
      if (
        e instanceof PrivatePackageError ||
        e instanceof PackageDoesNotExistError
      ) {
        await dep.isolate()
        return dep
      }
      throw e
    }
  }

  async integrateDependencies(deps: Package[]): Promise<void> {
    for (const dep of deps) {
      const result = await this.integrateDependency(dep)
      if (result) {
        this.integratedDependencies.push(result)
      }
    }
  }

  getDependencyPath(pkg: Package): string {
    return join(
      this.depsPath,
      `${this.isolatedPackagePrefix}${pkg.npmPackageName}`,
    )
  }

  async storeDependency(dep: Package): Promise<void> {
    await copyFile(dep.npmPackagePathTemp, this.getDependencyPath(dep))
    await this.storeDependencies(await dep.getLinkedDependencies())
  }

  async storeDependencies(dependencies: Package[]): Promise<void> {
    for (const dep of dependencies) {
      await this.storeDependency(dep)
    }
  }

  async storeIntegratedDependencies(): Promise<void> {
    if (this.integratedDependencies.length) {
      await ensureDir(this.depsPath)
    }
    this.storeDependencies(this.integratedDependencies)
  }

  storeManifest(): void {
    const JSON_PADDING = 2
    writeFileSync(
      this.manifestLocation,
      JSON.stringify(this.manifest, null, JSON_PADDING),
    )
  }

  referenceStoredDependency(dep: Package): void {
    const versionRef = `file:isolated-${dep.npmPackageName}`
    if (!this.dependencies) {
      this.dependencies = {}
    }
    this.dependencies[dep.name] = versionRef
  }

  referenceStoredDependencies(): void {
    const prevDeps = this.dependencies
    for (const dep of this.integratedDependencies) {
      this.referenceStoredDependency(dep)
    }
    this.storeManifest()
    this.dependencies = prevDeps
  }

  async isolateDeps(): Promise<void> {
    const linkedDeps = await this.getLinkedDependencies()

    if (linkedDeps.length) {
      await this.integrateDependencies(linkedDeps)
      await this.storeIntegratedDependencies()
      await this.referenceStoredDependencies()
    }
  }

  async pack(): Promise<void> {
    const dest = await packageProject(this.path, this.npmPackageNameDefault)
    this.npmPackagePathTemp = dest.path
    this.project.addTemp(dest.path)
  }

  async storeFile(src: string, dest: string): Promise<void> {
    await copyFile(src, dest)
    this.project.addProduct(dest)
  }

  async storeNpmPackage(): Promise<void> {
    if (this.flags.storeLocal) {
      await this.storeFile(this.npmPackagePathTemp, this.npmPackagePathLocal)
    }
    if (this.flags.storeRoot) {
      await this.storeFile(this.npmPackagePathTemp, this.npmPackagePathRoot)
    }
  }

  async storeZipPackage(): Promise<void> {
    if (this.flags.storeLocal) {
      await this.storeFile(this.zipPackagePathTemp, this.zipPackagePathLocal)
    }
    if (this.flags.storeRoot) {
      await this.storeFile(this.zipPackagePathTemp, this.zipPackagePathRoot)
    }
  }

  async extract(): Promise<void> {
    const dir = await tmp.dir()
    this.npmPackageExtractTempPath = dir.path
    this.project.addTemp(dir.path)
    await new Promise((resolve, reject) => {
      createReadStream(this.npmPackagePathTemp)
        .on('error', reject)
        .pipe(zlib.createUnzip())
        .pipe(
          tar.x({
            C: dir.path,
            strip: 1,
          }),
        )
        .on('finish', resolve)
    })
  }

  async zip(): Promise<void> {
    const file = await tmp.file({ postfix: this.zipPackageName })
    this.project.addTemp(file.path)
    this.zipPackagePathTemp = file.path
    const output = createWriteStream(file.path)
    const archive = archiver('zip')
    await new Promise((resolve, reject) => {
      output.on('close', resolve)
      output.on('error', reject)
      archive.directory(this.npmPackageExtractTempPath, false)
      archive.pipe(output)
      archive.finalize()
    })
  }

  getIsolatedPackages(): string[] {
    const files = readdirSync(this.depsPath)
    return files
      .filter((fileName) => fileName.startsWith('isolated'))
      .map((fileName) => join(this.depsPath, fileName))
  }

  restoreFile(targetPath: string, tmpFile: FileResult): void {
    copyFileSync(tmpFile.path, targetPath)
  }

  cleanup(): void {
    ensureUnlink(this.manifestLockLocation)
    const isolated = this.getIsolatedPackages()
    for (const pkgFile of isolated) {
      ensureUnlink(pkgFile)
    }
    for (const [filePath, tmpFile] of Object.entries(this.backups)) {
      this.restoreFile(filePath, tmpFile)
    }
    this.backups = {}
  }

  getBuildScript(): string | null {
    if (this.manifest?.scripts?.build) {
      return 'build'
    }
    if (this.manifest?.scripts?.compile) {
      return 'compile'
    }
    return null
  }

  async build() {
    const script = this.getBuildScript()
    if (script) {
      await execute('lerna', ['run', script, '--scope', this.name])
    }
  }

  nameJob(str: string): string {
    return `${str} ${this.name}`
  }

  runJobs(jobs: Job[]): Promise<void> {
    return this.reporter.runJobs(
      jobs.map((j) => ({
        ...j,
        name: this.nameJob(j.name),
      })),
    )
  }

  ignore(): Promise<void> {
    return this.runJobs([{ name: 'Ignore', fn: () => {} }])
  }

  pushIsolationTasks(jobs: Job[]): void {
    jobs.push({ name: 'Backup', fn: () => this.backupConfig() })
    jobs.push({ name: 'Isolate deps for', fn: () => this.isolateDeps() })
    jobs.push({ name: 'Package', fn: () => this.pack() })

    if (this.flags.packNpm) {
      jobs.push({ name: 'Store', fn: () => this.storeNpmPackage() })
    }

    if (this.flags.packRaw || this.flags.packZip) {
      jobs.push({ name: 'Extract', fn: () => this.extract() })
    }

    if (this.flags.packZip) {
      jobs.push({ name: 'Zip', fn: () => this.zip() })
      jobs.push({ name: 'Store Zip', fn: () => this.storeZipPackage() })
    }
  }

  async isolate(): Promise<void> {
    if (this.done) {
      return this.runJobs([{ name: 'Reuse', fn: () => {} }])
    }

    if (this.flags.ignore) {
      return this.ignore()
    }

    const jobs = []

    if (this.flags.build) {
      jobs.push({ name: 'Build', fn: () => this.build() })
    }

    if (this.flags.isolate) {
      this.pushIsolationTasks(jobs)
    }
    await this.runJobs(jobs)
    this.done = true
  }
}

export class Project {
  handlers: Record<string, EventHandler[]> = {}
  mappedPackages = null
  onProgress = null
  packages: Package[] = []
  products: string[] = []
  manifest: PackageJson
  reporter: JobRunner
  temp: string[] = []

  constructor(root: string, reporter: JobRunner) {
    this.manifest = readPackageJson(root)
    this.reporter = reporter
  }

  get path(): string {
    return this.manifest.root
  }

  getPackages(): Package[] {
    if (this.packages.length === 0) {
      this.packages = getPackages(this.path).map((p) => Package.from(p, this))
    }
    return this.packages
  }

  getPackageNames(): string[] {
    return this.getPackages().map((pkg) => pkg.name)
  }

  filterPackages(options: GetPackagesOptions): Package[] {
    const filter = createPackageFilter(options)
    const packages = this.getPackages()
    return filter ? packages.filter(filter) : packages
  }

  get distPath() {
    return join(this.path, 'dist')
  }

  addProduct(productPath: string): void {
    if (!this.products.includes(productPath)) {
      this.products.push(productPath)
      this.announce('productAdded', { productPath })
    }
  }

  addTemp(tempPath: string): void {
    this.temp.push(tempPath)
  }

  announce(event: string, props: EventHandlerProps) {
    const handlers = this.handlers[event]
    if (handlers) {
      for (const handler of handlers) {
        handler(props)
      }
    }
  }

  on(event: string, handler: EventHandler): void {
    if (!this.handlers[event]) {
      this.handlers[event] = []
    }
    this.handlers[event].push(handler)
  }

  async createDistDir() {
    await mkdir(this.distPath, { recursive: true })
  }

  async isolatePackages(pkgs: Package[]): Promise<void> {
    await this.reporter.runJobs(
      pkgs.map((pkg: Package) => ({
        name: `Isolate ${pkg.name}`,
        big: true,
        fn: async () => {
          await this.isolatePackage(pkg)
        },
        after: () => {
          this.announce('packageIsolated', { name: pkg.name })
        },
      })),
    )
  }

  cleanup() {
    for (const pkg of this.packages) {
      pkg.cleanup()
    }
    for (const tmpPath of this.temp) {
      rimrafSync(tmpPath)
    }
  }

  async isolatePackage(pkg: Package): Promise<Package> {
    if (pkg.done) {
      return pkg
    }
    await this.createDistDir()
    await pkg.isolate()
    return pkg
  }

  reportProgress() {}
}
