/* */ 
"format cjs";
;
(function(factory) {
  var objectTypes = {
    'function': true,
    'object': true
  };
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
      freeSelf = objectTypes[typeof self] && self.Object && self,
      freeWindow = objectTypes[typeof window] && window && window.Object && window,
      freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
      moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
      freeGlobal = freeExports && freeModule && typeof global == 'object' && global && global.Object && global;
  var root = root = freeGlobal || ((freeWindow !== (this && this.window)) && freeWindow) || freeSelf || this;
  if (typeof define === 'function' && define.amd) {
    define(['./rx'], function(Rx, exports) {
      return factory(root, exports, Rx);
    });
  } else if (typeof module === 'object' && module && module.exports === freeExports) {
    module.exports = factory(root, module.exports, require('./rx'));
  } else {
    root.Rx = factory(root, {}, root.Rx);
  }
}.call(this, function(root, exp, Rx, undefined) {
  var Observable = Rx.Observable,
      observableProto = Observable.prototype,
      AnonymousObservable = Rx.AnonymousObservable,
      observableNever = Observable.never,
      isEqual = Rx.internals.isEqual,
      defaultSubComparer = Rx.helpers.defaultSubComparer;
  observableProto.jortSort = function() {
    return this.jortSortUntil(observableNever());
  };
  observableProto.jortSortUntil = function(other) {
    var source = this;
    return new AnonymousObservable(function(observer) {
      var arr = [];
      return source.takeUntil(other).subscribe(arr.push.bind(arr), observer.onError.bind(observer), function() {
        var sorted = arr.slice(0).sort(defaultSubComparer);
        observer.onNext(isEqual(arr, sorted));
        observer.onCompleted();
      });
    }, source);
  };
  return Rx;
}));
