window.testExtensionLoading = false
window.testExtensionListenersLoaded = false

window.testExtensionInitialized = new Date().getTime()
window.testExtensionNeedsFirstRun = true

window.testExtensionCallbacks = []

window.registerExtensionCallback = function (callback) {
  window.testExtensionCallbacks.push(callback)
}

console.log('[Extensible Test Extension] Loading content script...')

// LOAD CONTENT EXTENSIONS

console.log('[Extensible Test Extension] ' + window.testExtensionCallbacks.length + ' extension(s) ready.')

const config = {}

window.testExtensionCallbacks.forEach(function (callback) {
  callback(config)
})
