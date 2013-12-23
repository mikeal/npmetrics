var npmetrics = require('./')
  , _ = require('lodash')
  , reg = new RegExp('^[0-9,.]+$')
  ;

npmetrics.docs().map(function (doc) {
  var names = []
    , versions = 0
    ;
  if (!doc.versions) return [0,0]
  _.values(doc.versions).forEach(function (pkg) {
    if (!pkg.dependencies) return
    var haslock = false
    for (var i in pkg.dependencies) {
      var dep = pkg.dependencies[i]
      if (reg.test(dep)) {
        names.push(i)
        haslock = true
      }
    }
    if (haslock) versions += 1
  })
  return [_.uniq(names).length, versions]
}).reduce(function (prev, count) {
  if (count[0]) {
    prev[0] = prev[0] + 1
    prev[1] = prev[1] + count[0]
    prev[2] = prev[2] + count[1]
  }
  return prev
}, [0,0,0], function (e, final) {
  console.error(e, final)
})

