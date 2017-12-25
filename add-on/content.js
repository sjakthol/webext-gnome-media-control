/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

if (true) {
  module.exports = () => {}
} else {
  module.exports = console.log
}


/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = {
  ACTION_ADDED: 'element_added',
  ACTION_REMOVED: 'element_removed',
  ACTION_TOGGLE_PLAYSTATE: 'toggle_media_element_play_state',
  ACTION_UPDATED: 'element_state_updated',
  STATE_PAUSED: 'paused',
  STATE_PLAYING: 'playing',
}


/***/ }),
/* 2 */,
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

// @ts-check
const constants = __webpack_require__(1)
const debug = __webpack_require__(0)

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


/***/ })
/******/ ]);