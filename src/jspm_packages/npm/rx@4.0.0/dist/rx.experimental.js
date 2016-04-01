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
      FlatMapObservable = Rx.FlatMapObservable,
      observableConcat = Observable.concat,
      observableDefer = Observable.defer,
      observableEmpty = Observable.empty,
      disposableEmpty = Rx.Disposable.empty,
      CompositeDisposable = Rx.CompositeDisposable,
      BinaryDisposable = Rx.BinaryDisposable,
      SerialDisposable = Rx.SerialDisposable,
      SingleAssignmentDisposable = Rx.SingleAssignmentDisposable,
      Enumerable = Rx.internals.Enumerable,
      enumerableOf = Enumerable.of,
      immediateScheduler = Rx.Scheduler.immediate,
      currentThreadScheduler = Rx.Scheduler.currentThread,
      AsyncSubject = Rx.AsyncSubject,
      Observer = Rx.Observer,
      inherits = Rx.internals.inherits,
      addProperties = Rx.internals.addProperties,
      helpers = Rx.helpers,
      noop = helpers.noop,
      isPromise = helpers.isPromise,
      isFunction = helpers.isFunction,
      isIterable = Rx.helpers.isIterable,
      isArrayLike = Rx.helpers.isArrayLike,
      isScheduler = Rx.Scheduler.isScheduler,
      observableFromPromise = Observable.fromPromise;
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
  var $iterator$ = (typeof Symbol === 'function' && Symbol.iterator) || '_es6shim_iterator_';
  if (root.Set && typeof new root.Set()['@@iterator'] === 'function') {
    $iterator$ = '@@iterator';
  }
  var doneEnumerator = Rx.doneEnumerator = {
    done: true,
    value: undefined
  };
  var isIterable = Rx.helpers.isIterable = function(o) {
    return o[$iterator$] !== undefined;
  };
  var isArrayLike = Rx.helpers.isArrayLike = function(o) {
    return o && o.length !== undefined;
  };
  Rx.helpers.iterator = $iterator$;
  var WhileEnumerable = (function(__super__) {
    inherits(WhileEnumerable, __super__);
    function WhileEnumerable(c, s) {
      this.c = c;
      this.s = s;
    }
    WhileEnumerable.prototype[$iterator$] = function() {
      var self = this;
      return {next: function() {
          return self.c() ? {
            done: false,
            value: self.s
          } : {
            done: true,
            value: void 0
          };
        }};
    };
    return WhileEnumerable;
  }(Enumerable));
  function enumerableWhile(condition, source) {
    return new WhileEnumerable(condition, source);
  }
  observableProto.letBind = observableProto['let'] = function(func) {
    return func(this);
  };
  Observable['if'] = function(condition, thenSource, elseSourceOrScheduler) {
    return observableDefer(function() {
      elseSourceOrScheduler || (elseSourceOrScheduler = observableEmpty());
      isPromise(thenSource) && (thenSource = observableFromPromise(thenSource));
      isPromise(elseSourceOrScheduler) && (elseSourceOrScheduler = observableFromPromise(elseSourceOrScheduler));
      typeof elseSourceOrScheduler.now === 'function' && (elseSourceOrScheduler = observableEmpty(elseSourceOrScheduler));
      return condition() ? thenSource : elseSourceOrScheduler;
    });
  };
  Observable['for'] = Observable.forIn = function(sources, resultSelector, thisArg) {
    return enumerableOf(sources, resultSelector, thisArg).concat();
  };
  var observableWhileDo = Observable['while'] = Observable.whileDo = function(condition, source) {
    isPromise(source) && (source = observableFromPromise(source));
    return enumerableWhile(condition, source).concat();
  };
  observableProto.doWhile = function(condition) {
    return observableConcat([this, observableWhileDo(condition, this)]);
  };
  Observable['case'] = function(selector, sources, defaultSourceOrScheduler) {
    return observableDefer(function() {
      isPromise(defaultSourceOrScheduler) && (defaultSourceOrScheduler = observableFromPromise(defaultSourceOrScheduler));
      defaultSourceOrScheduler || (defaultSourceOrScheduler = observableEmpty());
      isScheduler(defaultSourceOrScheduler) && (defaultSourceOrScheduler = observableEmpty(defaultSourceOrScheduler));
      var result = sources[selector()];
      isPromise(result) && (result = observableFromPromise(result));
      return result || defaultSourceOrScheduler;
    });
  };
  observableProto.expand = function(selector, scheduler) {
    isScheduler(scheduler) || (scheduler = immediateScheduler);
    var source = this;
    return new AnonymousObservable(function(o) {
      var q = [],
          m = new SerialDisposable(),
          d = new CompositeDisposable(m),
          activeCount = 0,
          isAcquired = false;
      var ensureActive = function() {
        var isOwner = false;
        if (q.length > 0) {
          isOwner = !isAcquired;
          isAcquired = true;
        }
        if (isOwner) {
          m.setDisposable(scheduler.scheduleRecursive(null, function(_, self) {
            var work;
            if (q.length > 0) {
              work = q.shift();
            } else {
              isAcquired = false;
              return;
            }
            var m1 = new SingleAssignmentDisposable();
            d.add(m1);
            m1.setDisposable(work.subscribe(function(x) {
              o.onNext(x);
              var result = null;
              try {
                result = selector(x);
              } catch (e) {
                o.onError(e);
              }
              q.push(result);
              activeCount++;
              ensureActive();
            }, function(e) {
              o.onError(e);
            }, function() {
              d.remove(m1);
              activeCount--;
              if (activeCount === 0) {
                o.onCompleted();
              }
            }));
            self();
          }));
        }
      };
      q.push(source);
      activeCount++;
      ensureActive();
      return d;
    }, this);
  };
  Observable.forkJoin = function() {
    var allSources = [];
    if (Array.isArray(arguments[0])) {
      allSources = arguments[0];
    } else {
      for (var i = 0,
          len = arguments.length; i < len; i++) {
        allSources.push(arguments[i]);
      }
    }
    return new AnonymousObservable(function(subscriber) {
      var count = allSources.length;
      if (count === 0) {
        subscriber.onCompleted();
        return disposableEmpty;
      }
      var group = new CompositeDisposable(),
          finished = false,
          hasResults = new Array(count),
          hasCompleted = new Array(count),
          results = new Array(count);
      for (var idx = 0; idx < count; idx++) {
        (function(i) {
          var source = allSources[i];
          isPromise(source) && (source = observableFromPromise(source));
          group.add(source.subscribe(function(value) {
            if (!finished) {
              hasResults[i] = true;
              results[i] = value;
            }
          }, function(e) {
            finished = true;
            subscriber.onError(e);
            group.dispose();
          }, function() {
            if (!finished) {
              if (!hasResults[i]) {
                subscriber.onCompleted();
                return;
              }
              hasCompleted[i] = true;
              for (var ix = 0; ix < count; ix++) {
                if (!hasCompleted[ix]) {
                  return;
                }
              }
              finished = true;
              subscriber.onNext(results);
              subscriber.onCompleted();
            }
          }));
        })(idx);
      }
      return group;
    });
  };
  observableProto.forkJoin = function(second, resultSelector) {
    var first = this;
    return new AnonymousObservable(function(observer) {
      var leftStopped = false,
          rightStopped = false,
          hasLeft = false,
          hasRight = false,
          lastLeft,
          lastRight,
          leftSubscription = new SingleAssignmentDisposable(),
          rightSubscription = new SingleAssignmentDisposable();
      isPromise(second) && (second = observableFromPromise(second));
      leftSubscription.setDisposable(first.subscribe(function(left) {
        hasLeft = true;
        lastLeft = left;
      }, function(err) {
        rightSubscription.dispose();
        observer.onError(err);
      }, function() {
        leftStopped = true;
        if (rightStopped) {
          if (!hasLeft) {
            observer.onCompleted();
          } else if (!hasRight) {
            observer.onCompleted();
          } else {
            var result = tryCatch(resultSelector)(lastLeft, lastRight);
            if (result === errorObj) {
              return observer.onError(e);
            }
            observer.onNext(result);
            observer.onCompleted();
          }
        }
      }));
      rightSubscription.setDisposable(second.subscribe(function(right) {
        hasRight = true;
        lastRight = right;
      }, function(err) {
        leftSubscription.dispose();
        observer.onError(err);
      }, function() {
        rightStopped = true;
        if (leftStopped) {
          if (!hasLeft) {
            observer.onCompleted();
          } else if (!hasRight) {
            observer.onCompleted();
          } else {
            var result = tryCatch(resultSelector)(lastLeft, lastRight);
            if (result === errorObj) {
              return observer.onError(result.e);
            }
            observer.onNext(result);
            observer.onCompleted();
          }
        }
      }));
      return new BinaryDisposable(leftSubscription, rightSubscription);
    }, first);
  };
  observableProto.manySelect = observableProto.extend = function(selector, scheduler) {
    isScheduler(scheduler) || (scheduler = immediateScheduler);
    var source = this;
    return observableDefer(function() {
      var chain;
      return source.map(function(x) {
        var curr = new ChainObservable(x);
        chain && chain.onNext(x);
        chain = curr;
        return curr;
      }).tap(noop, function(e) {
        chain && chain.onError(e);
      }, function() {
        chain && chain.onCompleted();
      }).observeOn(scheduler).map(selector);
    }, source);
  };
  var ChainObservable = (function(__super__) {
    inherits(ChainObservable, __super__);
    function ChainObservable(head) {
      __super__.call(this);
      this.head = head;
      this.tail = new AsyncSubject();
    }
    addProperties(ChainObservable.prototype, Observer, {
      _subscribe: function(o) {
        var g = new CompositeDisposable();
        g.add(currentThreadScheduler.schedule(this, function(_, self) {
          o.onNext(self.head);
          g.add(self.tail.mergeAll().subscribe(o));
        }));
        return g;
      },
      onCompleted: function() {
        this.onNext(Observable.empty());
      },
      onError: function(e) {
        this.onNext(Observable['throw'](e));
      },
      onNext: function(v) {
        this.tail.onNext(v);
        this.tail.onCompleted();
      }
    });
    return ChainObservable;
  }(Observable));
  observableProto.switchFirst = function() {
    var sources = this;
    return new AnonymousObservable(function(o) {
      var hasCurrent = false,
          isStopped = false,
          m = new SingleAssignmentDisposable(),
          g = new CompositeDisposable();
      g.add(m);
      m.setDisposable(sources.subscribe(function(innerSource) {
        if (!hasCurrent) {
          hasCurrent = true;
          isPromise(innerSource) && (innerSource = observableFromPromise(innerSource));
          var innerSubscription = new SingleAssignmentDisposable();
          g.add(innerSubscription);
          innerSubscription.setDisposable(innerSource.subscribe(function(x) {
            o.onNext(x);
          }, function(e) {
            o.onError(e);
          }, function() {
            g.remove(innerSubscription);
            hasCurrent = false;
            isStopped && g.length === 1 && o.onCompleted();
          }));
        }
      }, function(e) {
        o.onError(e);
      }, function() {
        isStopped = true;
        !hasCurrent && g.length === 1 && o.onCompleted();
      }));
      return g;
    }, this);
  };
  observableProto.flatMapFirst = observableProto.selectManyFirst = function(selector, resultSelector, thisArg) {
    return new FlatMapObservable(this, selector, resultSelector, thisArg).switchFirst();
  };
  Rx.Observable.prototype.flatMapWithMaxConcurrent = function(limit, selector, resultSelector, thisArg) {
    return new FlatMapObservable(this, selector, resultSelector, thisArg).merge(limit);
  };
  return Rx;
}));
