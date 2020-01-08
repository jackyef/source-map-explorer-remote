#!/usr/bin/env node
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.logError = logError;
exports.logWarn = logWarn;
exports.logInfo = logInfo;

var _yargs = _interopRequireDefault(require('yargs'));

var _fs = _interopRequireDefault(require('fs'));

var _temp = _interopRequireDefault(require('temp'));

var _open = _interopRequireDefault(require('open'));

var _chalk = _interopRequireDefault(require('chalk'));

var _lodash = require('lodash');

var _api = require('./api');

var _appError = require('./app-error');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function parseArguments() {
  const argv = _yargs.default
    .strict()
    .scriptName('source-map-explorer')
    .usage('Analyze and debug space usage through source maps.')
    .usage('Usage:')
    .usage(
      '$0 script.js [script.js.map] [--json [result.json] | --html [result.html] | --tsv [result.csv]] [-m | --only-mapped] [--exclude-source-map] [--replace=BEFORE_1 BEFORE_2 --with=AFTER_1 AFTER_2] [--no-root] [--version] [--help | -h]'
    )
    .example('$0 script.js script.js.map', 'Explore bundle')
    .example('$0 script.js', 'Explore bundle with inline source map')
    .example('$0 dist/js/*.*', 'Explore all bundles inside dist/js folder')
    .example('$0 script.js --tsv', 'Explore and output result as TSV to stdout')
    .example('$0 script.js --json result.json', 'Explore and save result as JSON to the file')
    .demandCommand(1, 'At least one js file must be specified')
    .options({
      json: {
        type: 'string',
        description:
          'If filename specified save output as JSON to specified file otherwise output to stdout.',
        conflicts: ['tsv', 'html'],
      },
      tsv: {
        type: 'string',
        description:
          'If filename specified save output as TSV to specified file otherwise output to stdout.',
        conflicts: ['json', 'html'],
      },
      html: {
        type: 'string',
        description:
          'If filename specified save output as HTML to specified file otherwise output to stdout rather than opening a browser.',
        conflicts: ['json', 'tsv'],
      },
      'only-mapped': {
        alias: 'm',
        type: 'boolean',
        description:
          'Exclude "unmapped" bytes from the output. This will result in total counts less than the file size',
      },
      'exclude-source-map': {
        type: 'boolean',
        description: 'Exclude source map comment size from output',
      },
      'no-root': {
        type: 'boolean',
        description:
          'To simplify the visualization, source-map-explorer will remove any prefix shared by all sources. If you wish to disable this behavior, set --no-root.',
      },
      replace: {
        type: 'string',
        array: true,
        description:
          'Apply a simple find/replace on source file names. This can be used to fix some oddities with paths that appear in the source map generation process. Accepts regular expressions.',
        implies: 'with',
      },
      with: {
        type: 'string',
        array: true,
        description: 'See --replace.',
        implies: 'replace',
      },
      coverage: {
        type: 'string',
        normalize: true,
        description:
          'If the path to a valid a chrome code coverage JSON export is supplied, the tree map will be colorized according to which percentage of the modules code was executed',
      },
    })
    .group(['json', 'tsv', 'html'], 'Output:')
    .group(['replace', 'with'], 'Replace:')
    .help('h')
    .alias('h', 'help')
    .showHelpOnFail(false, 'Specify --help for available options')
    .wrap(null) // Do not limit line length
    .parserConfiguration({
      'boolean-negation': false, // Allow --no-root
    })
    .check(argv => {
      if (argv.replace && argv.with && argv.replace.length !== argv.with.length) {
        throw new Error('--replace flags must be paired with --with flags');
      }

      return true;
    })
    .parse(); // Trim extra quotes

  const quoteRegex = /'/g;
  argv._ = argv._.map(path => path.replace(quoteRegex, ''));
  return argv;
}

function logError(message, error) {
  if (!(0, _lodash.isString)(message)) {
    message = (0, _appError.getErrorMessage)(message);
  }

  if (error) {
    console.error(_chalk.default.red(message), error);
  } else {
    console.error(_chalk.default.red(message));
  }
}

function logWarn(message) {
  console.warn(_chalk.default.yellow(message));
}

function logInfo(message) {
  console.log(_chalk.default.green(message));
}
/**
 * Create options object for `explore` method
 */

function getExploreOptions(argv) {
  const {
    json,
    tsv,
    html,
    replace: replaceItems,
    with: withItems,
    onlyMapped,
    excludeSourceMap: excludeSourceMapComment,
    noRoot,
    coverage,
  } = argv;
  let replaceMap;

  if (replaceItems && withItems) {
    replaceMap = replaceItems.reduce((result, item, index) => {
      result[item] = withItems[index];
      return result;
    }, {});
  }

  return {
    output: {
      // By default CLI needs result in HTML in order to create a temporary file
      format: (0, _lodash.isString)(json) ? 'json' : (0, _lodash.isString)(tsv) ? 'tsv' : 'html',
      filename: json || tsv || html,
    },
    replaceMap,
    onlyMapped,
    excludeSourceMapComment,
    noRoot,
    coverage,
  };
}
/**
 * Write HTML content to a temporary file and open the file in a browser
 */

async function writeHtmlToTempFile(html) {
  if (!html) {
    return;
  }

  try {
    const tempFile = _temp.default.path({
      prefix: 'sme-result-',
      suffix: '.html',
    });

    _fs.default.writeFileSync(tempFile, html);

    const childProcess = await (0, _open.default)(tempFile);

    if (childProcess.stderr) {
      // Catch error output from child process
      childProcess.stderr.once('data', error => {
        logError({
          code: 'CannotOpenTempFile',
          tempFile,
          error,
        });
      });
    }
  } catch (error) {
    throw new _appError.AppError(
      {
        code: 'CannotCreateTempFile',
      },
      error
    );
  }
}

function outputErrors({ errors }) {
  if (errors.length === 0) {
    return;
  } // Group errors by bundle name

  const groupedErrors = (0, _lodash.groupBy)(errors, 'bundleName');
  Object.entries(groupedErrors).forEach(([bundleName, errors]) => {
    console.group(bundleName);
    const hasManyErrors = errors.length > 1;
    errors.forEach((error, index) => {
      const message = `${hasManyErrors ? `${index + 1}. ` : ''}${error.message}`;

      if (error.isWarning) {
        logWarn(message);
      } else {
        logError(message);
      }
    });
    console.groupEnd();
  });
}

if (require.main === module) {
  const argv = parseArguments();
  const isOutputFormatSpecified = [argv.json, argv.tsv, argv.html].some(_lodash.isString);
  const options = getExploreOptions(argv);
  (0, _api.explore)(argv._, options)
    .then(result => {
      if (isOutputFormatSpecified && options.output) {
        const filename = options.output.filename;

        if (filename) {
          logInfo(`Output saved to ${filename}`);
          outputErrors(result);
        } else {
          console.log(result.output);
        }
      } else {
        writeHtmlToTempFile(result.output).then(() => {
          outputErrors(result);
        });
      }
    })
    .catch(error => {
      if (error.errors) {
        outputErrors(error);
      } else {
        logError('Failed to explore', error);
      }
    });
}
