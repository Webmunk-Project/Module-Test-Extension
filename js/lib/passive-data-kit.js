/* global chrome, indexedDB, fetch, nacl */

const pdkFunction = function () {
  const pdk = {}

  pdk.openDatabase = function (success, failure) {
    if (pdk.db !== undefined) {
      success(pdk.db)

      return
    }

    const PDK_DATABASE_VERSION = 1

    const request = indexedDB.open('passive_data_kit', PDK_DATABASE_VERSION)

    request.onerror = function (event) {
      failure(event)
    }

    request.onsuccess = function (event) {
      pdk.db = request.result

      success(pdk.db)
    }

    request.onupgradeneeded = function (event) {
      pdk.db = event.target.result

      switch (event.oldVersion) {
        case 0: {
          const dataPoints = pdk.db.createObjectStore('dataPoints', {
            keyPath: 'dataPointId',
            autoIncrement: true
          })

          dataPoints.createIndex('generatorId', 'generatorId', { unique: false })
          dataPoints.createIndex('dataPoint', 'dataPoint', { unique: false })
          dataPoints.createIndex('date', 'date', { unique: false })
          dataPoints.createIndex('transmitted', 'transmitted', { unique: false })
        }
      }
    }
  }

  pdk.enqueueDataPoint = function (generatorId, dataPoint, complete) {
    pdk.openDatabase(function (db) {
      const payload = {
        generatorId: generatorId,
        dataPoint: dataPoint,
        date: (new Date()).getTime(),
        transmitted: 0
      }

      const request = db.transaction(['dataPoints'], 'readwrite')
        .objectStore('dataPoints')
        .put(payload)

      request.onsuccess = function (event) {
        console.log('[PDK] Data point saved successfully: ' + generatorId + '.')

        complete()
      }

      request.onerror = function (event) {
        console.log('[PDK] Data point enqueuing failed: ' + generatorId + '.')
        console.log(event)

        complete()
      }
    }, function (error) {
      if (error) {
        console.log(error)
      }
    })
  }

  pdk.currentlyUploading = false

  pdk.uploadQueuedDataPoints = function (endpoint, serverKey, callback) {
    if (pdk.currentlyUploading) {
      return
    }

    pdk.currentlyUploading = true

    pdk.openDatabase(function (db) {
      const index = db.transaction(['dataPoints'], 'readonly')
        .objectStore('dataPoints')
        .index('transmitted')

      const request = index.getAll(0)

      request.onsuccess = function () {
        const pendingItems = request.result

        if (pendingItems.length === 0) {
          callback() // Finished

          pdk.currentlyUploading = false
        } else {
          const toTransmit = []
          const xmitBundle = []

          console.log('[PDK] Remaining data points: ' + pendingItems.length)

          let bundleLength = 0

          for (let i = 0; i < pendingItems.length && bundleLength < (4 * 1024 * 1024); i++) {
            const pendingItem = pendingItems[i]

            pendingItem.transmitted = new Date().getTime()

            pendingItem.dataPoint.date = pendingItem.date
            pendingItem.dataPoint.generatorId = pendingItem.generatorId

            toTransmit.push(pendingItem)
            xmitBundle.push(pendingItem.dataPoint)

            const bundleString = JSON.stringify(xmitBundle)

            bundleLength += bundleString.length
          }

          console.log('[PDK] Created bundle of size ' + bundleLength + '.')

          if (toTransmit.length === 0) {
            callback()

            pdk.currentlyUploading = false
          } else {
            chrome.storage.local.get({ 'pdk-identifier': 'unknown' }, function (result) {
              if (result['pdk-identifier'] !== '') {
                pdk.uploadBundle(endpoint, serverKey, result['pdk-identifier'], xmitBundle, function () {
                  pdk.updateDataPoints(toTransmit, function () {
                    pdk.currentlyUploading = false

                    pdk.uploadQueuedDataPoints(endpoint, serverKey, callback)
                  })
                })
              }
            })
          }
        }
      }

      request.onerror = function (event) {
        console.log('[PDK] PDK database error')
        console.log(event)
      }
    })
  }

  pdk.updateDataPoints = function (dataPoints, complete) {
    if (dataPoints.length === 0) {
      complete()
    } else {
      pdk.openDatabase(function (db) {
        const dataPoint = dataPoints.pop()

        const request = db.transaction(['dataPoints'], 'readwrite')
          .objectStore('dataPoints')
          .put(dataPoint)

        request.onsuccess = function (event) {
          pdk.updateDataPoints(dataPoints, complete)
        }

        request.onerror = function (event) {
          console.log('The data has write has failed')
          console.log(event)

          pdk.updateDataPoints(dataPoints, complete)
        }
      }, function (error) {
        console.log(error)

        complete()
      })
    }
  }

  pdk.encryptFields = function (serverKey, localKey, payload) {
    for (const itemKey in payload) {
      const value = payload[itemKey]

      const toRemove = []

      if (itemKey.endsWith('*')) {
        const originalValue = '' + value

        payload[itemKey.replace('*', '!')] = originalValue

        const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
        const messageUint8 = nacl.util.decodeUTF8(JSON.stringify(value))

        const cipherBox = nacl.box(messageUint8, nonce, serverKey, localKey)

        const fullMessage = new Uint8Array(nonce.length + cipherBox.length)

        fullMessage.set(nonce)
        fullMessage.set(cipherBox, nonce.length)

        const base64FullMessage = nacl.util.encodeBase64(fullMessage)

        payload[itemKey] = base64FullMessage

        toRemove.push(itemKey)
      } else if (value != null && value.constructor.name === 'Object') {
        pdk.encryptFields(serverKey, localKey, value)
      } else if (value != null && Array.isArray(value)) {
        value.forEach(function (valueItem) {
          if (valueItem.constructor.name === 'Object') {
            pdk.encryptFields(serverKey, localKey, valueItem)
          }
        })
      }
    }
  }

  pdk.uploadBundle = function (endpoint, serverKey, userId, points, complete) {
    const manifest = chrome.runtime.getManifest()

    let keyPair = null
    let serverPublicKey = null

    if (serverKey !== null) {
      keyPair = nacl.box.keyPair()
      serverPublicKey = nacl.util.decodeBase64(serverKey)
    }

    const userAgent = manifest.name + '/' + manifest.version + ' ' + navigator.userAgent

    for (let i = 0; i < points.length; i++) {
      const metadata = {}

      if (points[i].date === undefined) {
        points[i].date = (new Date()).getTime()
      }

      metadata.source = userId
      metadata.generator = points[i].generatorId + ': ' + userAgent
      metadata['generator-id'] = points[i].generatorId
      metadata.timestamp = points[i].date / 1000 // Unix timestamp

      if (keyPair !== null) {
        metadata['generated-key'] = nacl.util.encodeBase64(keyPair.publicKey)
      }

      metadata.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      points[i]['passive-data-metadata'] = metadata

      if (keyPair !== null && serverPublicKey !== null) {
        pdk.encryptFields(serverPublicKey, keyPair.secretKey, points[i])
      }
    }

    const dataString = JSON.stringify(points, null, 2)

    fetch(endpoint, {
      method: 'CREATE',
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      headers: {
        'Content-Type': 'application/json'
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: dataString // body data type must match "Content-Type" header
    })
      .then(response => response.json())
      .then(function (data) {
        complete()
      })
      .catch((error) => {
        console.error('Error:', error)
      })
  }

  return pdk
}

if (typeof define === 'undefined') {
  if (typeof window !== 'undefined') {
    window.PDK = pdkFunction()
  } else {
    PDK = pdkFunction() // eslint-disable-line no-global-assign, no-undef
  }
} else {
  PDK = define(pdkFunction) // eslint-disable-line no-global-assign, no-undef
}
