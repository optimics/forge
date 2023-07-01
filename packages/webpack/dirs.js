import { getRoot } from '@optimics/npm'
import { join, resolve } from 'path'

export const getDistDir = () => resolve(getRoot(import.meta.url), 'dist')
export const getSafeName = (name) => name.replace(/^@/, '').replace(/\//g, '-')
export const getPackageDistDir = (name) => join(getDistDir(), getSafeName(name))
