// @ts-check
const constants = require('../common/constants')
const debug = require('../common/debug')

const trackedElements = new Map()

function getUniqueIdForElement (el) {
  if (!el.dataset.xGnomeMediaControlId) {
    el.dataset.xGnomeMediaControlId = [
      el.nodeName.toLowerCase(),
      Date.now(),
      Math.floor(Math.random() * 1000000)
    ].join('_')
  }

  return el.dataset.xGnomeMediaControlId
}

function startTrackingMediaElement (el) {
  if (!(el instanceof HTMLMediaElement)) {
    debug('startTrackingMediaElement() called for non-HTMLMediaElement', el)
    return
  }

  const id = getUniqueIdForElement(el)
  el.addEventListener('play', trackPlay)
  el.addEventListener('pause', trackPause)
  el.addEventListener('ended', trackEnd)
  browser.runtime.sendMessage({
    action: constants.ACTION_ADDED,
    element: id,
    state: el.paused || el.ended ? constants.STATE_PAUSED : constants.STATE_PLAYING
  })

  trackedElements.set(id, el)
}

function startTrackingRecursive (node) {
  if (node instanceof HTMLMediaElement) {
    startTrackingMediaElement(node)
  }

  if ('querySelectorAll' in node) {
    [...node.querySelectorAll('audio,video')].forEach(startTrackingMediaElement)
  }
}

function stopTrackingMediaElement (el) {
  if (!(el instanceof HTMLMediaElement)) {
    debug('stopTrackingMediaElement() called for non-HTMLMediaElement', el)
    return
  }

  const id = getUniqueIdForElement(el)
  el.removeEventListener('play', trackPlay)
  el.removeEventListener('pause', trackPause)
  el.removeEventListener('ended', trackEnd)
  browser.runtime.sendMessage({
    action: constants.ACTION_REMOVED,
    element: id
  })
  trackedElements.delete(id)
}

function stopTrackingRecursive (node) {
  if (node instanceof HTMLMediaElement) {
    stopTrackingMediaElement(node)
  }

  if ('querySelectorAll' in node) {
    [...node.querySelectorAll('audio,video')].forEach(stopTrackingMediaElement)
  }
}

function handleMutationEvent (ev) {
  for (let mutation of ev) {
    [...mutation.addedNodes].forEach(startTrackingRecursive);
    [...mutation.removedNodes].forEach(stopTrackingRecursive);
  }
}

const isPlaying = e => !e.paused && !e.ended

const trackPlay = e => track('play', e)
const trackPause = e => track('pause', e)
const trackEnd = e => track('end', e)
const track = (action, event) =>
  browser.runtime.sendMessage({
    action: constants.ACTION_UPDATED,
    element: getUniqueIdForElement(event.target),
    state: isPlaying(event.target) ? constants.STATE_PLAYING : constants.STATE_PAUSED
  })

function handleAction (message) {
  if (message.action === constants.ACTION_TOGGLE_PLAYSTATE) {
    const id = message.element
    const element = trackedElements.get(id)
    if (element) {
      if (isPlaying(element)) {
        element.pause()
      } else {
        element.play()
      }
    }
  }
}

function init() {
  // Find current nodes
  [...document.querySelectorAll('audio,video')].forEach(startTrackingRecursive);

  // Start to watch for new nodes
  const observer = new MutationObserver(handleMutationEvent)
  observer.observe(document, { subtree: true, childList: true })

  // If we inload, tell the parent to unregister all elements
  window.addEventListener('unload', ev => {
    for (let id of trackedElements.keys()) {
      browser.runtime.sendMessage({
        action: constants.ACTION_REMOVED,
        element: id
      })
    }
  })

  // Start to listen for commands from parent
  browser.runtime.onMessage.addListener(handleAction)
}

init()
