const configFunction = function () {
  return {
    primaryColor: '#616161',
    accentColor: '#616161',
    extensionName: 'Extensible Test Extension',
    generator: 'test-extension',
    aboutExtension: 'Minimalist extension for testing other extensions.'
  }
}

if (typeof define === 'undefined') {
  config = configFunction() // eslint-disable-line no-global-assign, no-undef
} else {
  define([], configFunction)
}
