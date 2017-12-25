const debug = require('../common/debug')
const constants = require('../common/constants')

const MEDIA_KEY_GRAB_TIMEOUT = 10000

let mediaElementPlayStack = []
let mediaKeyGrabTimeout

/**
 * Handle a play state update message from content frames.
 *
 * @param {Object} message - the message received from the content page
 * @param {String} message.action - the name of the action that occurred for this element
 * @param {String} message.element - the id of the element this message relates to
 * @param {String} [message.state] - the current state of the playback for the element
 * @param {Object} sender - the sender of the message
 * @param {Function} sendResponse - function to send a response to this message
 */
function handlePlayStateUpdate (message, sender, sendResponse) {
  const findElement = () => mediaElementPlayStack[findElementIndex()]
  const findElementIndex = () => mediaElementPlayStack.findIndex(e => e.element === message.element)

  debug('Got play state update', {
    element: message.element,
    action: message.action,
    state: message.state,
    tab: (sender.tab || {}).id
  })

  switch (message.action) {
    case constants.ACTION_ADDED:
      // New element; add it to the list
      mediaElementPlayStack.push({
        element: message.element, state: message.state, tabId: sender.tab.id, playStartTime: 0
      })

      break
    case constants.ACTION_REMOVED:
      // Element removed; remove it from the list
      mediaElementPlayStack.splice(findElementIndex(), 1)
      break

    case constants.ACTION_UPDATED:
      // Existing element state updated; update the state & playStartTime if playback started
      const data = findElement()
      data.state = message.state
      if (data.state === constants.STATE_PLAYING) {
        data.playStartTime = Date.now()
      }
      break
    default:
      debug('Unexpected message', message)
      break
  }

  // Now sort the elements according to the following rules:
  // - playing elements go before paused ones
  // - elements with larger playStartTime are sorted closer to
  //   the top
  mediaElementPlayStack.sort((a, b) => {
    if (a.state === b.state) {
      // Same state. Sort by playStartTime so that if |a| is earlier
      // than |b|, b comes first (i.e. this returns > 0)
      return b.playStartTime - a.playStartTime
    } else {
      // Different states. Sort PLAYING before PAUSED
      return a.state === constants.STATE_PLAYING ? -1 : 1
    }
  })

  // Next, figure out if we should grab / release media keys
  if (mediaElementPlayStack.length) {
    const head = mediaElementPlayStack[0]
    if (head.state === constants.STATE_PLAYING) {
      // If we are playing, ensure we have grabbed the media keys
      ensureMediaKeyGrab()
    } else {
      // If we are not playing, start a timer that releases the media
      // keys if playback doesn't start before this one expires
      mediaKeyGrabTimeout = setTimeout(() => {
        releaseMediaKeyGrab()
      }, MEDIA_KEY_GRAB_TIMEOUT)
    }
  } else {
    // No media elements active. Release media keys immediately
    releaseMediaKeyGrab()
  }
}

/**
 * Handles messages from the native component that grabs / ungrabs media
 * keys for us and listens to key presses.
 *
 * @param {Object} message - the message sent by the python script
 * @param {String} message.action - the action to take (stop or playpause)
 */
function handleHativeCommand (message) {
  debug('got message from native host', message)
  if (mediaElementPlayStack.length === 0) {
    return
  }

  if (mediaElementPlayStack[0].state === constants.STATE_PLAYING) {
    // Stop all players
    for (let item of mediaElementPlayStack) {
      if (item.state === constants.STATE_PAUSED) {
        break
      }

      browser.tabs.sendMessage(item.tabId, { element: item.element, action: constants.ACTION_TOGGLE_PLAYSTATE })
    }
  } else if (message.action !== 'stop') {
    // Start playing the player that transitioned to playing the latest
    const item = mediaElementPlayStack[0]
    browser.tabs.sendMessage(item.tabId, { element: item.element, action: constants.ACTION_TOGGLE_PLAYSTATE })
  }
}

/**
 * Ensure the native script is running and has grabbed media keys.
 */
function ensureMediaKeyGrab () {
  debug('ensuring media keys are grabbed')
  nativeMessagingPort.postMessage({ action: 'grab_media_keys' })

  if (mediaKeyGrabTimeout) {
    clearTimeout(mediaKeyGrabTimeout)
    mediaKeyGrabTimeout = null
  }
}

/**
 * Stop the native host from running to release the media keys.
 */
function releaseMediaKeyGrab () {
  debug('releasing media keys')
  nativeMessagingPort.postMessage({ action: 'release_media_keys' })

  if (mediaKeyGrabTimeout) {
    clearTimeout(mediaKeyGrabTimeout)
    mediaKeyGrabTimeout = null
  }
}

// Start to listen media state updates from content
browser.runtime.onMessage.addListener(handlePlayStateUpdate)
const nativeMessagingPort = browser.runtime.connectNative("gnome_media_control")
nativeMessagingPort.onMessage.addListener(handleHativeCommand)
