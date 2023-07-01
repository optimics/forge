import type { PackageJson } from '@optimics/npm'
import type { ProjectConfig } from './types'

import { dirname, join } from 'path'
import {
  getSetupFiles,
  getSetupFilesAfterEnv,
  getTransforms,
  testPluginExistence,
} from './plugins.js'
import { configureSuite } from './suite.js'
import { fileURLToPath } from 'url'

const baseDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const testMatch = [
  '<rootDir>/**/__tests__/*.{cjs,js,jsx,mjs}',
  '<rootDir>/**/__tests__/*.{ts,tsx,cts,mts,ctsx,mtsx}',
]
    
const mockExtensions = [
  'md',
  'jpg',
  'ico',
  'jpeg',
  'png',
  'gif',
  'eot',
  'otf',
  'webp',
  'ttf',
  'woff',
  'woff2',
  'mp4',
  'webm',
  'wav',
  'mp3',
  'm4a',
  'aac',
  'oga',
  'svg',
]

function getMockList(pkg: PackageJson): string[] {
  const hasSvgTransformer = (
    testPluginExistence(pkg.root, 'jest-svg-transformer') || 
    testPluginExistence(pkg.root, 'jest-transformer-svg')
  )
  return hasSvgTransformer
    ? mockExtensions.filter(e => e === 'svg')
    : mockExtensions
}

export function configureIntegration(pkg: PackageJson): ProjectConfig {
  const mockPath = join(baseDir, '__mocks__', 'fileMock.mjs')
  const mockList = getMockList(pkg).reduce(
    (aggr, ext) => Object.assign(aggr, { [`\\.${ext}$`]: mockPath }),
    {}
  )
  const cfg = configureSuite(pkg, 'test', {
    testMatch,
    moduleNameMapper: mockList,
    transform: getTransforms(pkg),
    setupFiles: getSetupFiles(pkg),
    setupFilesAfterEnv: getSetupFilesAfterEnv(pkg),
  })
  if (pkg?.jest?.testEnvironment) {
    cfg.testEnvironment = pkg.jest.testEnvironment
  }
  if (pkg?.jest?.testEnvironmentOptions) {
    cfg.testEnvironmentOptions = pkg.jest.testEnvironmentOptions
  }
  return cfg
}
