// mdify moved to a new domain. Forward the visitor to the same path there and carry
// this browser's mdify data (guest edit tokens, saved list, login, draft) in the URL
// fragment, which is never sent to any server. The new site imports and strips it.
;(function () {
  var TARGET = 'https://mdify.is-live.dev'
  var MAX = 200000
  var data = {}
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i)
      if (key && key.indexOf('mdify:') === 0) data[key] = localStorage.getItem(key)
    }
  } catch (e) {
    /* storage unavailable */
  }
  var json = JSON.stringify(data)
  if (json.length > MAX) {
    // Drop drafts first; tokens and lists are small.
    Object.keys(data).forEach(function (k) {
      if (k.indexOf('mdify:draft') === 0) delete data[k]
    })
    json = JSON.stringify(data)
  }
  var hash = ''
  if (json !== '{}' && json.length <= MAX) {
    hash = '#handoff=' + encodeURIComponent(btoa(unescape(encodeURIComponent(json))))
  } else if (location.hash) {
    hash = location.hash
  }
  location.replace(TARGET + location.pathname + location.search + hash)
})()
