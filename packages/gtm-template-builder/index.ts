import { execSync } from 'child_process'
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { dirname, join, relative } from 'path'
import { stringify } from 'yaml'

interface TemplateVersion {
  sha: string
  changeNotes: string
}

interface TemplateMetadata {
  homepage: string
  documentation: string
  versions: TemplateVersion[]
}

type TemplateSectionHeader =
  | '___INFO___'
  | '___TEMPLATE_PARAMETERS___'
  | '___SANDBOXED_JS_FOR_WEB_TEMPLATE___'
  | '___WEB_PERMISSIONS___'

interface TemplateSection {
  header: TemplateSectionHeader
  content: string
}

export function serializeMetadataContent(params: TemplateMetadata) {
  const { homepage, documentation, versions } = params
  return stringify({
    homepage,
    documentation,
    versions: versions,
  })
}

export function serializeTemplateContent(sections: TemplateSection[]): string {
  return sections
    .map((section) => `${section.header}\n\n${section.content}`)
    .join('\n\n')
}

function getVersionChanges(
  packageRoot: string,
  refStart: string,
  refEnd: string,
): string {
  const range = `${refStart}..${refEnd}`
  const cmd = `git log --pretty=format:%s ${range} -- ${packageRoot}`
  return execSync(cmd, { cwd: packageRoot }).toString()
}

function isTagRelatedToFile(
  filePath: string,
  repoRoot: string,
  tag: string,
): boolean {
  const relativePath = relative(repoRoot, filePath)
  const tree = execSync(`git ls-tree --name-only -r ${tag}`, { cwd: repoRoot })
    .toString()
    .split('\n')
  return tree.includes(relativePath)
}

/** This will return all the repository tags, that contain changes to the
 * template file, thus creating list of template versions, that can be
 * processed further. */
export function listFileRelatedTags(filePath: string): string[] {
  const repoRoot = dirname(filePath)
  return execSync('git tag', { cwd: repoRoot })
    .toString()
    .split('\n')
    .filter((tag) => tag && isTagRelatedToFile(filePath, repoRoot, tag))
}

export function listTemplateVersions(templateFile: string): TemplateVersion[] {
  const tags = listFileRelatedTags(templateFile)
  const packageRoot = dirname(templateFile)
  const versions: TemplateVersion[] = []
  let currentTag = execSync('git rev-list --max-parents=0 HEAD', {
    cwd: packageRoot,
  })
    .toString()
    .trim()
  while (currentTag) {
    const nextTag = tags.length > 0 ? tags[0] : 'HEAD'
    const changeNotes = getVersionChanges(
      packageRoot,
      currentTag,
      nextTag,
    ).trim()
    if (changeNotes) {
      versions.push({
        sha: execSync(`git rev-parse ${nextTag}`, { cwd: packageRoot })
          .toString()
          .trim(),
        changeNotes,
      })
    }
    currentTag = tags.shift() || ''
  }
  return versions
}

export function buildTemplateMetadataContent(
  templateFile: string,
  packageJsonPath: string,
): string {
  const versions = listTemplateVersions(templateFile)
  const packageJson = JSON.parse(
    readFileSync(packageJsonPath).toString().trim(),
  )
  return serializeMetadataContent({
    documentation: packageJson?.documentation || '',
    homepage: packageJson?.homepage || '',
    versions,
  })
}

function loadSectionContent(sourceFile: string): string {
  let content = readFileSync(sourceFile).toString().trim()
  if (sourceFile.endsWith('.json')) {
    content = JSON.stringify(JSON.parse(content), null, 2)
  }
  return content
}

export function buildTemplateContent(sections: TemplateSection[]): string {
  return serializeTemplateContent(sections)
}

interface SectionMap {
  [key: string]: TemplateSectionHeader
}

const sectionMap: SectionMap = {
  'info.json': '___INFO___',
  'parameters.json': '___TEMPLATE_PARAMETERS___',
  'code.sjs': '___SANDBOXED_JS_FOR_WEB_TEMPLATE___',
  'permissions.json': '___WEB_PERMISSIONS___',
}

export function buildMetadata(
  templateFile: string,
  packageJson: string,
  outFile: string,
): void {
  writeFileSync(
    outFile,
    buildTemplateMetadataContent(templateFile, packageJson),
  )
}

interface BuildEnv {
  [key: string]: string
}

function replaceEnv(content: string, env: BuildEnv): string {
  let replaced = content
  for (const [key, value] of Object.entries(env)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    replaced = replaced.replace(regex, value)
  }
  return replaced
}

export function buildTemplate(
  srcDir: string,
  outFile: string,
  env: BuildEnv,
): void {
  const keys = Object.keys(sectionMap)
  const dirList = readdirSync(srcDir).filter((f) => keys.includes(f))
  const content = buildTemplateContent(
    dirList.map((fileName) => ({
      header: sectionMap[fileName],
      content: loadSectionContent(join(srcDir, fileName)),
    })),
  )
  writeFileSync(outFile, replaceEnv(content, env))
}
