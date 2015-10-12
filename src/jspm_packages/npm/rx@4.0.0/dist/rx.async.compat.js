/* */ 
"format cjs";
(function(process) {
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
      define(['./rx.binding', 'exports'], function(Rx, exports) {
        root.Rx = factory(root, exports, Rx);
        return root.Rx;
      });
    } else if (typeof module === 'object' && module && module.exports === freeExports) {
      module.exports = factory(root, module.exports, require('./rx'));
    } else {
      root.Rx = factory(root, {}, root.Rx);
    }
  }.call(this, function(root, exp, Rx, undefined) {
    var Observable = Rx.Observable,
        observableFromPromise = Observable.fromPromise,
        observableThrow = Observable.throwError,
        AnonymousObservable = Rx.AnonymousObservable,
        AsyncSubject = Rx.AsyncSubject,
        disposableCreate = Rx.Disposable.create,
        CompositeDisposable = Rx.CompositeDisposable,
        immediateScheduler = Rx.Scheduler.immediate,
        defaultScheduler = Rx.Scheduler['default'],
        isScheduler = Rx.Scheduler.isScheduler,
        isPromise = Rx.helpers.isPromise,
        isFunction = Rx.helpers.isFunction,
        isIterable = Rx.helpers.isIterable,
        isArrayLike = Rx.helpers.isArrayLike;
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
    Observable.wrap = function(fn) {
      createObservable.__generatorFunction__ = fn;
      return createObservable;
      function createObservable() {
        return Observable.spawn.call(this, fn.apply(this, arguments));
      }
    };
    var spawn = Observable.spawn = function() {
      var gen = arguments[0],
          self = this,
          args = [];
      for (var i = 1,
          len = arguments.length; i < len; i++) {
        args.push(arguments[i]);
      }
      return new AnonymousObservable(function(o) {
        var g = new CompositeDisposable();
        if (isFunction(gen)) {
          gen = gen.apply(self, args);
        }
        if (!gen || !isFunction(gen.next)) {
          o.onNext(gen);
          return o.onCompleted();
        }
        processGenerator();
        function processGenerator(res) {
          var ret = tryCatch(gen.next).call(gen, res);
          if (ret === errorObj) {
            return o.onError(ret.e);
          }
          next(ret);
        }
        function onError(err) {
          var ret = tryCatch(gen.next).call(gen, err);
          if (ret === errorObj) {
            return o.onError(ret.e);
          }
          next(ret);
        }
        function next(ret) {
          if (ret.done) {
            o.onNext(ret.value);
            o.onCompleted();
            return;
          }
          var value = toObservable.call(self, ret.value);
          if (Observable.isObservable(value)) {
            g.add(value.subscribe(processGenerator, onError));
          } else {
            onError(new TypeError('type not supported'));
          }
        }
        return g;
      });
    };
    function toObservable(obj) {
      if (!obj) {
        return obj;
      }
      if (Observable.isObservable(obj)) {
        return obj;
      }
      if (isPromise(obj)) {
        return Observable.fromPromise(obj);
      }
      if (isGeneratorFunction(obj) || isGenerator(obj)) {
        return spawn.call(this, obj);
      }
      if (isFunction(obj)) {
        return thunkToObservable.call(this, obj);
      }
      if (isArrayLike(obj) || isIterable(obj)) {
        return arrayToObservable.call(this, obj);
      }
      if (isObject(obj)) {
        return objectToObservable.call(this, obj);
      }
      return obj;
    }
    function arrayToObservable(obj) {
      return Observable.from(obj).flatMap(toObservable).toArray();
    }
    function objectToObservable(obj) {
      var results = new obj.constructor(),
          keys = Object.keys(obj),
          observables = [];
      for (var i = 0,
          len = keys.length; i < len; i++) {
        var key = keys[i];
        var observable = toObservable.call(this, obj[key]);
        if (observable && Observable.isObservable(observable)) {
          defer(observable, key);
        } else {
          results[key] = obj[key];
        }
      }
      return Observable.forkJoin.apply(Observable, observables).map(function() {
        return results;
      });
      function defer(observable, key) {
        results[key] = undefined;
        observables.push(observable.map(function(next) {
          results[key] = next;
        }));
      }
    }
    function thunkToObservable(fn) {
      var self = this;
      return new AnonymousObservable(function(o) {
        fn.call(self, function() {
          var err = arguments[0],
              res = arguments[1];
          if (err) {
            return o.onError(err);
          }
          if (arguments.length > 2) {
            var args = [];
            for (var i = 1,
                len = arguments.length; i < len; i++) {
              args.push(arguments[i]);
            }
            res = args;
          }
          o.onNext(res);
          o.onCompleted();
        });
      });
    }
    function isGenerator(obj) {
      return isFunction(obj.next) && isFunction(obj.throw);
    }
    function isGeneratorFunction(obj) {
      var ctor = obj.constructor;
      if (!ctor) {
        return false;
      }
      if (ctor.name === 'GeneratorFunction' || ctor.displayName === 'GeneratorFunction') {
        return true;
      }
      return isGenerator(ctor.prototype);
    }
    function isObject(val) {
      return Object == val.constructor;
    }
    Observable.start = function(func, context, scheduler) {
      return observableToAsync(func, context, scheduler)();
    };
    var observableToAsync = Observable.toAsync = function(func, context, scheduler) {
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      return function() {
        var args = arguments,
            subject = new AsyncSubject();
        scheduler.schedule(null, function() {
          var result;
          try {
            result = func.apply(context, args);
          } catch (e) {
            subject.onError(e);
            return;
          }
          subject.onNext(result);
          subject.onCompleted();
        });
        return subject.asObservable();
      };
    };
    function createCbObservable(fn, ctx, selector, args) {
      var o = new AsyncSubject();
      args.push(createCbHandler(o, ctx, selector));
      fn.apply(ctx, args);
      return o.asObservable();
    }
    function createCbHandler(o, ctx, selector) {
      return function handler() {
        var len = arguments.length,
            results = new Array(len);
        for (var i = 0; i < len; i++) {
          results[i] = arguments[i];
        }
        if (isFunction(selector)) {
          results = tryCatch(selector).apply(ctx, results);
          if (results === errorObj) {
            return o.onError(results.e);
          }
          o.onNext(results);
        } else {
          if (results.length <= 1) {
            o.onNext(results[0]);
          } else {
            o.onNext(results);
          }
        }
        o.onCompleted();
      };
    }
    Observable.fromCallback = function(fn, ctx, selector) {
      return function() {
        typeof ctx === 'undefined' && (ctx = this);
        var len = arguments.length,
            args = new Array(len);
        for (var i = 0; i < len; i++) {
          args[i] = arguments[i];
        }
        return createCbObservable(fn, ctx, selector, args);
      };
    };
    function createNodeObservable(fn, ctx, selector, args) {
      var o = new AsyncSubject();
      args.push(createNodeHandler(o, ctx, selector));
      fn.apply(ctx, args);
      return o.asObservable();
    }
    function createNodeHandler(o, ctx, selector) {
      return function handler() {
        var err = arguments[0];
        if (err) {
          return o.onError(err);
        }
        var len = arguments.length,
            results = [];
        for (var i = 1; i < len; i++) {
          results[i - 1] = arguments[i];
        }
        if (isFunction(selector)) {
          var results = tryCatch(selector).apply(ctx, results);
          if (results === errorObj) {
            return o.onError(results.e);
          }
          o.onNext(results);
        } else {
          if (results.length <= 1) {
            o.onNext(results[0]);
          } else {
            o.onNext(results);
          }
        }
        o.onCompleted();
      };
    }
    Observable.fromNodeCallback = function(fn, ctx, selector) {
      return function() {
        typeof ctx === 'undefined' && (ctx = this);
        var len = arguments.length,
            args = new Array(len);
        for (var i = 0; i < len; i++) {
          args[i] = arguments[i];
        }
        return createNodeObservable(fn, ctx, selector, args);
      };
    };
    function isNodeList(el) {
      if (window.StaticNodeList) {
        return (el instanceof window.StaticNodeList || el instanceof window.NodeList);
      } else {
        return (Object.prototype.toString.call(el) == '[object NodeList]');
      }
    }
    function fixEvent(event) {
      var stopPropagation = function() {
        this.cancelBubble = true;
      };
      var preventDefault = function() {
        this.bubbledKeyCode = this.keyCode;
        if (this.ctrlKey) {
          try {
            this.keyCode = 0;
          } catch (e) {}
        }
        this.defaultPrevented = true;
        this.returnValue = false;
        this.modified = true;
      };
      event || (event = root.event);
      if (!event.target) {
        event.target = event.target || event.srcElement;
        if (event.type == 'mouseover') {
          event.relatedTarget = event.fromElement;
        }
        if (event.type == 'mouseout') {
          event.relatedTarget = event.toElement;
        }
        if (!event.stopPropagation) {
          event.stopPropagation = stopPropagation;
          event.preventDefault = preventDefault;
        }
        switch (event.type) {
          case 'keypress':
            var c = ('charCode' in event ? event.charCode : event.keyCode);
            if (c == 10) {
              c = 0;
              event.keyCode = 13;
            } else if (c == 13 || c == 27) {
              c = 0;
            } else if (c == 3) {
              c = 99;
            }
            event.charCode = c;
            event.keyChar = event.charCode ? String.fromCharCode(event.charCode) : '';
            break;
        }
      }
      return event;
    }
    function ListenDisposable(e, n, fn) {
      this._e = e;
      this._n = n;
      this._fn = fn;
      this._e.addEventListener(this._n, this._fn, false);
      this.isDisposed = false;
    }
    ListenDisposable.prototype.dispose = function() {
      if (!this.isDisposed) {
        this._e.removeEventListener(this._n, this._fn, false);
        this.isDisposed = true;
      }
    };
    function AttachEventDisposable(e, n, fn) {
      this._e = e;
      this._n = 'on' + n;
      this._fn = function(e) {
        fn(fixEvent(e));
      };
      this._e.attachEvent(this._n, this._fn);
      this.isDisposed = false;
    }
    AttachEventDisposable.prototype.dispose = function() {
      if (!this.isDisposed) {
        this._e.detachEvent(this._n, this._fn);
        this.isDisposed = true;
      }
    };
    function LevelOneDisposable(e, n, fn) {
      this._e = e;
      this._n = 'on' + n;
      this._e[this._n] = fn;
      this.isDisposed = false;
    }
    LevelOneDisposable.prototype.dispose = function() {
      if (!this.isDisposed) {
        this._e[this._n] = null;
        this.isDisposed = true;
      }
    };
    function createListener(el, eventName, handler) {
      if (el.addEventListener) {
        return new ListenDisposable(el, eventName, handler);
      }
      if (el.attachEvent) {
        return new AttachEventDisposable(el, eventName, handler);
      }
      return LevelOneDisposable(el, eventName, handler);
    }
    function createEventListener(el, eventName, handler) {
      var disposables = new CompositeDisposable();
      if (isNodeList(el) || Object.prototype.toString.call(el) === '[object HTMLCollection]') {
        for (var i = 0,
            len = el.length; i < len; i++) {
          disposables.add(createEventListener(el.item(i), eventName, handler));
        }
      } else if (el) {
        disposables.add(createListener(el, eventName, handler));
      }
      return disposables;
    }
    Rx.config.useNativeEvents = false;
    Observable.fromEvent = function(element, eventName, selector) {
      if (element.addListener) {
        return fromEventPattern(function(h) {
          element.addListener(eventName, h);
        }, function(h) {
          element.removeListener(eventName, h);
        }, selector);
      }
      if (!Rx.config.useNativeEvents) {
        if (typeof element.on === 'function' && typeof element.off === 'function') {
          return fromEventPattern(function(h) {
            element.on(eventName, h);
          }, function(h) {
            element.off(eventName, h);
          }, selector);
        }
      }
      return new AnonymousObservable(function(o) {
        return createEventListener(element, eventName, function handler() {
          var results = arguments[0];
          if (isFunction(selector)) {
            results = tryCatch(selector).apply(null, arguments);
            if (results === errorObj) {
              return o.onError(results.e);
            }
          }
          o.onNext(results);
        });
      }).publish().refCount();
    };
    var fromEventPattern = Observable.fromEventPattern = function(addHandler, removeHandler, selector, scheduler) {
      isScheduler(scheduler) || (scheduler = immediateScheduler);
      return new AnonymousObservable(function(o) {
        function innerHandler() {
          var result = arguments[0];
          if (isFunction(selector)) {
            result = tryCatch(selector).apply(null, arguments);
            if (result === errorObj) {
              return o.onError(result.e);
            }
          }
          o.onNext(result);
        }
        var returnValue = addHandler(innerHandler);
        return disposableCreate(function() {
          isFunction(removeHandler) && removeHandler(innerHandler, returnValue);
        });
      }).publish().refCount();
    };
    Observable.startAsync = function(functionAsync) {
      var promise = tryCatch(functionAsync)();
      if (promise === errorObj) {
        return observableThrow(promise.e);
      }
      return observableFromPromise(promise);
    };
    return Rx;
  }));
})(require('process'));
