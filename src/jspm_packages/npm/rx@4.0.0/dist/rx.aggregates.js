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
      BinaryDisposable = Rx.BinaryDisposable,
      AnonymousObservable = Rx.AnonymousObservable,
      AbstractObserver = Rx.internals.AbstractObserver,
      disposableEmpty = Rx.Disposable.empty,
      helpers = Rx.helpers,
      defaultComparer = helpers.defaultComparer,
      identity = helpers.identity,
      defaultSubComparer = helpers.defaultSubComparer,
      isFunction = helpers.isFunction,
      isPromise = helpers.isPromise,
      isArrayLike = helpers.isArrayLike,
      isIterable = helpers.isIterable,
      inherits = Rx.internals.inherits,
      observableFromPromise = Observable.fromPromise,
      observableFrom = Observable.from,
      bindCallback = Rx.internals.bindCallback,
      EmptyError = Rx.EmptyError,
      ObservableBase = Rx.ObservableBase,
      ArgumentOutOfRangeError = Rx.ArgumentOutOfRangeError;
  var errorObj = {e: {}};
  function tryCatcherGen(tryCatchTarget) {
    return function tryCatcher() {
      try {
        return tryCatchTarget.apply(this, arguments);
      } catch (e) {
        errorObj.e = e;
        return errorObj;
      }
    };
  }
  var tryCatch = Rx.internals.tryCatch = function tryCatch(fn) {
    if (!isFunction(fn)) {
      throw new TypeError('fn must be a function');
    }
    return tryCatcherGen(fn);
  };
  function thrower(e) {
    throw e;
  }
  var ExtremaByObservable = (function(__super__) {
    inherits(ExtremaByObservable, __super__);
    function ExtremaByObservable(source, k, c) {
      this.source = source;
      this._k = k;
      this._c = c;
      __super__.call(this);
    }
    ExtremaByObservable.prototype.subscribeCore = function(o) {
      return this.source.subscribe(new ExtremaByObserver(o, this._k, this._c));
    };
    return ExtremaByObservable;
  }(ObservableBase));
  var ExtremaByObserver = (function(__super__) {
    inherits(ExtremaByObserver, __super__);
    function ExtremaByObserver(o, k, c) {
      this._o = o;
      this._k = k;
      this._c = c;
      this._v = null;
      this._hv = false;
      this._l = [];
      __super__.call(this);
    }
    ExtremaByObserver.prototype.next = function(x) {
      var key = tryCatch(this._k)(x);
      if (key === errorObj) {
        return this._o.onError(key.e);
      }
      var comparison = 0;
      if (!this._hv) {
        this._hv = true;
        this._v = key;
      } else {
        comparison = tryCatch(this._c)(key, this._v);
        if (comparison === errorObj) {
          return this._o.onError(comparison.e);
        }
      }
      if (comparison > 0) {
        this._v = key;
        this._l = [];
      }
      if (comparison >= 0) {
        this._l.push(x);
      }
    };
    ExtremaByObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    ExtremaByObserver.prototype.completed = function() {
      this._o.onNext(this._l);
      this._o.onCompleted();
    };
    return ExtremaByObserver;
  }(AbstractObserver));
  function firstOnly(x) {
    if (x.length === 0) {
      throw new EmptyError();
    }
    return x[0];
  }
  var ReduceObservable = (function(__super__) {
    inherits(ReduceObservable, __super__);
    function ReduceObservable(source, accumulator, hasSeed, seed) {
      this.source = source;
      this.accumulator = accumulator;
      this.hasSeed = hasSeed;
      this.seed = seed;
      __super__.call(this);
    }
    ReduceObservable.prototype.subscribeCore = function(observer) {
      return this.source.subscribe(new ReduceObserver(observer, this));
    };
    return ReduceObservable;
  }(ObservableBase));
  var ReduceObserver = (function(__super__) {
    inherits(ReduceObserver, __super__);
    function ReduceObserver(o, parent) {
      this._o = o;
      this._p = parent;
      this._fn = parent.accumulator;
      this._hs = parent.hasSeed;
      this._s = parent.seed;
      this._ha = false;
      this._a = null;
      this._hv = false;
      this._i = 0;
      __super__.call(this);
    }
    ReduceObserver.prototype.next = function(x) {
      !this._hv && (this._hv = true);
      if (this._ha) {
        this._a = tryCatch(this._fn)(this._a, x, this._i, this._p);
      } else {
        this._a = this._hs ? tryCatch(this._fn)(this._s, x, this._i, this._p) : x;
        this._ha = true;
      }
      if (this._a === errorObj) {
        return this._o.onError(this._a.e);
      }
      this._i++;
    };
    ReduceObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    ReduceObserver.prototype.completed = function() {
      this._hv && this._o.onNext(this._a);
      !this._hv && this._hs && this._o.onNext(this._s);
      !this._hv && !this._hs && this._o.onError(new EmptyError());
      this._o.onCompleted();
    };
    return ReduceObserver;
  }(AbstractObserver));
  observableProto.reduce = function() {
    var hasSeed = false,
        seed,
        accumulator = arguments[0];
    if (arguments.length === 2) {
      hasSeed = true;
      seed = arguments[1];
    }
    return new ReduceObservable(this, accumulator, hasSeed, seed);
  };
  var SomeObservable = (function(__super__) {
    inherits(SomeObservable, __super__);
    function SomeObservable(source, fn) {
      this.source = source;
      this._fn = fn;
      __super__.call(this);
    }
    SomeObservable.prototype.subscribeCore = function(o) {
      return this.source.subscribe(new SomeObserver(o, this._fn, this.source));
    };
    return SomeObservable;
  }(ObservableBase));
  var SomeObserver = (function(__super__) {
    inherits(SomeObserver, __super__);
    function SomeObserver(o, fn, s) {
      this._o = o;
      this._fn = fn;
      this._s = s;
      this._i = 0;
      __super__.call(this);
    }
    SomeObserver.prototype.next = function(x) {
      var result = tryCatch(this._fn)(x, this._i++, this._s);
      if (result === errorObj) {
        return this._o.onError(result.e);
      }
      if (Boolean(result)) {
        this._o.onNext(true);
        this._o.onCompleted();
      }
    };
    SomeObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    SomeObserver.prototype.completed = function() {
      this._o.onNext(false);
      this._o.onCompleted();
    };
    return SomeObserver;
  }(AbstractObserver));
  observableProto.some = function(predicate, thisArg) {
    var fn = bindCallback(predicate, thisArg, 3);
    return new SomeObservable(this, fn);
  };
  var IsEmptyObservable = (function(__super__) {
    inherits(IsEmptyObservable, __super__);
    function IsEmptyObservable(source) {
      this.source = source;
      __super__.call(this);
    }
    IsEmptyObservable.prototype.subscribeCore = function(o) {
      return this.source.subscribe(new IsEmptyObserver(o));
    };
    return IsEmptyObservable;
  }(ObservableBase));
  var IsEmptyObserver = (function(__super__) {
    inherits(IsEmptyObserver, __super__);
    function IsEmptyObserver(o) {
      this._o = o;
      __super__.call(this);
    }
    IsEmptyObserver.prototype.next = function() {
      this._o.onNext(false);
      this._o.onCompleted();
    };
    IsEmptyObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    IsEmptyObserver.prototype.completed = function() {
      this._o.onNext(true);
      this._o.onCompleted();
    };
    return IsEmptyObserver;
  }(AbstractObserver));
  observableProto.isEmpty = function() {
    return new IsEmptyObservable(this);
  };
  var EveryObservable = (function(__super__) {
    inherits(EveryObservable, __super__);
    function EveryObservable(source, fn) {
      this.source = source;
      this._fn = fn;
      __super__.call(this);
    }
    EveryObservable.prototype.subscribeCore = function(o) {
      return this.source.subscribe(new EveryObserver(o, this._fn, this.source));
    };
    return EveryObservable;
  }(ObservableBase));
  var EveryObserver = (function(__super__) {
    inherits(EveryObserver, __super__);
    function EveryObserver(o, fn, s) {
      this._o = o;
      this._fn = fn;
      this._s = s;
      this._i = 0;
      __super__.call(this);
    }
    EveryObserver.prototype.next = function(x) {
      var result = tryCatch(this._fn)(x, this._i++, this._s);
      if (result === errorObj) {
        return this._o.onError(result.e);
      }
      if (!Boolean(result)) {
        this._o.onNext(false);
        this._o.onCompleted();
      }
    };
    EveryObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    EveryObserver.prototype.completed = function() {
      this._o.onNext(true);
      this._o.onCompleted();
    };
    return EveryObserver;
  }(AbstractObserver));
  observableProto.every = function(predicate, thisArg) {
    var fn = bindCallback(predicate, thisArg, 3);
    return new EveryObservable(this, fn);
  };
  var IncludesObservable = (function(__super__) {
    inherits(IncludesObservable, __super__);
    function IncludesObservable(source, elem, idx) {
      var n = +idx || 0;
      Math.abs(n) === Infinity && (n = 0);
      this.source = source;
      this._elem = elem;
      this._n = n;
      __super__.call(this);
    }
    IncludesObservable.prototype.subscribeCore = function(o) {
      if (this._n < 0) {
        o.onNext(false);
        o.onCompleted();
        return disposableEmpty;
      }
      return this.source.subscribe(new IncludesObserver(o, this._elem, this._n));
    };
    return IncludesObservable;
  }(ObservableBase));
  var IncludesObserver = (function(__super__) {
    inherits(IncludesObserver, __super__);
    function IncludesObserver(o, elem, n) {
      this._o = o;
      this._elem = elem;
      this._n = n;
      this._i = 0;
      __super__.call(this);
    }
    function comparer(a, b) {
      return (a === 0 && b === 0) || (a === b || (isNaN(a) && isNaN(b)));
    }
    IncludesObserver.prototype.next = function(x) {
      if (this._i++ >= this._n && comparer(x, this._elem)) {
        this._o.onNext(true);
        this._o.onCompleted();
      }
    };
    IncludesObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    IncludesObserver.prototype.completed = function() {
      this._o.onNext(false);
      this._o.onCompleted();
    };
    return IncludesObserver;
  }(AbstractObserver));
  observableProto.includes = function(searchElement, fromIndex) {
    return new IncludesObservable(this, searchElement, fromIndex);
  };
  var CountObservable = (function(__super__) {
    inherits(CountObservable, __super__);
    function CountObservable(source, fn) {
      this.source = source;
      this._fn = fn;
      __super__.call(this);
    }
    CountObservable.prototype.subscribeCore = function(o) {
      return this.source.subscribe(new CountObserver(o, this._fn, this.source));
    };
    return CountObservable;
  }(ObservableBase));
  var CountObserver = (function(__super__) {
    inherits(CountObserver, __super__);
    function CountObserver(o, fn, s) {
      this._o = o;
      this._fn = fn;
      this._s = s;
      this._i = 0;
      this._c = 0;
      __super__.call(this);
    }
    CountObserver.prototype.next = function(x) {
      if (this._fn) {
        var result = tryCatch(this._fn)(x, this._i++, this._s);
        if (result === errorObj) {
          return this._o.onError(result.e);
        }
        Boolean(result) && (this._c++);
      } else {
        this._c++;
      }
    };
    CountObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    CountObserver.prototype.completed = function() {
      this._o.onNext(this._c);
      this._o.onCompleted();
    };
    return CountObserver;
  }(AbstractObserver));
  observableProto.count = function(predicate, thisArg) {
    var fn = bindCallback(predicate, thisArg, 3);
    return new CountObservable(this, fn);
  };
  var IndexOfObservable = (function(__super__) {
    inherits(IndexOfObservable, __super__);
    function IndexOfObservable(source, e, n) {
      this.source = source;
      this._e = e;
      this._n = n;
      __super__.call(this);
    }
    IndexOfObservable.prototype.subscribeCore = function(o) {
      if (this._n < 0) {
        o.onNext(-1);
        o.onCompleted();
        return disposableEmpty;
      }
      return this.source.subscribe(new IndexOfObserver(o, this._e, this._n));
    };
    return IndexOfObservable;
  }(ObservableBase));
  var IndexOfObserver = (function(__super__) {
    inherits(IndexOfObserver, __super__);
    function IndexOfObserver(o, e, n) {
      this._o = o;
      this._e = e;
      this._n = n;
      this._i = 0;
      __super__.call(this);
    }
    IndexOfObserver.prototype.next = function(x) {
      if (this._i >= this._n && x === this._e) {
        this._o.onNext(this._i);
        this._o.onCompleted();
      }
      this._i++;
    };
    IndexOfObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    IndexOfObserver.prototype.completed = function() {
      this._o.onNext(-1);
      this._o.onCompleted();
    };
    return IndexOfObserver;
  }(AbstractObserver));
  observableProto.indexOf = function(searchElement, fromIndex) {
    var n = +fromIndex || 0;
    Math.abs(n) === Infinity && (n = 0);
    return new IndexOfObservable(this, searchElement, n);
  };
  var SumObservable = (function(__super__) {
    inherits(SumObservable, __super__);
    function SumObservable(source, fn) {
      this.source = source;
      this._fn = fn;
      __super__.call(this);
    }
    SumObservable.prototype.subscribeCore = function(o) {
      return this.source.subscribe(new SumObserver(o, this._fn, this.source));
    };
    return SumObservable;
  }(ObservableBase));
  var SumObserver = (function(__super__) {
    inherits(SumObserver, __super__);
    function SumObserver(o, fn, s) {
      this._o = o;
      this._fn = fn;
      this._s = s;
      this._i = 0;
      this._c = 0;
      __super__.call(this);
    }
    SumObserver.prototype.next = function(x) {
      if (this._fn) {
        var result = tryCatch(this._fn)(x, this._i++, this._s);
        if (result === errorObj) {
          return this._o.onError(result.e);
        }
        this._c += result;
      } else {
        this._c += x;
      }
    };
    SumObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    SumObserver.prototype.completed = function() {
      this._o.onNext(this._c);
      this._o.onCompleted();
    };
    return SumObserver;
  }(AbstractObserver));
  observableProto.sum = function(keySelector, thisArg) {
    var fn = bindCallback(keySelector, thisArg, 3);
    return new SumObservable(this, fn);
  };
  observableProto.minBy = function(keySelector, comparer) {
    comparer || (comparer = defaultSubComparer);
    return new ExtremaByObservable(this, keySelector, function(x, y) {
      return comparer(x, y) * -1;
    });
  };
  observableProto.min = function(comparer) {
    return this.minBy(identity, comparer).map(function(x) {
      return firstOnly(x);
    });
  };
  observableProto.maxBy = function(keySelector, comparer) {
    comparer || (comparer = defaultSubComparer);
    return new ExtremaByObservable(this, keySelector, comparer);
  };
  observableProto.max = function(comparer) {
    return this.maxBy(identity, comparer).map(function(x) {
      return firstOnly(x);
    });
  };
  var AverageObservable = (function(__super__) {
    inherits(AverageObservable, __super__);
    function AverageObservable(source, fn) {
      this.source = source;
      this._fn = fn;
      __super__.call(this);
    }
    AverageObservable.prototype.subscribeCore = function(o) {
      return this.source.subscribe(new AverageObserver(o, this._fn, this.source));
    };
    return AverageObservable;
  }(ObservableBase));
  var AverageObserver = (function(__super__) {
    inherits(AverageObserver, __super__);
    function AverageObserver(o, fn, s) {
      this._o = o;
      this._fn = fn;
      this._s = s;
      this._c = 0;
      this._t = 0;
      __super__.call(this);
    }
    AverageObserver.prototype.next = function(x) {
      if (this._fn) {
        var r = tryCatch(this._fn)(x, this._c++, this._s);
        if (r === errorObj) {
          return this._o.onError(r.e);
        }
        this._t += r;
      } else {
        this._c++;
        this._t += x;
      }
    };
    AverageObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    AverageObserver.prototype.completed = function() {
      if (this._c === 0) {
        return this._o.onError(new EmptyError());
      }
      this._o.onNext(this._t / this._c);
      this._o.onCompleted();
    };
    return AverageObserver;
  }(AbstractObserver));
  observableProto.average = function(keySelector, thisArg) {
    var source = this,
        fn;
    if (isFunction(keySelector)) {
      fn = bindCallback(keySelector, thisArg, 3);
    }
    return new AverageObservable(source, fn);
  };
  observableProto.sequenceEqual = function(second, comparer) {
    var first = this;
    comparer || (comparer = defaultComparer);
    return new AnonymousObservable(function(o) {
      var donel = false,
          doner = false,
          ql = [],
          qr = [];
      var subscription1 = first.subscribe(function(x) {
        if (qr.length > 0) {
          var v = qr.shift();
          var equal = tryCatch(comparer)(v, x);
          if (equal === errorObj) {
            return o.onError(equal.e);
          }
          if (!equal) {
            o.onNext(false);
            o.onCompleted();
          }
        } else if (doner) {
          o.onNext(false);
          o.onCompleted();
        } else {
          ql.push(x);
        }
      }, function(e) {
        o.onError(e);
      }, function() {
        donel = true;
        if (ql.length === 0) {
          if (qr.length > 0) {
            o.onNext(false);
            o.onCompleted();
          } else if (doner) {
            o.onNext(true);
            o.onCompleted();
          }
        }
      });
      (isArrayLike(second) || isIterable(second)) && (second = observableFrom(second));
      isPromise(second) && (second = observableFromPromise(second));
      var subscription2 = second.subscribe(function(x) {
        if (ql.length > 0) {
          var v = ql.shift();
          var equal = tryCatch(comparer)(v, x);
          if (equal === errorObj) {
            return o.onError(equal.e);
          }
          if (!equal) {
            o.onNext(false);
            o.onCompleted();
          }
        } else if (donel) {
          o.onNext(false);
          o.onCompleted();
        } else {
          qr.push(x);
        }
      }, function(e) {
        o.onError(e);
      }, function() {
        doner = true;
        if (qr.length === 0) {
          if (ql.length > 0) {
            o.onNext(false);
            o.onCompleted();
          } else if (donel) {
            o.onNext(true);
            o.onCompleted();
          }
        }
      });
      return new BinaryDisposable(subscription1, subscription2);
    }, first);
  };
  var ElementAtObservable = (function(__super__) {
    inherits(ElementAtObservable, __super__);
    function ElementAtObservable(source, i, d) {
      this.source = source;
      this._i = i;
      this._d = d;
      __super__.call(this);
    }
    ElementAtObservable.prototype.subscribeCore = function(o) {
      return this.source.subscribe(new ElementAtObserver(o, this._i, this._d));
    };
    return ElementAtObservable;
  }(ObservableBase));
  var ElementAtObserver = (function(__super__) {
    inherits(ElementAtObserver, __super__);
    function ElementAtObserver(o, i, d) {
      this._o = o;
      this._i = i;
      this._d = d;
      __super__.call(this);
    }
    ElementAtObserver.prototype.next = function(x) {
      if (this._i-- === 0) {
        this._o.onNext(x);
        this._o.onCompleted();
      }
    };
    ElementAtObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    ElementAtObserver.prototype.completed = function() {
      if (this._d === undefined) {
        this._o.onError(new ArgumentOutOfRangeError());
      } else {
        this._o.onNext(this._d);
        this._o.onCompleted();
      }
    };
    return ElementAtObserver;
  }(AbstractObserver));
  observableProto.elementAt = function(index, defaultValue) {
    if (index < 0) {
      throw new ArgumentOutOfRangeError();
    }
    return new ElementAtObservable(this, index, defaultValue);
  };
  var SingleObserver = (function(__super__) {
    inherits(SingleObserver, __super__);
    function SingleObserver(o, obj, s) {
      this._o = o;
      this._obj = obj;
      this._s = s;
      this._i = 0;
      this._hv = false;
      this._v = null;
      __super__.call(this);
    }
    SingleObserver.prototype.next = function(x) {
      var shouldYield = false;
      if (this._obj.predicate) {
        var res = tryCatch(this._obj.predicate)(x, this._i++, this._s);
        if (res === errorObj) {
          return this._o.onError(res.e);
        }
        Boolean(res) && (shouldYield = true);
      } else if (!this._obj.predicate) {
        shouldYield = true;
      }
      if (shouldYield) {
        if (this._hv) {
          return this._o.onError(new Error('Sequence contains more than one matching element'));
        }
        this._hv = true;
        this._v = x;
      }
    };
    SingleObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    SingleObserver.prototype.completed = function() {
      if (this._hv) {
        this._o.onNext(this._v);
        this._o.onCompleted();
      } else if (this._obj.defaultValue === undefined) {
        this._o.onError(new EmptyError());
      } else {
        this._o.onNext(this._obj.defaultValue);
        this._o.onCompleted();
      }
    };
    return SingleObserver;
  }(AbstractObserver));
  observableProto.single = function(predicate, thisArg) {
    var obj = {},
        source = this;
    if (typeof arguments[0] === 'object') {
      obj = arguments[0];
    } else {
      obj = {
        predicate: arguments[0],
        thisArg: arguments[1],
        defaultValue: arguments[2]
      };
    }
    if (isFunction(obj.predicate)) {
      var fn = obj.predicate;
      obj.predicate = bindCallback(fn, obj.thisArg, 3);
    }
    return new AnonymousObservable(function(o) {
      return source.subscribe(new SingleObserver(o, obj, source));
    }, source);
  };
  var FirstObservable = (function(__super__) {
    inherits(FirstObservable, __super__);
    function FirstObservable(source, obj) {
      this.source = source;
      this._obj = obj;
      __super__.call(this);
    }
    FirstObservable.prototype.subscribeCore = function(o) {
      return this.source.subscribe(new FirstObserver(o, this._obj, this.source));
    };
    return FirstObservable;
  }(ObservableBase));
  var FirstObserver = (function(__super__) {
    inherits(FirstObserver, __super__);
    function FirstObserver(o, obj, s) {
      this._o = o;
      this._obj = obj;
      this._s = s;
      this._i = 0;
      __super__.call(this);
    }
    FirstObserver.prototype.next = function(x) {
      if (this._obj.predicate) {
        var res = tryCatch(this._obj.predicate)(x, this._i++, this._s);
        if (res === errorObj) {
          return this._o.onError(res.e);
        }
        if (Boolean(res)) {
          this._o.onNext(x);
          this._o.onCompleted();
        }
      } else if (!this._obj.predicate) {
        this._o.onNext(x);
        this._o.onCompleted();
      }
    };
    FirstObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    FirstObserver.prototype.completed = function() {
      if (this._obj.defaultValue === undefined) {
        this._o.onError(new EmptyError());
      } else {
        this._o.onNext(this._obj.defaultValue);
        this._o.onCompleted();
      }
    };
    return FirstObserver;
  }(AbstractObserver));
  observableProto.first = function() {
    var obj = {},
        source = this;
    if (typeof arguments[0] === 'object') {
      obj = arguments[0];
    } else {
      obj = {
        predicate: arguments[0],
        thisArg: arguments[1],
        defaultValue: arguments[2]
      };
    }
    if (isFunction(obj.predicate)) {
      var fn = obj.predicate;
      obj.predicate = bindCallback(fn, obj.thisArg, 3);
    }
    return new FirstObservable(this, obj);
  };
  var LastObservable = (function(__super__) {
    inherits(LastObservable, __super__);
    function LastObservable(source, obj) {
      this.source = source;
      this._obj = obj;
      __super__.call(this);
    }
    LastObservable.prototype.subscribeCore = function(o) {
      return this.source.subscribe(new LastObserver(o, this._obj, this.source));
    };
    return LastObservable;
  }(ObservableBase));
  var LastObserver = (function(__super__) {
    inherits(LastObserver, __super__);
    function LastObserver(o, obj, s) {
      this._o = o;
      this._obj = obj;
      this._s = s;
      this._i = 0;
      this._hv = false;
      this._v = null;
      __super__.call(this);
    }
    LastObserver.prototype.next = function(x) {
      var shouldYield = false;
      if (this._obj.predicate) {
        var res = tryCatch(this._obj.predicate)(x, this._i++, this._s);
        if (res === errorObj) {
          return this._o.onError(res.e);
        }
        Boolean(res) && (shouldYield = true);
      } else if (!this._obj.predicate) {
        shouldYield = true;
      }
      if (shouldYield) {
        this._hv = true;
        this._v = x;
      }
    };
    LastObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    LastObserver.prototype.completed = function() {
      if (this._hv) {
        this._o.onNext(this._v);
        this._o.onCompleted();
      } else if (this._obj.defaultValue === undefined) {
        this._o.onError(new EmptyError());
      } else {
        this._o.onNext(this._obj.defaultValue);
        this._o.onCompleted();
      }
    };
    return LastObserver;
  }(AbstractObserver));
  observableProto.last = function() {
    var obj = {},
        source = this;
    if (typeof arguments[0] === 'object') {
      obj = arguments[0];
    } else {
      obj = {
        predicate: arguments[0],
        thisArg: arguments[1],
        defaultValue: arguments[2]
      };
    }
    if (isFunction(obj.predicate)) {
      var fn = obj.predicate;
      obj.predicate = bindCallback(fn, obj.thisArg, 3);
    }
    return new LastObservable(this, obj);
  };
  var FindValueObserver = (function(__super__) {
    inherits(FindValueObserver, __super__);
    function FindValueObserver(observer, source, callback, yieldIndex) {
      this._o = observer;
      this._s = source;
      this._cb = callback;
      this._y = yieldIndex;
      this._i = 0;
      __super__.call(this);
    }
    FindValueObserver.prototype.next = function(x) {
      var shouldRun = tryCatch(this._cb)(x, this._i, this._s);
      if (shouldRun === errorObj) {
        return this._o.onError(shouldRun.e);
      }
      if (shouldRun) {
        this._o.onNext(this._y ? this._i : x);
        this._o.onCompleted();
      } else {
        this._i++;
      }
    };
    FindValueObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    FindValueObserver.prototype.completed = function() {
      this._y && this._o.onNext(-1);
      this._o.onCompleted();
    };
    return FindValueObserver;
  }(AbstractObserver));
  function findValue(source, predicate, thisArg, yieldIndex) {
    var callback = bindCallback(predicate, thisArg, 3);
    return new AnonymousObservable(function(o) {
      return source.subscribe(new FindValueObserver(o, source, callback, yieldIndex));
    }, source);
  }
  observableProto.find = function(predicate, thisArg) {
    return findValue(this, predicate, thisArg, false);
  };
  observableProto.findIndex = function(predicate, thisArg) {
    return findValue(this, predicate, thisArg, true);
  };
  var ToSetObservable = (function(__super__) {
    inherits(ToSetObservable, __super__);
    function ToSetObservable(source) {
      this.source = source;
      __super__.call(this);
    }
    ToSetObservable.prototype.subscribeCore = function(o) {
      return this.source.subscribe(new ToSetObserver(o));
    };
    return ToSetObservable;
  }(ObservableBase));
  var ToSetObserver = (function(__super__) {
    inherits(ToSetObserver, __super__);
    function ToSetObserver(o) {
      this._o = o;
      this._s = new root.Set();
      __super__.call(this);
    }
    ToSetObserver.prototype.next = function(x) {
      this._s.add(x);
    };
    ToSetObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    ToSetObserver.prototype.completed = function() {
      this._o.onNext(this._s);
      this._o.onCompleted();
    };
    return ToSetObserver;
  }(AbstractObserver));
  observableProto.toSet = function() {
    if (typeof root.Set === 'undefined') {
      throw new TypeError();
    }
    return new ToSetObservable(this);
  };
  var ToMapObservable = (function(__super__) {
    inherits(ToMapObservable, __super__);
    function ToMapObservable(source, k, e) {
      this.source = source;
      this._k = k;
      this._e = e;
      __super__.call(this);
    }
    ToMapObservable.prototype.subscribeCore = function(o) {
      return this.source.subscribe(new ToMapObserver(o, this._k, this._e));
    };
    return ToMapObservable;
  }(ObservableBase));
  var ToMapObserver = (function(__super__) {
    inherits(ToMapObserver, __super__);
    function ToMapObserver(o, k, e) {
      this._o = o;
      this._k = k;
      this._e = e;
      this._m = new root.Map();
      __super__.call(this);
    }
    ToMapObserver.prototype.next = function(x) {
      var key = tryCatch(this._k)(x);
      if (key === errorObj) {
        return this._o.onError(key.e);
      }
      var elem = x;
      if (this._e) {
        elem = tryCatch(this._e)(x);
        if (elem === errorObj) {
          return this._o.onError(elem.e);
        }
      }
      this._m.set(key, elem);
    };
    ToMapObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    ToMapObserver.prototype.completed = function() {
      this._o.onNext(this._m);
      this._o.onCompleted();
    };
    return ToMapObserver;
  }(AbstractObserver));
  observableProto.toMap = function(keySelector, elementSelector) {
    if (typeof root.Map === 'undefined') {
      throw new TypeError();
    }
    return new ToMapObservable(this, keySelector, elementSelector);
  };
  var SliceObservable = (function(__super__) {
    inherits(SliceObservable, __super__);
    function SliceObservable(source, b, e) {
      this.source = source;
      this._b = b;
      this._e = e;
      __super__.call(this);
    }
    SliceObservable.prototype.subscribeCore = function(o) {
      return this.source.subscribe(new SliceObserver(o, this._b, this._e));
    };
    return SliceObservable;
  }(ObservableBase));
  var SliceObserver = (function(__super__) {
    inherits(SliceObserver, __super__);
    function SliceObserver(o, b, e) {
      this._o = o;
      this._b = b;
      this._e = e;
      this._i = 0;
      __super__.call(this);
    }
    SliceObserver.prototype.next = function(x) {
      if (this._i >= this._b) {
        if (this._e === this._i) {
          this._o.onCompleted();
        } else {
          this._o.onNext(x);
        }
      }
      this._i++;
    };
    SliceObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    SliceObserver.prototype.completed = function() {
      this._o.onCompleted();
    };
    return SliceObserver;
  }(AbstractObserver));
  observableProto.slice = function(begin, end) {
    var start = begin || 0;
    if (start < 0) {
      throw new Rx.ArgumentOutOfRangeError();
    }
    if (typeof end === 'number' && end < start) {
      throw new Rx.ArgumentOutOfRangeError();
    }
    return new SliceObservable(this, start, end);
  };
  var LastIndexOfObservable = (function(__super__) {
    inherits(LastIndexOfObservable, __super__);
    function LastIndexOfObservable(source, e, n) {
      this.source = source;
      this._e = e;
      this._n = n;
      __super__.call(this);
    }
    LastIndexOfObservable.prototype.subscribeCore = function(o) {
      if (this._n < 0) {
        o.onNext(-1);
        o.onCompleted();
        return disposableEmpty;
      }
      return this.source.subscribe(new LastIndexOfObserver(o, this._e, this._n));
    };
    return LastIndexOfObservable;
  }(ObservableBase));
  var LastIndexOfObserver = (function(__super__) {
    inherits(LastIndexOfObserver, __super__);
    function LastIndexOfObserver(o, e, n) {
      this._o = o;
      this._e = e;
      this._n = n;
      this._v = 0;
      this._hv = false;
      this._i = 0;
      __super__.call(this);
    }
    LastIndexOfObserver.prototype.next = function(x) {
      if (this._i >= this._n && x === this._e) {
        this._hv = true;
        this._v = this._i;
      }
      this._i++;
    };
    LastIndexOfObserver.prototype.error = function(e) {
      this._o.onError(e);
    };
    LastIndexOfObserver.prototype.completed = function() {
      if (this._hv) {
        this._o.onNext(this._v);
      } else {
        this._o.onNext(-1);
      }
      this._o.onCompleted();
    };
    return LastIndexOfObserver;
  }(AbstractObserver));
  observableProto.lastIndexOf = function(searchElement, fromIndex) {
    var n = +fromIndex || 0;
    Math.abs(n) === Infinity && (n = 0);
    return new LastIndexOfObservable(this, searchElement, n);
  };
  return Rx;
}));
