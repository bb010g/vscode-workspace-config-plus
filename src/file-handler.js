'use strict';

const { isDeepStrictEqual } = require('util');
const jsoncParser = require('jsonc-parser');
const log = require('./log');

const _loadConfigFromFile = async (fileUri, readFile) => {
  const contents = await readFile(fileUri);
  if (!contents) {
    return undefined;
  }
  const errors = [];
  const config = jsoncParser.parse(contents.toString(), errors);
  if (errors.length > 0) {
    throw new Error(`Failed to parse contents of: ${fileUri.fsPath}`);
  }
  return config;
}

const mergeConfigFiles = async ({
  vscodeFileUri,
  sharedFileUri,
  localFileUri,
  readFile,
  writeFile
}) => {
  const loadConfigFromFile = module.exports._loadConfigFromFile;
  try {
    const sharedFile = await loadConfigFromFile(sharedFileUri, readFile);
    const localFile = await loadConfigFromFile(localFileUri, readFile);

    // If neither of these files exists then there's no work to be done
    if (!sharedFile && !localFile) {
      return;
    }

    const sharedFileContents = sharedFile || {};
    const localFileContents = localFile || {};
    const vscodeFileContents = await loadConfigFromFile(vscodeFileUri, readFile);
    const merged = { ...sharedFileContents, ...localFileContents };

    // Avoid rewriting the file if there are no changes to be applied
    if (isDeepStrictEqual(vscodeFileContents, merged)) {
      return;
    }

    log.info(`Updating config in ${vscodeFileUri.fsPath}`);
    await writeFile(
      vscodeFileUri,
      Buffer.from(JSON.stringify({ ...vscodeFileContents, ...merged}, null, 2)),
      { create: true, overwrite: true }
    );
  } catch (e) {
    log.error(e.message);
    log.debug(e);
  }
}

module.exports = {
  mergeConfigFiles,
  // Private, only exported for test mocking
  _loadConfigFromFile,
}
