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
      ObservableBase = Rx.ObservableBase,
      CompositeDisposable = Rx.CompositeDisposable,
      BinaryDisposable = Rx.BinaryDisposable,
      RefCountDisposable = Rx.RefCountDisposable,
      SingleAssignmentDisposable = Rx.SingleAssignmentDisposable,
      SerialDisposable = Rx.SerialDisposable,
      Subject = Rx.Subject,
      observableProto = Observable.prototype,
      observableEmpty = Observable.empty,
      observableNever = Observable.never,
      AnonymousObservable = Rx.AnonymousObservable,
      addRef = Rx.internals.addRef,
      inherits = Rx.internals.inherits,
      noop = Rx.helpers.noop,
      isPromise = Rx.helpers.isPromise,
      isFunction = Rx.helpers.isFunction,
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
  var Map = root.Map || (function() {
    function Map() {
      this.size = 0;
      this._values = [];
      this._keys = [];
    }
    Map.prototype['delete'] = function(key) {
      var i = this._keys.indexOf(key);
      if (i === -1) {
        return false;
      }
      this._values.splice(i, 1);
      this._keys.splice(i, 1);
      this.size--;
      return true;
    };
    Map.prototype.get = function(key) {
      var i = this._keys.indexOf(key);
      return i === -1 ? undefined : this._values[i];
    };
    Map.prototype.set = function(key, value) {
      var i = this._keys.indexOf(key);
      if (i === -1) {
        this._keys.push(key);
        this._values.push(value);
        this.size++;
      } else {
        this._values[i] = value;
      }
      return this;
    };
    Map.prototype.forEach = function(cb, thisArg) {
      for (var i = 0; i < this.size; i++) {
        cb.call(thisArg, this._values[i], this._keys[i]);
      }
    };
    return Map;
  }());
  observableProto.join = function(right, leftDurationSelector, rightDurationSelector, resultSelector) {
    var left = this;
    return new AnonymousObservable(function(o) {
      var group = new CompositeDisposable();
      var leftDone = false,
          rightDone = false;
      var leftId = 0,
          rightId = 0;
      var leftMap = new Map(),
          rightMap = new Map();
      var handleError = function(e) {
        o.onError(e);
      };
      group.add(left.subscribe(function(value) {
        var id = leftId++,
            md = new SingleAssignmentDisposable();
        leftMap.set(id, value);
        group.add(md);
        var duration = tryCatch(leftDurationSelector)(value);
        if (duration === errorObj) {
          return o.onError(duration.e);
        }
        md.setDisposable(duration.take(1).subscribe(noop, handleError, function() {
          leftMap['delete'](id) && leftMap.size === 0 && leftDone && o.onCompleted();
          group.remove(md);
        }));
        rightMap.forEach(function(v) {
          var result = tryCatch(resultSelector)(value, v);
          if (result === errorObj) {
            return o.onError(result.e);
          }
          o.onNext(result);
        });
      }, handleError, function() {
        leftDone = true;
        (rightDone || leftMap.size === 0) && o.onCompleted();
      }));
      group.add(right.subscribe(function(value) {
        var id = rightId++,
            md = new SingleAssignmentDisposable();
        rightMap.set(id, value);
        group.add(md);
        var duration = tryCatch(rightDurationSelector)(value);
        if (duration === errorObj) {
          return o.onError(duration.e);
        }
        md.setDisposable(duration.take(1).subscribe(noop, handleError, function() {
          rightMap['delete'](id) && rightMap.size === 0 && rightDone && o.onCompleted();
          group.remove(md);
        }));
        leftMap.forEach(function(v) {
          var result = tryCatch(resultSelector)(v, value);
          if (result === errorObj) {
            return o.onError(result.e);
          }
          o.onNext(result);
        });
      }, handleError, function() {
        rightDone = true;
        (leftDone || rightMap.size === 0) && o.onCompleted();
      }));
      return group;
    }, left);
  };
  observableProto.groupJoin = function(right, leftDurationSelector, rightDurationSelector, resultSelector) {
    var left = this;
    return new AnonymousObservable(function(o) {
      var group = new CompositeDisposable();
      var r = new RefCountDisposable(group);
      var leftMap = new Map(),
          rightMap = new Map();
      var leftId = 0,
          rightId = 0;
      var handleError = function(e) {
        return function(v) {
          v.onError(e);
        };
      };
      function handleError(e) {}
      ;
      group.add(left.subscribe(function(value) {
        var s = new Subject();
        var id = leftId++;
        leftMap.set(id, s);
        var result = tryCatch(resultSelector)(value, addRef(s, r));
        if (result === errorObj) {
          leftMap.forEach(handleError(result.e));
          return o.onError(result.e);
        }
        o.onNext(result);
        rightMap.forEach(function(v) {
          s.onNext(v);
        });
        var md = new SingleAssignmentDisposable();
        group.add(md);
        var duration = tryCatch(leftDurationSelector)(value);
        if (duration === errorObj) {
          leftMap.forEach(handleError(duration.e));
          return o.onError(duration.e);
        }
        md.setDisposable(duration.take(1).subscribe(noop, function(e) {
          leftMap.forEach(handleError(e));
          o.onError(e);
        }, function() {
          leftMap['delete'](id) && s.onCompleted();
          group.remove(md);
        }));
      }, function(e) {
        leftMap.forEach(handleError(e));
        o.onError(e);
      }, function() {
        o.onCompleted();
      }));
      group.add(right.subscribe(function(value) {
        var id = rightId++;
        rightMap.set(id, value);
        var md = new SingleAssignmentDisposable();
        group.add(md);
        var duration = tryCatch(rightDurationSelector)(value);
        if (duration === errorObj) {
          leftMap.forEach(handleError(duration.e));
          return o.onError(duration.e);
        }
        md.setDisposable(duration.take(1).subscribe(noop, function(e) {
          leftMap.forEach(handleError(e));
          o.onError(e);
        }, function() {
          rightMap['delete'](id);
          group.remove(md);
        }));
        leftMap.forEach(function(v) {
          v.onNext(value);
        });
      }, function(e) {
        leftMap.forEach(handleError(e));
        o.onError(e);
      }));
      return r;
    }, left);
  };
  function toArray(x) {
    return x.toArray();
  }
  observableProto.buffer = function() {
    return this.window.apply(this, arguments).flatMap(toArray);
  };
  observableProto.window = function(windowOpeningsOrClosingSelector, windowClosingSelector) {
    if (arguments.length === 1 && typeof arguments[0] !== 'function') {
      return observableWindowWithBoundaries.call(this, windowOpeningsOrClosingSelector);
    }
    return typeof windowOpeningsOrClosingSelector === 'function' ? observableWindowWithClosingSelector.call(this, windowOpeningsOrClosingSelector) : observableWindowWithOpenings.call(this, windowOpeningsOrClosingSelector, windowClosingSelector);
  };
  function observableWindowWithOpenings(windowOpenings, windowClosingSelector) {
    return windowOpenings.groupJoin(this, windowClosingSelector, observableEmpty, function(_, win) {
      return win;
    });
  }
  function observableWindowWithBoundaries(windowBoundaries) {
    var source = this;
    return new AnonymousObservable(function(observer) {
      var win = new Subject(),
          d = new CompositeDisposable(),
          r = new RefCountDisposable(d);
      observer.onNext(addRef(win, r));
      d.add(source.subscribe(function(x) {
        win.onNext(x);
      }, function(err) {
        win.onError(err);
        observer.onError(err);
      }, function() {
        win.onCompleted();
        observer.onCompleted();
      }));
      isPromise(windowBoundaries) && (windowBoundaries = observableFromPromise(windowBoundaries));
      d.add(windowBoundaries.subscribe(function(w) {
        win.onCompleted();
        win = new Subject();
        observer.onNext(addRef(win, r));
      }, function(err) {
        win.onError(err);
        observer.onError(err);
      }, function() {
        win.onCompleted();
        observer.onCompleted();
      }));
      return r;
    }, source);
  }
  function observableWindowWithClosingSelector(windowClosingSelector) {
    var source = this;
    return new AnonymousObservable(function(observer) {
      var m = new SerialDisposable(),
          d = new CompositeDisposable(m),
          r = new RefCountDisposable(d),
          win = new Subject();
      observer.onNext(addRef(win, r));
      d.add(source.subscribe(function(x) {
        win.onNext(x);
      }, function(err) {
        win.onError(err);
        observer.onError(err);
      }, function() {
        win.onCompleted();
        observer.onCompleted();
      }));
      function createWindowClose() {
        var windowClose;
        try {
          windowClose = windowClosingSelector();
        } catch (e) {
          observer.onError(e);
          return;
        }
        isPromise(windowClose) && (windowClose = observableFromPromise(windowClose));
        var m1 = new SingleAssignmentDisposable();
        m.setDisposable(m1);
        m1.setDisposable(windowClose.take(1).subscribe(noop, function(err) {
          win.onError(err);
          observer.onError(err);
        }, function() {
          win.onCompleted();
          win = new Subject();
          observer.onNext(addRef(win, r));
          createWindowClose();
        }));
      }
      createWindowClose();
      return r;
    }, source);
  }
  observableProto.pairwise = function() {
    var source = this;
    return new AnonymousObservable(function(observer) {
      var previous,
          hasPrevious = false;
      return source.subscribe(function(x) {
        if (hasPrevious) {
          observer.onNext([previous, x]);
        } else {
          hasPrevious = true;
        }
        previous = x;
      }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
    }, source);
  };
  observableProto.partition = function(predicate, thisArg) {
    return [this.filter(predicate, thisArg), this.filter(function(x, i, o) {
      return !predicate.call(thisArg, x, i, o);
    })];
  };
  observableProto.groupBy = function(keySelector, elementSelector) {
    return this.groupByUntil(keySelector, elementSelector, observableNever);
  };
  observableProto.groupByUntil = function(keySelector, elementSelector, durationSelector) {
    var source = this;
    return new AnonymousObservable(function(o) {
      var map = new Map(),
          groupDisposable = new CompositeDisposable(),
          refCountDisposable = new RefCountDisposable(groupDisposable),
          handleError = function(e) {
            return function(item) {
              item.onError(e);
            };
          };
      groupDisposable.add(source.subscribe(function(x) {
        var key = tryCatch(keySelector)(x);
        if (key === errorObj) {
          map.forEach(handleError(key.e));
          return o.onError(key.e);
        }
        var fireNewMapEntry = false,
            writer = map.get(key);
        if (writer === undefined) {
          writer = new Subject();
          map.set(key, writer);
          fireNewMapEntry = true;
        }
        if (fireNewMapEntry) {
          var group = new GroupedObservable(key, writer, refCountDisposable),
              durationGroup = new GroupedObservable(key, writer);
          var duration = tryCatch(durationSelector)(durationGroup);
          if (duration === errorObj) {
            map.forEach(handleError(duration.e));
            return o.onError(duration.e);
          }
          o.onNext(group);
          var md = new SingleAssignmentDisposable();
          groupDisposable.add(md);
          md.setDisposable(duration.take(1).subscribe(noop, function(e) {
            map.forEach(handleError(e));
            o.onError(e);
          }, function() {
            if (map['delete'](key)) {
              writer.onCompleted();
            }
            groupDisposable.remove(md);
          }));
        }
        var element = x;
        if (isFunction(elementSelector)) {
          element = tryCatch(elementSelector)(x);
          if (element === errorObj) {
            map.forEach(handleError(element.e));
            return o.onError(element.e);
          }
        }
        writer.onNext(element);
      }, function(e) {
        map.forEach(handleError(e));
        o.onError(e);
      }, function() {
        map.forEach(function(item) {
          item.onCompleted();
        });
        o.onCompleted();
      }));
      return refCountDisposable;
    }, source);
  };
  var UnderlyingObservable = (function(__super__) {
    inherits(UnderlyingObservable, __super__);
    function UnderlyingObservable(m, u) {
      this._m = m;
      this._u = u;
      __super__.call(this);
    }
    UnderlyingObservable.prototype.subscribeCore = function(o) {
      return new BinaryDisposable(this._m.getDisposable(), this._u.subscribe(o));
    };
    return UnderlyingObservable;
  }(ObservableBase));
  var GroupedObservable = (function(__super__) {
    inherits(GroupedObservable, __super__);
    function GroupedObservable(key, underlyingObservable, mergedDisposable) {
      __super__.call(this);
      this.key = key;
      this.underlyingObservable = !mergedDisposable ? underlyingObservable : new UnderlyingObservable(mergedDisposable, underlyingObservable);
    }
    GroupedObservable.prototype._subscribe = function(o) {
      return this.underlyingObservable.subscribe(o);
    };
    return GroupedObservable;
  }(Observable));
  return Rx;
}));
