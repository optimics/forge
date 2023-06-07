# `@optimics/repo`

> Configure typical Optimics multirepository with a single dependency

This library should be used as a toolchain dependency, to avoid specifying
exact dependencies on various toolchains and make our developer's lives easier.

We do not want to use other common toolchains, because we have specific use
cases, that are derived from the world of Data Analytics.

## Use cases

Use this for your monorepo/multirepo, if at least one of the following applies
to your JavaScript project.

* It is a Cloud Function code
* It is a Cloud Run code
* It is a Google Tag Manager library code
* It is a Google Analytics library code

## Examples

See the [examples](./examples) directory.

## Contents

The list of contents is open for debate and each of the tools should be
defended before it is added.

### Lerna

We want to have small amount of larger repositories rather than large amount of
smaller repositories. Large amount of repositories brings in maintenance cost
and the small repositories go out of maintenance cycle very quickly. The result
is a massive junkyard of code, that is never going to be maintained and even
used.
Lerna helps us to structure code into multirepositories.
    
* [lerna](https://www.npmjs.com/package/lerna) - Lerna base package
* [lerna-isolate](https://www.npmjs.com/package/lerna-isolate) - Isolate private package artifacts

### TypeScript

We disccused using TypeScript on developer meetings and agreed, that it is
useful even for the world of Data Analytics. Using it by default is the best
way, to leverage it's full power.
    
* [typescript](https://www.npmjs.com/package/typescript) - TypeScript base package

### Babel

We need to use Babel to enrich our support of environments. It might not be
convenient to write all the code in TypeScript. Babel helps us to normalize the
code, that comes both out of TypeScript transpiler and the JavaScript modules.

* [@babel/preset-env](https://www.npmjs.com/package/@babel/preset-env) - Configure Babel build environment
* [@babel/preset-typescript](https://www.npmjs.com/package/@babel/preset-typescript) - Configure TypeScript with Babel

### Jest

We use Jest as our primary testing tool.

* [jest](https://www.npmjs.com/package/jest) - Jest base package
* [jest-environment-jsdom](https://www.npmjs.com/package/jest-environment-jsdom) - JSDOM environment as default, because most of our code lives in the browser
* [jest-watch-typeahead](https://www.npmjs.com/package/jest-watch-typeahead) - Autosuggestions for your interactive test filter
* [jest-watch-select-projects](https://www.npmjs.com/package/jest-watch-select-projects) - Interactively select which projects you want to test
* [lerna-jest](https://www.npmjs.com/package/lerna-jest) - Configure repo packages as separate test suites
* [ts-jest](https://www.npmjs.com/package/ts-jest) - Allow parsing Jest TypeScipt tests
* [@types/jest](https://www.npmjs.com/package/@types/jest) - Allow typing Jest tests

### Rome

Rome is the next generation linter and formatter written in Rust.

* [rome](https://www.npmjs.com/package/rome) - Rome base package

### Commitlint

* [commitlint](https://www.npmjs.com/package/commitlint) - Commitlint base package
* [@commitlint/config-conventional](https://www.npmjs.com/package/@commitlint/config-conventional) - Test commit messages agains [Conventional Commits Convention](https://conventionalcommits.org/)
