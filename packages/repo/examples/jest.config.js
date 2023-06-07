import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { guessRootConfig } from 'lerna-jest'

const baseDir = dirname(fileURLToPath(import.meta.url))
const config = guessRootConfig(baseDir)

// Workaround potential memory leaks
// https://jestjs.io/docs/configuration/#workeridlememorylimit-numberstring
config.workerIdleMemoryLimit = '300MB'

// Avoid testing jest bindings
config.projects = config.projects.filter(p => !p.displayName.includes('\/jest'))

export default config
