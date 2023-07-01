import type { FileResult } from 'tmp-promise'

import { execute } from './cli.js'
import { rmrf } from './fs.js'
import { rename } from 'fs/promises'
import { join } from 'path'
import { dir, file } from 'tmp-promise'

export async function packageProject(
  cwd: string,
  packageName: string,
): Promise<FileResult> {
  const tmpDir = await dir()
  const dest = await file({ postfix: packageName })
  await execute('npm', ['pack', '--pack-destination', tmpDir.path], {
    cwd,
  })
  await rename(join(tmpDir.path, packageName), dest.path)
  await rmrf(tmpDir.path)
  return dest
}
