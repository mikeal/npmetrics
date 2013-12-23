var funcstream = require('../funcstream')
  , request = require('request')
  , jsonstream = require('JSONstream')
  , fs = require('fs')
  , registry = 'http://isaacs.iriscouch.com/registry/_all_docs?include_docs=true'
  , search = require('./search')
  , _ = require('lodash')
  , sum = function (arr) {return arr.reduce(function (x,y) {return x+y}, 0)}
  ;

function docs (cache) {
  if (cache) stream = fs.createReadStream(cache)
  else stream = request(registry)
  var json = stream.pipe(jsonstream.parse(['rows', true]))
    , ret = json.pipe(funcstream()).pluck('doc')
    ;
  return ret
}

function day (doc) {
  return doc.time.created.slice(0, '2011-06-01'.length)
}
function month (doc) {
  return doc.time.created.slice(0, '2011-06'.length)
}
function year (doc) {
  return doc.time.created.slice(0, '2011'.length)
}
function quarter (doc) {
  var yr = year(doc)
    , m = doc.time.created.slice('2011-'.length, '2011-06'.length)
    ;
  if (['01', '02', '03'].indexOf(m) !== -1) return yr+'-Q1'
  if (['04', '05', '06'].indexOf(m) !== -1) return yr+'-Q2'
  if (['07', '08', '09'].indexOf(m) !== -1) return yr+'-Q3'
  if (['10', '11', '12'].indexOf(m) !== -1) return yr+'-Q4'
}
function hascreated (doc) {
  return doc.time && doc.time.created
}

function avgdaily (cache, cb) {
  var all = docs(cache)

  var valid = all.filter(hascreated)
    , dailies = []
    ;
  valid.group(day).each(function (stream) {
    dailies.push(stream)
    stream.count().each(function (count) {stream.final = count})
  })
  valid.on('end', function () {
    process.nextTick(function () {
      var numbers = _.object(_.sortBy(dailies, 'key').map(function (x) {return [x.key, x.final]}) )
        , keys = _.keys(numbers)
        , avg = {}
        , last = 0
        ;
      keys.forEach(function (key) {
        var _key = [quarter({time:{created:key}})]
        if (!avg[_key]) avg[_key] = []
        avg[_key].push(numbers[key])
      })
      var averages = _.object(_.keys(avg).map(function (key) {return [key, sum(avg[key]) / avg[key].length]}))
      cb(null, averages)
    })
  })

  // valid.map(function () {return 1}).sum(function (e, x) {
  //   console.log('valid', x)
  // })
}


function growth (cache, cb) {
  var all = docs(cache)

  var valid = all.filter(hascreated)
    , groups = []
    ;
  valid.group(quarter).each(function (stream) {
    groups.push(stream)
    stream.count().each(function (count) {stream.final = count})
  })
  var allvalid = 0
  valid.count().each(function (x) {allvalid = x})
  valid.on('end', function () {
    process.nextTick(function () {
      var numbers = _.object(_.sortBy(groups, 'key').map(function (x) {return [x.key, x.final]}) )
        , keys = _.keys(numbers)
        , growth = {}
        , totals = {}
        , last = 0
        ;
      keys.forEach(function (key) {
        var n = last + numbers[key]
        last = n
        totals[key] = n
      })

      for (var i=1;i<keys.length;i++) {
        var diff = (numbers[keys[i]] - numbers[keys[i-1]])
        growth[keys[i]] = diff
      }
      cb(null, growth, numbers)
    })
  })

  // valid.map(function () {return 1}).sum(function (e, x) {
  //   console.log('valid', x)
  // })
}
//
// avgdaily('./cache.json', function (e, growth) {
//   delete(growth['1970-Q1'])
//   console.log(growth)
//
//   for (var i in growth) {
//     console.log(i+','+growth[i])
//   }
//
//   console.log('increase')
//
//   var prev
//   for (var i in growth) {
//     if (prev) {
//       console.log(i+','+Math.round(((growth[i] - growth[prev]) / growth[prev]) * 100))
//     }
//     prev = i
//   }
//
//   console.log('yearly increase')
//
//   var k = _.keys(growth)
//     , v = _.values(growth)
//     ;
//
//   for (var i=0;i<k.length;i++) {
//     if (k[i+4]) {
//       var prevkey = k[i]
//         , nextkey = k[i+4]
//         ;
//       var gr = ((growth[nextkey] - growth[prevkey]) / growth[prevkey]) * 100
//       console.log(nextkey+','+Math.round(gr))
//     }
//   }
// })

// var d = docs('./cache.json')
// d.map(function (doc) {
//   return doc._id
// }).on('data', function (id) {console.log(id)})
// var level = d.filter(function (doc) {return search('http', doc)})
// level.on('data', function (d) {
//   console.log(d)
// })

function createCache (file, cb) {
  request(registry).pipe(fs.createWriteStream(file)).on('end', cb).on('error', cb)
}

// createCache('./cache.json', function (e) {
//   console.error(e)
// })

exports.createCache = createCache
exports.docs = docs