/* global MutationObserver, FileReader */

(function () {
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

  const testModulePageChangeListeners = []

  window.registerModulePageChangeListener = function (callback) {
    if (callback !== undefined) {
      testModulePageChangeListeners.push(callback)
    }
  }

  const config = {
    subtree: true,
    childList: true,
    attributes: true,
    attributeOldValue: true,
    characterData: true,
    characterDataOldValue: true
  }

  let pageUpdateScheduleId = -1
  let finalTimeout = null

  const changeFunction = function () {
    console.log('[Modular Test Extension] Page update')

    testModulePageChangeListeners.forEach(function (listener) {
      listener()
    })
  }

  const listener = new MutationObserver(function (mutationsList) {
    let doUpdate = false

    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        doUpdate = true
      } else if (mutation.type === 'attributes') {
        doUpdate = true
      }
    }

    if (doUpdate) {
      let timeout = 2500

      const now = new Date().getTime()

      if (now - window.cookieManagerExtensionInitialized < 2500) {
        timeout = 500
      }

      if (pageUpdateScheduleId === -1) {
        pageUpdateScheduleId = window.setTimeout(function () {
          changeFunction()

          pageUpdateScheduleId = -1
        }, timeout)
      }

      if (finalTimeout !== null) {
        window.clearTimeout(finalTimeout)
      }

      finalTimeout = window.setTimeout(changeFunction, 2500)
    }
  })

  listener.observe(document, config)

  window.testExtensionPopulateContent = function (url, title, container, key, complete) {
    const blobToBase64 = blob => { // eslint-disable-line no-unused-vars
      const reader = new FileReader()

      reader.readAsDataURL(blob)

      return new Promise(resolve => {
        reader.onloadend = () => {
          resolve(reader.result)
        }
      })
    }

    const slugify = function (rawString) { // eslint-disable-line no-unused-vars
      return rawString
        .toString()
        .normalize('NFD') // split an accented letter in the base letter and the acent
        .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, '') // remove all chars not letters, numbers and spaces (to be replaced)
        .replace(/\s+/g, '-')
    }

    const imageRequest = new Request(url)

    let mimeType = 'application/octet-stream'

    fetch(imageRequest)
      .then((response) => {
        if (!response.ok) {
          console.log('[Modular Test Extension] Unable to retrieve content URL: ' + url)

          complete()

          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        return response.blob()
      })
      .then((responseBlob) => {
        mimeType = responseBlob.type.split('/')[1]

        return responseBlob
      })
      .then(blobToBase64)
      .then((response) => {
        const filename = slugify(title) + '.' + mimeType

        const fullResponse = response.replace(';base64', ';name=' + filename + ';base64')

        container[key] = fullResponse

        complete()
      })
  }

  console.log('[Module Test Extension] Loading content script...')

  // LOAD CONTENT MODULES

  console.log('[Module Test Extension] ' + window.testModuleCallbacks.length + ' extension(s) ready.')

  window.testModuleCallbacks.forEach(function (callback) {
    const config = {}

    callback(config)
  })
})(); // eslint-disable-line semi, no-trailing-spaces
