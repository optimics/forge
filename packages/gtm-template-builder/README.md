# `@optimics/gtm-template-builder`

> Build Google Tag Manager with at least minimal verification

GTM templates are very trashy product, so we have this package to at least
verify the integrity of the template file, before shipping it. It is also
capable of auto-generating the changeNots from repository metada, supporting
the multirepository structure.

## Requirements

This library runs [git](https://git-scm.com/) using the OS shell. Without git
installed and configured, this will not work at all.

## Usage

```
npm install --save-dev @optimics/gtm-template-builder
```

Create directory with following files, that will be mapped to the template

```
| info.json
| parameters.json
| code.sjs
| permissions.json
```

Build the template

```
import { buildTemplate } from '@optimics/gtm-template-builder'
buildTemplate('/path/to/the/src/directory', '/tmp/my-out-file.tpl')
```

After you committed the template to the repository, create the metadata.yml
file

```
import { buildMetadata } from '@optimics/gtm-template-builder'
buildMetadata('/path/to/the/template.tpl', '/tmp/metadata.yml')
```

The `homepage` and `documentation` is read from the 'package.json' file in the
repository.
