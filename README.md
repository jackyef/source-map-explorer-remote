## Wrapper around [source-map-explorer](https://github.com/danvk/source-map-explorer) that works with remote URLs.

## Install:

```sh
npm install -g source-map-explorer-remote
```

## Usage

```sh
source-map-explorer-remote https://example.com/path/to/bundle-with-sourcemap.min.js
```

Usage with [chrome coverage json](https://twitter.com/chromedevtools/status/1095411723161354240?lang=en): 

## Difference with [remote-source-map-explorer](https://github.com/lencioni/remote-source-map-explorer)
This package use newer version of `source-map-explorer` that supports chrome code coverage.

## Note
This package is using its own patched version of `source-map-explorer` inside the repo. This will be updated once
[this issue](https://github.com/danvk/source-map-explorer/pull/154) is fixed.
