/* global chrome */

window.registerExtensionCallback(function (config) {
  console.log('[Hello World] Greetings from the page context!')

  console.log('[Hello World] Preparing transmission to remote server...')

  const payload = {
    'url*': window.location.href,
    'page-title*': document.title
  }

  console.log('[Hello World] Sending data...')
  console.log(payload)

  chrome.runtime.sendMessage({
    content: 'record_data_point',
    generator: 'hello-world',
    payload: payload,
    uploadNow: true
  })

  console.log('[Hello World] Data stored for transmission.')
})
