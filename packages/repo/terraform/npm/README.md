# Terraform `npm` reader

> Read information about npm package and provide commonly used outputs

## Usage

We assume, that the `npm` module is used from the same directory as the
package, that is being deployed, therefore we use `root = path.module`.

We assume, that each `npm` package has a single build artifact.

We usually put commonly shared properties into variable `common`. The `npm`
module uses `dist_dir` and `production` from the `common` object.

```terraform

module "npm" {
  common = var.common
  root   = path.module
  source = "github.com/optimics/forge/packages/repo/terraform/npm"
}

module "mymodule" {
  image = module.npm.docker_image_name
  name  = module.npm.ident
}
```

## Arguments / Inputs

### `source`

The source is [defined by
Terraform](https://developer.hashicorp.com/terraform/language/modules/sources).
Using the Github value will work, but cannot guarantee repeatable deployments.

```  
source = "github.com/optimics/forge/packages/repo/terraform/npm"
```

Better solution would be to use local URL, given you can afford to install npm
modules in the deployment step of your pipeline.

```
source = "node_modules/@optimics/repo/terraform/npm"
```

@TODO: The best solution would be to publish this module.

### `common`

Commonly shared properties of this terraform project. The `npm` module uses
`dist_dir` and `production` from the `common` object.


```
{
  dist_dir   = string,
  production = bool,
}
```

* `dist_dir` will be used as a prefix to all the output paths
* `production` given true, it will use package version, otherwise it will
  append git commit hash to the version number

Most usually, we just pass the `common` variable around like this.

```
common = var.common
```

It is possible to pass the values directly.

```
common = {
  dist_dir   = "/home/user/work/dist",
  production = false,
}
```

### `root`

This is path to the directory containing the `package.json`. Most usually, we
just pass it the `path.module`, because we put the deployment instructions into
the package directory.

```
root = path.module
```

## Attributes / Outputs

### `artifact_name`

The full name of expected package artifact. It is good to be used in the place,
where you store your ready-to-deploy artifacts. For example

```
package-scope-package-name-0.0.1.zip
```

### `description`

The description, as written in the `package.json`.

### `dist_dir`

Path to the distribution directory of this package. For example

```
/home/user/work/dist/package-scope-package-name
```

### `docker_image_name`

If there is a `Dockerfile` in the package directory, the module will provide an
expected Docker image name. For example:

```
package-scope-package-name:0.0.1
```

### `ident`

Unique package identification in the project. We assume, that you might want to
use project with multiple environments per single GCP project, so it is
prefixed with terraform workspace. For example:

```
"le-package-scope-package-name"
```

We use `le` as short for `live`.

### `ident_url`

Identificator, that is more useful in URLs, like bucket URLs.

```
"le/package-scope-package-name"
```

### `name`

Package name, without the package scope. For example
`"@package-scope/package-name"` would get transformed to:

```
"package-name"
```

### `pkg_ident`

Package name, with the package scope. For example
`"@package-scope/package-name"` would get transformed to:

```
"package-scope-package-name"
```

### `revision`

The commit hash:

```
"dc3cfc0c0f3d8f50e20ca8e2b010676531875753"
```

### `version`

The package version used to mark artifacts and resources. This changes based on
the `production` argument. Given `production` is `true`, it will yield just the
`package.json`'s version. Otherwise, it will use the version and append the
commit hash to it.

Production example:

```
0.0.1
```

Non-production example:

```
0.0.1+dc3cfc0c0f3d8f50e20ca8e2b010676531875753
```

### `zip_name`

Name of a zip file generated for this package in the `dist_dir`.

### `zip_path`

Path to the zip file generated in the `dist_dir`.
