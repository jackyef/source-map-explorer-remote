#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const { docopt } = require('docopt');
const request = require('request');
const temp = require('temp');
const open = require('opn');
const sourceMapExplorer = require('source-map-explorer');

const { version } = require('./package.json');

const URL_ARG = '<url.js>';
const COVERAGE_ARG = '<coverage.json>';

const doc = `Fetch a remote JavaScript file and its sourcemap, and generate a source-map-explorer visualization. Also supports chrome coverage.json

Usage:
  source-map-coverage ${URL_ARG} --coverage ${COVERAGE_ARG}

Options:
  -h --help  Show this screen.
  --version  Show version.
`;

const args = docopt(doc, { version });
const scriptURL = new URL(args[URL_ARG]);
const coverageJson = !args[COVERAGE_ARG].startsWith('/')
  ? path.resolve(process.cwd(), args[COVERAGE_ARG])
  : args[COVERAGE_ARG];

// Fetch file and source map
function get(uri) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      uri,
      gzip: true,
    };

    request(options, (error, response, body) => {
      if (error) {
        reject(error);
        return;
      }

      if (response.statusCode !== 200) {
        reject(`Request failed.\nStatus code: ${response.statusCode}`);
        return;
      }

      resolve(body);
    });
  });
}

console.log(`Fetching ${scriptURL}...`);

get(scriptURL)
  .then(scriptBody => {
    // Look for sourceMappingURL
    const lastLine = scriptBody.slice(scriptBody.lastIndexOf('\n') + 1);

    const searchToken = '//# sourceMappingURL=';

    if (!lastLine.startsWith(searchToken)) {
      throw new Error('sourceMappingURL not found');
    }

    const sourceMappingURL = new URL(
      lastLine.slice(searchToken.length),
      scriptURL,
    );

    console.log(`Fetching ${sourceMappingURL}...`);
    return get(sourceMappingURL)
      .then(sourceMapBody => {
        console.log('Generating visualization HTML...');

        const tempJs = temp.path({ suffix: '.js' });
        fs.writeFileSync(tempJs, scriptBody);
        const tempMap = temp.path({ suffix: '.js.map' });
        fs.writeFileSync(tempMap, sourceMapBody);

        const result = sourceMapExplorer.explore(
          [
            {
              code: tempJs,
              map: tempMap,
            },
          ],
          {
            output: { format: 'html' },
            coverage: coverageJson ? coverageJson : undefined,
          },
        );

        return result;
      })
      .then(result => {
        console.log({ result });
        // console.log({ errors: result.errors });
        // console.log({ bundles: result.bundles });
        process.exit(123);

        const { output } = result;

        var tempName = temp.path({ suffix: '.html' });
        fs.writeFileSync(tempName, output);

        console.log('Opening visualization in browser...');
        open(tempName, function(error) {
          if (!error) {
            return;
          }

          throw new Error(`Unable to open web browser. ${tempName}`);
        });
      })
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .then(() => {
    console.log('All done, enjoy your visualization!');
    process.exit(0);
  });
