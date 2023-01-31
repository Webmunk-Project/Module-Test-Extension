/* global chrome */

function openWindow () {
  const optionsUrl = chrome.runtime.getURL('index.html')

  chrome.tabs.query({}, function (extensionTabs) {
    let found = false

    for (let i = 0; i < extensionTabs.length; i++) {
      if (optionsUrl === extensionTabs[i].url) {
        found = true
      }
    }

    if (found === false) {
      chrome.windows.create({
        height: 480,
        width: 640,
        type: 'panel',
        url: chrome.runtime.getURL('index.html')
      })
    }
  })
}

chrome.action.onClicked.addListener(function (tab) {
  openWindow()
})

let initialized = false

const loadExtension = function (tabId) {
  if (initialized === false) {
    initialized = true

    console.log('[Module Test Extension] Initialized. ' + customModules.length)

    const config = {}

    for (let i = 0; i < customModules.length; i++) {
      customModules[i](config)
    }

    uploadData('pdk-upload')
  }

  chrome.scripting.executeScript({
    target: {
      tabId: tabId,
      allFrames: true
    },
    files: ['/vendor/js/jquery.js', '/js/app/content-script.js']
  }, function (result) {
    // Script loaded
  })
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (tab.url.startsWith('https://') || tab.url.startsWith('http://')) {
    loadExtension(tabId)
  }
})

const customMessageHandlers = {}

const registerMessageHandler = function (name, callback) { // eslint-disable-line no-unused-vars
  customMessageHandlers[name] = callback
}

function handleMessage (request, sender, sendResponse) {
  if (request.content === undefined) {
    return false
  }

  if (request.content === 'record_data_point') {
    request.payload['tab-id'] = sender.tab.id

    window.PDK.enqueueDataPoint(request.generator, request.payload, function () {
      sendResponse({
        message: 'Data point enqueued successfully.',
        success: true
      })
    })

    if (request.uploadNow) {
      uploadData('pdk-upload')
    }
  } else {
    const customCallback = customMessageHandlers[request.content]

    console.log('LOOKING FOR CUSTOM: ' + request.content)
    console.log(customCallback)
    console.log(request)

    if (customCallback !== undefined) {
      customCallback(request, sender, sendResponse)
    }
  }

  return true
}

chrome.runtime.onMessage.addListener(handleMessage)

chrome.storage.local.get(['PDKExtensionInstallTime'], function (result) {
  if (result.PDKExtensionInstallTime === undefined) {
    openWindow()

    const now = new Date().getTime()

    chrome.storage.local.set({
      PDKExtensionInstallTime: now
    }, function (result) {

    })
  }
})

chrome.alarms.create('pdk-upload', { periodInMinutes: 5 })

const uploadData = function (alarm) {
  console.log('[Module Test Extension] Uploading queued data points...')

  // Note that URL below is typically dynamically configured by a fuller plugin instead
  // of being hard-coded, as well as the null content encryption key below.

  window.PDK.uploadQueuedDataPoints('https://pdk.audacious-software.com/data/add-bundle.json', null, function () {
    chrome.storage.local.set({
      'pdk-last-upload': (new Date().getTime())
    }, function (result) {
    })
  })
}

chrome.alarms.onAlarm.addListener(uploadData)

const customModules = []

const registerCustomModule = function (callback) { // eslint-disable-line no-unused-vars
  customModules.push(callback)
}
