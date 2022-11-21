window.testExtensionLoading = false
window.testExtensionListenersLoaded = false

window.testExtensionInitialized = new Date().getTime()
window.testExtensionNeedsFirstRun = true

window.testModuleCallbacks = []

window.registerModuleCallback = function (callback) {
  window.testModuleCallbacks.push(callback)
}

function locationFilterMatches (location, filters) { // eslint-disable-line no-unused-vars
  let hostMatch = false
  let pathMatch = true

  if (filters === undefined) {
    filters = []
  }

  filters.forEach(function (filter) {
    for (const [operation, pattern] of Object.entries(filter)) {
      if (operation === 'hostSuffix') {
        if (window.location.hostname.endsWith(pattern)) {
          hostMatch = true
        }
      } else if (operation === 'hostEquals') {
        if (window.location.hostname.toLowerCase() === pattern.toLowerCase()) {
          hostMatch = true
        }
      } else if (operation === 'urlMatches') {
        const matchRe = new RegExp(pattern)

        if (window.location.href.toLowerCase().match(matchRe)) {
          hostMatch = true
        }
      }
    }
  })

  // Evaluate sites to exclude.

  filters.forEach(function (filter) {
    for (const [operation, pattern] of Object.entries(filter)) {
      if (operation === 'excludeHostSuffix') {
        if (window.location.hostname.endsWith(pattern)) {
          hostMatch = false
        }
      } else if (operation === 'excludeHostEquals') {
        if (window.location.hostname.toLowerCase() === pattern.toLowerCase()) {
          hostMatch = false
        }
      } else if (operation === 'excludePaths') {
        pattern.forEach(function (excludePath) {
          const pathRegEx = new RegExp(excludePath)

          if (pathRegEx.test(window.location.pathname)) {
            pathMatch = false
          }
        })
      }
    }
  })

  return hostMatch && pathMatch
}

console.log('[Module Test Extension] Loading content script...')

// LOAD CONTENT MODULES

console.log('[Module Test Extension] ' + window.testModuleCallbacks.length + ' extension(s) ready.')

window.testModuleCallbacks.forEach(function (callback) {
  const config = {}

  callback(config)
})
