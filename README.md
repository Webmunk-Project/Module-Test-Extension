# Extensible Test Extension

This is a fully-functional Chrome testing extension created to illustrate the mechanism used to extend other Chrome extensions with new features in an easily configurable manner.

## Configuration

In order to add an extension to be incorporated in the build process, add the relative path to the new extension to the custom_extensions array in the `manifest.json` file.

After you have added the custom extensions, build the extension by running the command

`    python package_chrome.py`

This command will use the information provided in the manifest.json file to fetch the relevant resources and package them into the parent extension. It will produce a `chrome-extension.zip` file, which may be uncompressed to create a file suitable for use with Chrome’s [Load Unpacked](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked) loading mechanism.

When testing is complete, the `chrome-extension.zip` file may also be uploaded to the Chrome Web Store for distribution. Please use this repository only as a starting point for your own custom extension, and *do not upload this testing extension to the Chrome Web Store for distribution*.

## Extension Structure

This test project includes [the `hello` extension](https://github.com/audacious-software/Extensible-Test-Extension/tree/main/extensions/hello) that illustrates how to structure your custom extension. The `extension.json` file provides information about the extension itself, including the location of the respective JavaScript files that should be loaded into the respective service worker and page contexts. Permission lists allow your extension to expand [the list of permissions](https://developer.chrome.com/docs/extensions/mv3/declare_permissions/) already requested by the embedding parent Chrome extension.

The [service worker script](https://github.com/audacious-software/Extensible-Test-Extension/blob/main/extensions/hello/js/worker.js) implements the JavaScript that will be run in the background of the web browser interdependently of any specific pages. This is typically where your extension should implement any background processes, such as refreshing configurations or transmitting data.

The [page content script](https://github.com/audacious-software/Extensible-Test-Extension/blob/main/extensions/hello/js/content.js) contains the JavaScript code that run within the actual page context. This is where you may collect data from page directly or manipulate the page as desired. It may also communicate with the service worker context through the `chrome.runtime.sendMessage` calls to pass data back and forth.

## Other Project Notes

This project uses continous integration [provided by CircleCI](https://app.circleci.com/pipelines/github/audacious-software/Extensible-Test-Extension) to inspect the quality of each repository push. Currently, quality is assessed using the [JavaScript Standard Style](https://standardjs.com/) using [ESLint](https://eslint.org/). For specific details, please refer to the project's [CircleCI configuration file](https://github.com/audacious-software/Extensible-Test-Extension/blob/main/.circleci/config.yml) file for the latest details.

## Contact Information

This a very early stage project, so please contact (chris@audacious-software.com)[mailto:chris@audacious-software.com] if you have any questions or uncover a bug or other defect.
