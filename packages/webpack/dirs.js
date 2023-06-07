import { Project } from '@lerna/project'
import { join, resolve } from 'path'

const project = new Project()
const baseDir = project.rootPath

export const getDistDir = () => resolve(baseDir, 'dist')
export const getSafeName = (name) => name.replace(/^@/, '').replace(/\//g, '-')
export const getPackageDistDir = (name) => join(getDistDir(), getSafeName(name))
