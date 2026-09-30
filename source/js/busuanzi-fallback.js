(function () {
  var TIMEOUT = 4000
  setTimeout(function () {
    var nodes = document.querySelectorAll('[id^=busuanzi_value_]')
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].querySelector('.fa-spinner')) {
        nodes[i].textContent = '--'
      }
    }
  }, TIMEOUT)
})()
