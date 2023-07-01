import { unlinkSync } from 'fs'
import { access, mkdir } from 'fs/promises'
import { rimraf } from 'rimraf'

export const rmrf = rimraf

export async function ensureDir(path: string): Promise<void> {
  try {
    await mkdir(path)
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e
    }
    // Assume directory already exists
  }
}

export function ensureUnlink(path: string): void {
  try {
    unlinkSync(path)
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e
    }
  }
}

export async function exists(path: string): Promise<string | null> {
  try {
    await access(path)
    return path
  } catch (e) {
    if (e.code === 'ENOENT') {
      return null
    }
    throw e
  }
}
