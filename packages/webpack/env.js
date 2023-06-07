export const getMode = (env) => {
  return env.NODE_ENV === 'production' ? 'production' : 'development'
}

export const getEnvName = () => {
  if (process.env.BITBUCKET_BRANCH === 'master') {
    return 'STAGING'
  }
  if (process.env?.BITBUCKET_TAG?.match(/^v[0-9]+\.[0-9]+\.[0-9]+.*/)) {
    return 'PRODUCTION'
  }
  return null
}

export const getBranchVars = () => {
  const envName = getEnvName()
  const prefix = `${envName}_`
  const prefixed = Object.fromEntries(
    Object.entries(process.env)
      .map(([name, value]) => {
        return name.startsWith(prefix)
          ? [name.substring(prefix.length), value]
          : null
      })
      .filter(Boolean),
  )
  return {
    ...process.env,
    ...prefixed,
  }
}

export const squashBranchVars = () => {
  process.env = getBranchVars()
}
