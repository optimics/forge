# `@optmics/npm`

> Useful methods that extend `npm` functionality

## Method collection


### urlToPath(url: string): string

Translate the `url` using fileURLToPath when it contains url prefixed with
protocol, otherwise it return the url unchanged, assuming, it is a file path.

```javascript
urlToPath('file:///home/user/test.js')
// /home/user/test.js

urlToPath('/home/user/test.js')
// /home/user/test.js
```

### urlToCwd(url: string): string

Translate `url` to nearest directory path.

```javascript
urlToPath('file:///home/user/test.js')
// /home/user

urlToPath('/home/user/')
// /home/user

urlToPath('/home/user')
// /home/user
```

### getRoot(cwd?: string): string

Return **monorepository root**. The directory, that contains your root package.json.

```javascript
getRoot()
// /home/user/path/to/monorepo
```

### filterUnique<T>(item: T, index: number, src: T[]): boolean

Array helper method, that filters unique elements

```
[1,2,2,3].filter(filterUnique)
// [1,2,3]
```

### extractProjectScope(p: PackageJson): string

Extracts the project scope from the package.json manifest.

```
'@myscope/mypackage' -> '@myscope'
```

### extractPackageName(p: PackageJson | string): string

Extracts package name from the package.json manifest or package name.

```
'@myscope/mypackage' -> 'mypackage'
```

### padScope(scope: string): string | null

Append at sign ('@') to the project scope, if it is missing

```
'myscope' -> '@myscope'
```

### getPackages(cwd?: string, options: GetPackagesOptions = {}): PackageJson[]

Get manifests of all packages defined in the monorepository.

### getPackageNames(cwd?: string, options: GetPackagesOptions = {}): string[]

Get list of all package names defined in the monorepository.

### getPackageScopes(cwd?: string, options: GetPackagesOptions = {}): string[]

Get list of all package scopes defined in the monorepository.

### getPackageJsonByName(cwd: string, packageName: string): PackageJson

Get `package.json` by package name.

### readPackageJson(cwd: string): PackageJson

Read package JSON in a directory path.
