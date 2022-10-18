/* global requirejs */

// const PDK_TOTAL_UPLOADED = 'pdk-total-uploaded'

requirejs.config({
  shim: {
    jquery: {
      exports: '$'
    },
    bootstrap: {
      deps: ['jquery']
    }
  },
  baseUrl: 'vendor/js',
  paths: {
    app: '../../js/app',
    pdk: '../../js/lib/passive-data-kit',
    bootstrap: '../../vendor/js/bootstrap.bundle',
    moment: '../../vendor/js/moment.min',
    material: '../../vendor/js/material-components-web'
  }
})

requirejs(['material', 'moment', 'pdk', 'jquery'], function (mdc, moment, pdk) {
  requirejs(['app/home', 'app/config'], function (home, config) {
    document.documentElement.style.setProperty('--mdc-theme-primary', config.primaryColor)
    document.documentElement.style.setProperty('--mdc-theme-secondary', config.accentColor)

    document.title = config.extensionName

    $('#extensionTitle').text(config.extensionName)
    $('#valueUploadUrl').text(config.uploadUrl)
    $('#valueAboutExtension').html(config.aboutExtension)

    mdc.topAppBar.MDCTopAppBar.attachTo(document.querySelector('.mdc-top-app-bar'))

    mdc.ripple.MDCRipple.attachTo(document.querySelector('.mdc-button'))

    window.onresize = function () {
      $('body').css('height', '100vh').css('overflow-y', 'hidden')
    }
  })
})
