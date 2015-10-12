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
    define(['./rx.core'], function(Rx, exports) {
      return factory(root, exports, Rx);
    });
  } else if (typeof module === 'object' && module && module.exports === freeExports) {
    module.exports = factory(root, module.exports, require('./rx.core'));
  } else {
    root.Rx = factory(root, {}, root.Rx);
  }
}.call(this, function(root, exp, Rx, undefined) {
  var Observable = Rx.Observable,
      observableProto = Observable.prototype,
      AnonymousObservable = Rx.AnonymousObservable,
      ObservableBase = Rx.ObservableBase,
      Observer = Rx.Observer,
      AbstractObserver = Rx.internals.AbstractObserver,
      disposableCreate = Rx.Disposable.create,
      disposableEmpty = Rx.Disposable.empty,
      CompositeDisposable = Rx.CompositeDisposable,
      BinaryDisposable = Rx.BinaryDisposable,
      SerialDisposable = Rx.SerialDisposable,
      currentThreadScheduler = Rx.Scheduler.currentThread,
      isFunction = Rx.helpers.isFunction,
      inherits = Rx.internals.inherits,
      addProperties = Rx.internals.addProperties,
      checkDisposed = Rx.Disposable.checkDisposed;
  function cloneArray(arr) {
    var len = arr.length,
        a = new Array(len);
    for (var i = 0; i < len; i++) {
      a[i] = arr[i];
    }
    return a;
  }
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
  var MulticastObservable = (function(__super__) {
    inherits(MulticastObservable, __super__);
    function MulticastObservable(source, fn1, fn2) {
      this.source = source;
      this._fn1 = fn1;
      this._fn2 = fn2;
      __super__.call(this);
    }
    MulticastObservable.prototype.subscribeCore = function(o) {
      var connectable = this.source.multicast(this._fn1());
      return new BinaryDisposable(this._fn2(connectable).subscribe(o), connectable.connect());
    };
    return MulticastObservable;
  }(ObservableBase));
  observableProto.multicast = function(subjectOrSubjectSelector, selector) {
    return isFunction(subjectOrSubjectSelector) ? new MulticastObservable(this, subjectOrSubjectSelector, selector) : new ConnectableObservable(this, subjectOrSubjectSelector);
  };
  observableProto.publish = function(selector) {
    return selector && isFunction(selector) ? this.multicast(function() {
      return new Subject();
    }, selector) : this.multicast(new Subject());
  };
  observableProto.share = function() {
    return this.publish().refCount();
  };
  observableProto.publishLast = function(selector) {
    return selector && isFunction(selector) ? this.multicast(function() {
      return new AsyncSubject();
    }, selector) : this.multicast(new AsyncSubject());
  };
  observableProto.publishValue = function(initialValueOrSelector, initialValue) {
    return arguments.length === 2 ? this.multicast(function() {
      return new BehaviorSubject(initialValue);
    }, initialValueOrSelector) : this.multicast(new BehaviorSubject(initialValueOrSelector));
  };
  observableProto.shareValue = function(initialValue) {
    return this.publishValue(initialValue).refCount();
  };
  observableProto.replay = function(selector, bufferSize, windowSize, scheduler) {
    return selector && isFunction(selector) ? this.multicast(function() {
      return new ReplaySubject(bufferSize, windowSize, scheduler);
    }, selector) : this.multicast(new ReplaySubject(bufferSize, windowSize, scheduler));
  };
  observableProto.shareReplay = function(bufferSize, windowSize, scheduler) {
    return this.replay(null, bufferSize, windowSize, scheduler).refCount();
  };
  var ScheduledObserver = Rx.internals.ScheduledObserver = (function(__super__) {
    inherits(ScheduledObserver, __super__);
    function ScheduledObserver(scheduler, observer) {
      __super__.call(this);
      this.scheduler = scheduler;
      this.observer = observer;
      this.isAcquired = false;
      this.hasFaulted = false;
      this.queue = [];
      this.disposable = new SerialDisposable();
    }
    ScheduledObserver.prototype.next = function(value) {
      var self = this;
      this.queue.push(function() {
        self.observer.onNext(value);
      });
    };
    ScheduledObserver.prototype.error = function(e) {
      var self = this;
      this.queue.push(function() {
        self.observer.onError(e);
      });
    };
    ScheduledObserver.prototype.completed = function() {
      var self = this;
      this.queue.push(function() {
        self.observer.onCompleted();
      });
    };
    ScheduledObserver.prototype.ensureActive = function() {
      var isOwner = false;
      if (!this.hasFaulted && this.queue.length > 0) {
        isOwner = !this.isAcquired;
        this.isAcquired = true;
      }
      if (isOwner) {
        this.disposable.setDisposable(this.scheduler.scheduleRecursive(this, function(parent, self) {
          var work;
          if (parent.queue.length > 0) {
            work = parent.queue.shift();
          } else {
            parent.isAcquired = false;
            return;
          }
          var res = tryCatch(work)();
          if (res === errorObj) {
            parent.queue = [];
            parent.hasFaulted = true;
            return thrower(res.e);
          }
          self(parent);
        }));
      }
    };
    ScheduledObserver.prototype.dispose = function() {
      __super__.prototype.dispose.call(this);
      this.disposable.dispose();
    };
    return ScheduledObserver;
  }(AbstractObserver));
  var InnerSubscription = function(s, o) {
    this._s = s;
    this._o = o;
  };
  InnerSubscription.prototype.dispose = function() {
    if (!this._s.isDisposed && this._o !== null) {
      var idx = this._s.observers.indexOf(this._o);
      this._s.observers.splice(idx, 1);
      this._o = null;
    }
  };
  var Subject = Rx.Subject = (function(__super__) {
    inherits(Subject, __super__);
    function Subject() {
      __super__.call(this);
      this.isDisposed = false;
      this.isStopped = false;
      this.observers = [];
      this.hasError = false;
    }
    addProperties(Subject.prototype, Observer.prototype, {
      _subscribe: function(o) {
        checkDisposed(this);
        if (!this.isStopped) {
          this.observers.push(o);
          return new InnerSubscription(this, o);
        }
        if (this.hasError) {
          o.onError(this.error);
          return disposableEmpty;
        }
        o.onCompleted();
        return disposableEmpty;
      },
      hasObservers: function() {
        return this.observers.length > 0;
      },
      onCompleted: function() {
        checkDisposed(this);
        if (!this.isStopped) {
          this.isStopped = true;
          for (var i = 0,
              os = cloneArray(this.observers),
              len = os.length; i < len; i++) {
            os[i].onCompleted();
          }
          this.observers.length = 0;
        }
      },
      onError: function(error) {
        checkDisposed(this);
        if (!this.isStopped) {
          this.isStopped = true;
          this.error = error;
          this.hasError = true;
          for (var i = 0,
              os = cloneArray(this.observers),
              len = os.length; i < len; i++) {
            os[i].onError(error);
          }
          this.observers.length = 0;
        }
      },
      onNext: function(value) {
        checkDisposed(this);
        if (!this.isStopped) {
          for (var i = 0,
              os = cloneArray(this.observers),
              len = os.length; i < len; i++) {
            os[i].onNext(value);
          }
        }
      },
      dispose: function() {
        this.isDisposed = true;
        this.observers = null;
      }
    });
    Subject.create = function(observer, observable) {
      return new AnonymousSubject(observer, observable);
    };
    return Subject;
  }(Observable));
  var AnonymousSubject = Rx.AnonymousSubject = (function(__super__) {
    inherits(AnonymousSubject, __super__);
    function AnonymousSubject(observer, observable) {
      this.observer = observer;
      this.observable = observable;
      __super__.call(this);
    }
    addProperties(AnonymousSubject.prototype, Observer.prototype, {
      _subscribe: function(o) {
        return this.observable.subscribe(o);
      },
      onCompleted: function() {
        this.observer.onCompleted();
      },
      onError: function(error) {
        this.observer.onError(error);
      },
      onNext: function(value) {
        this.observer.onNext(value);
      }
    });
    return AnonymousSubject;
  }(Observable));
  var AsyncSubject = Rx.AsyncSubject = (function(__super__) {
    inherits(AsyncSubject, __super__);
    function AsyncSubject() {
      __super__.call(this);
      this.isDisposed = false;
      this.isStopped = false;
      this.hasValue = false;
      this.observers = [];
      this.hasError = false;
    }
    addProperties(AsyncSubject.prototype, Observer, {
      _subscribe: function(o) {
        checkDisposed(this);
        if (!this.isStopped) {
          this.observers.push(o);
          return new InnerSubscription(this, o);
        }
        if (this.hasError) {
          o.onError(this.error);
        } else if (this.hasValue) {
          o.onNext(this.value);
          o.onCompleted();
        } else {
          o.onCompleted();
        }
        return disposableEmpty;
      },
      hasObservers: function() {
        checkDisposed(this);
        return this.observers.length > 0;
      },
      onCompleted: function() {
        var i,
            len;
        checkDisposed(this);
        if (!this.isStopped) {
          this.isStopped = true;
          var os = cloneArray(this.observers),
              len = os.length;
          if (this.hasValue) {
            for (i = 0; i < len; i++) {
              var o = os[i];
              o.onNext(this.value);
              o.onCompleted();
            }
          } else {
            for (i = 0; i < len; i++) {
              os[i].onCompleted();
            }
          }
          this.observers.length = 0;
        }
      },
      onError: function(error) {
        checkDisposed(this);
        if (!this.isStopped) {
          this.isStopped = true;
          this.hasError = true;
          this.error = error;
          for (var i = 0,
              os = cloneArray(this.observers),
              len = os.length; i < len; i++) {
            os[i].onError(error);
          }
          this.observers.length = 0;
        }
      },
      onNext: function(value) {
        checkDisposed(this);
        if (this.isStopped) {
          return;
        }
        this.value = value;
        this.hasValue = true;
      },
      dispose: function() {
        this.isDisposed = true;
        this.observers = null;
        this.error = null;
        this.value = null;
      }
    });
    return AsyncSubject;
  }(Observable));
  var BehaviorSubject = Rx.BehaviorSubject = (function(__super__) {
    inherits(BehaviorSubject, __super__);
    function BehaviorSubject(value) {
      __super__.call(this);
      this.value = value;
      this.observers = [];
      this.isDisposed = false;
      this.isStopped = false;
      this.hasError = false;
    }
    addProperties(BehaviorSubject.prototype, Observer, {
      _subscribe: function(o) {
        checkDisposed(this);
        if (!this.isStopped) {
          this.observers.push(o);
          o.onNext(this.value);
          return new InnerSubscription(this, o);
        }
        if (this.hasError) {
          o.onError(this.error);
        } else {
          o.onCompleted();
        }
        return disposableEmpty;
      },
      getValue: function() {
        checkDisposed(this);
        if (this.hasError) {
          throw this.error;
        }
        return this.value;
      },
      hasObservers: function() {
        return this.observers.length > 0;
      },
      onCompleted: function() {
        checkDisposed(this);
        if (this.isStopped) {
          return;
        }
        this.isStopped = true;
        for (var i = 0,
            os = cloneArray(this.observers),
            len = os.length; i < len; i++) {
          os[i].onCompleted();
        }
        this.observers.length = 0;
      },
      onError: function(error) {
        checkDisposed(this);
        if (this.isStopped) {
          return;
        }
        this.isStopped = true;
        this.hasError = true;
        this.error = error;
        for (var i = 0,
            os = cloneArray(this.observers),
            len = os.length; i < len; i++) {
          os[i].onError(error);
        }
        this.observers.length = 0;
      },
      onNext: function(value) {
        checkDisposed(this);
        if (this.isStopped) {
          return;
        }
        this.value = value;
        for (var i = 0,
            os = cloneArray(this.observers),
            len = os.length; i < len; i++) {
          os[i].onNext(value);
        }
      },
      dispose: function() {
        this.isDisposed = true;
        this.observers = null;
        this.value = null;
        this.error = null;
      }
    });
    return BehaviorSubject;
  }(Observable));
  var ReplaySubject = Rx.ReplaySubject = (function(__super__) {
    var maxSafeInteger = Math.pow(2, 53) - 1;
    function createRemovableDisposable(subject, observer) {
      return disposableCreate(function() {
        observer.dispose();
        !subject.isDisposed && subject.observers.splice(subject.observers.indexOf(observer), 1);
      });
    }
    inherits(ReplaySubject, __super__);
    function ReplaySubject(bufferSize, windowSize, scheduler) {
      this.bufferSize = bufferSize == null ? maxSafeInteger : bufferSize;
      this.windowSize = windowSize == null ? maxSafeInteger : windowSize;
      this.scheduler = scheduler || currentThreadScheduler;
      this.q = [];
      this.observers = [];
      this.isStopped = false;
      this.isDisposed = false;
      this.hasError = false;
      this.error = null;
      __super__.call(this);
    }
    addProperties(ReplaySubject.prototype, Observer.prototype, {
      _subscribe: function(o) {
        checkDisposed(this);
        var so = new ScheduledObserver(this.scheduler, o),
            subscription = createRemovableDisposable(this, so);
        this._trim(this.scheduler.now());
        this.observers.push(so);
        for (var i = 0,
            len = this.q.length; i < len; i++) {
          so.onNext(this.q[i].value);
        }
        if (this.hasError) {
          so.onError(this.error);
        } else if (this.isStopped) {
          so.onCompleted();
        }
        so.ensureActive();
        return subscription;
      },
      hasObservers: function() {
        return this.observers.length > 0;
      },
      _trim: function(now) {
        while (this.q.length > this.bufferSize) {
          this.q.shift();
        }
        while (this.q.length > 0 && (now - this.q[0].interval) > this.windowSize) {
          this.q.shift();
        }
      },
      onNext: function(value) {
        checkDisposed(this);
        if (this.isStopped) {
          return;
        }
        var now = this.scheduler.now();
        this.q.push({
          interval: now,
          value: value
        });
        this._trim(now);
        for (var i = 0,
            os = cloneArray(this.observers),
            len = os.length; i < len; i++) {
          var observer = os[i];
          observer.onNext(value);
          observer.ensureActive();
        }
      },
      onError: function(error) {
        checkDisposed(this);
        if (this.isStopped) {
          return;
        }
        this.isStopped = true;
        this.error = error;
        this.hasError = true;
        var now = this.scheduler.now();
        this._trim(now);
        for (var i = 0,
            os = cloneArray(this.observers),
            len = os.length; i < len; i++) {
          var observer = os[i];
          observer.onError(error);
          observer.ensureActive();
        }
        this.observers.length = 0;
      },
      onCompleted: function() {
        checkDisposed(this);
        if (this.isStopped) {
          return;
        }
        this.isStopped = true;
        var now = this.scheduler.now();
        this._trim(now);
        for (var i = 0,
            os = cloneArray(this.observers),
            len = os.length; i < len; i++) {
          var observer = os[i];
          observer.onCompleted();
          observer.ensureActive();
        }
        this.observers.length = 0;
      },
      dispose: function() {
        this.isDisposed = true;
        this.observers = null;
      }
    });
    return ReplaySubject;
  }(Observable));
  var RefCountObservable = (function(__super__) {
    inherits(RefCountObservable, __super__);
    function RefCountObservable(source) {
      this.source = source;
      this._count = 0;
      this._connectableSubscription = null;
      __super__.call(this);
    }
    RefCountObservable.prototype.subscribeCore = function(o) {
      var shouldConnect = ++this._count === 1,
          subscription = this.source.subscribe(o);
      shouldConnect && (this._connectableSubscription = this.source.connect());
      return new RefCountDisposable(this, subscription);
    };
    function RefCountDisposable(p, s) {
      this._p = p;
      this._s = s;
      this.isDisposed = false;
    }
    RefCountDisposable.prototype.dispose = function() {
      if (!this.isDisposed) {
        this.isDisposed = true;
        this._s.dispose();
        --this._p._count === 0 && this._p._connectableSubscription.dispose();
      }
    };
    return RefCountObservable;
  }(ObservableBase));
  var ConnectableObservable = Rx.ConnectableObservable = (function(__super__) {
    inherits(ConnectableObservable, __super__);
    function ConnectableObservable(source, subject) {
      this.source = source;
      this._hasSubscription = false;
      this._subscription = null;
      this._sourceObservable = source.asObservable();
      this._subject = subject;
      __super__.call(this);
    }
    function ConnectDisposable(parent) {
      this._p = parent;
      this.isDisposed = false;
    }
    ConnectDisposable.prototype.dispose = function() {
      if (!this.isDisposed) {
        this.isDisposed = true;
        this._p._hasSubscription = false;
      }
    };
    ConnectableObservable.prototype.connect = function() {
      if (!this._hasSubscription) {
        this._hasSubscription = true;
        this._subscription = new BinaryDisposable(this._sourceObservable.subscribe(this._subject), new ConnectDisposable(this));
      }
      return this._subscription;
    };
    ConnectableObservable.prototype._subscribe = function(o) {
      return this._subject.subscribe(o);
    };
    ConnectableObservable.prototype.refCount = function() {
      return new RefCountObservable(this);
    };
    return ConnectableObservable;
  }(Observable));
  return Rx;
}));
