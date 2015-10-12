/* */ 
var AnonymousObservable = require('../internal/anonymousobservable');
module.exports = function(subscribe, parent) {
  return new AnonymousObservable(subscribe, parent);
};
