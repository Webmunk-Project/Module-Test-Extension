/* global requirejs */

requirejs.config({
  shim: {
    jquery: {
      exports: '$'
    }
  },
  baseUrl: 'vendor/js'
})

define(['app/config', 'jquery'], function (config) {
  const home = {}

  return home
})
