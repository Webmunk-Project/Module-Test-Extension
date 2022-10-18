/* global window, importScripts */

if (typeof window === 'undefined') {
  window = {} // eslint-disable-line no-global-assign
}

// Investigate expanding array using spread operator below.
// https://stackoverflow.com/questions/1793845/convert-an-array-into-a-separate-argument-strings

const scripts = [
  'config.js',
  '../../vendor/js/nacl.js',
  '../../vendor/js/nacl-util.js',
  '../lib/passive-data-kit.js',
  'background.js'
]

// EXTEND SCRIPTS

importScripts.apply(null, scripts)
