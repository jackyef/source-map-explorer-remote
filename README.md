## What is this?
Wrapper around [source-map-explorer](https://github.com/danvk/source-map-explorer) that works with remote URLs and chrome code coverage.

## Install:

```sh
npm install -g source-map-explorer-remote
```

## Usage

```sh
source-map-explorer-remote https://example.com/path/to/bundle-with-sourcemap.min.js
```

Usage with [chrome coverage json](https://twitter.com/chromedevtools/status/1095411723161354240?lang=en): 

```sh
source-map-explorer-remote https://example.com/path/to/bundle-with-sourcemap.min.js --coverage ./path/to/coverage.json
```

_Example_
![example-result-with-coverage](https://user-images.githubusercontent.com/7252454/71998874-f1a4ee80-3272-11ea-9369-1bc7a4dbed4e.png)

## Difference with [remote-source-map-explorer](https://github.com/lencioni/remote-source-map-explorer)
This package use newer version of `source-map-explorer` that supports chrome code coverage.
