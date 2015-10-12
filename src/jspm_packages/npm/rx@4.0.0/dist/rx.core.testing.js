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
  var Observer = Rx.Observer,
      Observable = Rx.Observable,
      Disposable = Rx.Disposable,
      disposableEmpty = Disposable.empty,
      disposableCreate = Disposable.create,
      CompositeDisposable = Rx.CompositeDisposable,
      SingleAssignmentDisposable = Rx.SingleAssignmentDisposable,
      Scheduler = Rx.Scheduler,
      ScheduledItem = Rx.internals.ScheduledItem,
      SchedulePeriodicRecursive = Rx.internals.SchedulePeriodicRecursive,
      PriorityQueue = Rx.internals.PriorityQueue,
      inherits = Rx.internals.inherits,
      notImplemented = Rx.helpers.notImplemented,
      defaultComparer = Rx.helpers.defaultComparer = function(a, b) {
        return isEqual(a, b);
      };
  var Notification = Rx.Notification = (function() {
    function Notification() {}
    Notification.prototype._accept = function(onNext, onError, onCompleted) {
      throw new NotImplementedError();
    };
    Notification.prototype._acceptObservable = function(onNext, onError, onCompleted) {
      throw new NotImplementedError();
    };
    Notification.prototype.accept = function(observerOrOnNext, onError, onCompleted) {
      return observerOrOnNext && typeof observerOrOnNext === 'object' ? this._acceptObservable(observerOrOnNext) : this._accept(observerOrOnNext, onError, onCompleted);
    };
    Notification.prototype.toObservable = function(scheduler) {
      var self = this;
      isScheduler(scheduler) || (scheduler = immediateScheduler);
      return new AnonymousObservable(function(o) {
        return scheduler.schedule(self, function(_, notification) {
          notification._acceptObservable(o);
          notification.kind === 'N' && o.onCompleted();
        });
      });
    };
    return Notification;
  })();
  var OnNextNotification = (function(__super__) {
    inherits(OnNextNotification, __super__);
    function OnNextNotification(value) {
      this.value = value;
      this.kind = 'N';
    }
    OnNextNotification.prototype._accept = function(onNext) {
      return onNext(this.value);
    };
    OnNextNotification.prototype._acceptObservable = function(o) {
      return o.onNext(this.value);
    };
    OnNextNotification.prototype.toString = function() {
      return 'OnNext(' + this.value + ')';
    };
    return OnNextNotification;
  }(Notification));
  var OnErrorNotification = (function(__super__) {
    inherits(OnErrorNotification, __super__);
    function OnErrorNotification(error) {
      this.error = error;
      this.kind = 'E';
    }
    OnErrorNotification.prototype._accept = function(onNext, onError) {
      return onError(this.error);
    };
    OnErrorNotification.prototype._acceptObservable = function(o) {
      return o.onError(this.error);
    };
    OnErrorNotification.prototype.toString = function() {
      return 'OnError(' + this.error + ')';
    };
    return OnErrorNotification;
  }(Notification));
  var OnCompletedNotification = (function(__super__) {
    inherits(OnCompletedNotification, __super__);
    function OnCompletedNotification() {
      this.kind = 'C';
    }
    OnCompletedNotification.prototype._accept = function(onNext, onError, onCompleted) {
      return onCompleted();
    };
    OnCompletedNotification.prototype._acceptObservable = function(o) {
      return o.onCompleted();
    };
    OnCompletedNotification.prototype.toString = function() {
      return 'OnCompleted()';
    };
    return OnCompletedNotification;
  }(Notification));
  var notificationCreateOnNext = Notification.createOnNext = function(value) {
    return new OnNextNotification(value);
  };
  var notificationCreateOnError = Notification.createOnError = function(error) {
    return new OnErrorNotification(error);
  };
  var notificationCreateOnCompleted = Notification.createOnCompleted = function() {
    return new OnCompletedNotification();
  };
  var dontEnums = ['toString', 'toLocaleString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'constructor'],
      dontEnumsLength = dontEnums.length;
  var argsClass = '[object Arguments]',
      arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      errorClass = '[object Error]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      objectClass = '[object Object]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';
  var toString = Object.prototype.toString,
      hasOwnProperty = Object.prototype.hasOwnProperty,
      supportsArgsClass = toString.call(arguments) == argsClass,
      supportNodeClass,
      errorProto = Error.prototype,
      objectProto = Object.prototype,
      stringProto = String.prototype,
      propertyIsEnumerable = objectProto.propertyIsEnumerable;
  try {
    supportNodeClass = !(toString.call(document) == objectClass && !({'toString': 0} + ''));
  } catch (e) {
    supportNodeClass = true;
  }
  var nonEnumProps = {};
  nonEnumProps[arrayClass] = nonEnumProps[dateClass] = nonEnumProps[numberClass] = {
    'constructor': true,
    'toLocaleString': true,
    'toString': true,
    'valueOf': true
  };
  nonEnumProps[boolClass] = nonEnumProps[stringClass] = {
    'constructor': true,
    'toString': true,
    'valueOf': true
  };
  nonEnumProps[errorClass] = nonEnumProps[funcClass] = nonEnumProps[regexpClass] = {
    'constructor': true,
    'toString': true
  };
  nonEnumProps[objectClass] = {'constructor': true};
  var support = {};
  (function() {
    var ctor = function() {
      this.x = 1;
    },
        props = [];
    ctor.prototype = {
      'valueOf': 1,
      'y': 1
    };
    for (var key in new ctor) {
      props.push(key);
    }
    for (key in arguments) {}
    support.enumErrorProps = propertyIsEnumerable.call(errorProto, 'message') || propertyIsEnumerable.call(errorProto, 'name');
    support.enumPrototypes = propertyIsEnumerable.call(ctor, 'prototype');
    support.nonEnumArgs = key != 0;
    support.nonEnumShadows = !/valueOf/.test(props);
  }(1));
  var isObject = Rx.internals.isObject = function(value) {
    var type = typeof value;
    return value && (type == 'function' || type == 'object') || false;
  };
  function keysIn(object) {
    var result = [];
    if (!isObject(object)) {
      return result;
    }
    if (support.nonEnumArgs && object.length && isArguments(object)) {
      object = slice.call(object);
    }
    var skipProto = support.enumPrototypes && typeof object == 'function',
        skipErrorProps = support.enumErrorProps && (object === errorProto || object instanceof Error);
    for (var key in object) {
      if (!(skipProto && key == 'prototype') && !(skipErrorProps && (key == 'message' || key == 'name'))) {
        result.push(key);
      }
    }
    if (support.nonEnumShadows && object !== objectProto) {
      var ctor = object.constructor,
          index = -1,
          length = dontEnumsLength;
      if (object === (ctor && ctor.prototype)) {
        var className = object === stringProto ? stringClass : object === errorProto ? errorClass : toString.call(object),
            nonEnum = nonEnumProps[className];
      }
      while (++index < length) {
        key = dontEnums[index];
        if (!(nonEnum && nonEnum[key]) && hasOwnProperty.call(object, key)) {
          result.push(key);
        }
      }
    }
    return result;
  }
  function internalFor(object, callback, keysFunc) {
    var index = -1,
        props = keysFunc(object),
        length = props.length;
    while (++index < length) {
      var key = props[index];
      if (callback(object[key], key, object) === false) {
        break;
      }
    }
    return object;
  }
  function internalForIn(object, callback) {
    return internalFor(object, callback, keysIn);
  }
  function isNode(value) {
    return typeof value.toString != 'function' && typeof(value + '') == 'string';
  }
  var isArguments = function(value) {
    return (value && typeof value == 'object') ? toString.call(value) == argsClass : false;
  };
  if (!supportsArgsClass) {
    isArguments = function(value) {
      return (value && typeof value == 'object') ? hasOwnProperty.call(value, 'callee') : false;
    };
  }
  var isEqual = Rx.internals.isEqual = function(x, y) {
    return deepEquals(x, y, [], []);
  };
  function deepEquals(a, b, stackA, stackB) {
    if (a === b) {
      return a !== 0 || (1 / a == 1 / b);
    }
    var type = typeof a,
        otherType = typeof b;
    if (a === a && (a == null || b == null || (type != 'function' && type != 'object' && otherType != 'function' && otherType != 'object'))) {
      return false;
    }
    var className = toString.call(a),
        otherClass = toString.call(b);
    if (className == argsClass) {
      className = objectClass;
    }
    if (otherClass == argsClass) {
      otherClass = objectClass;
    }
    if (className != otherClass) {
      return false;
    }
    switch (className) {
      case boolClass:
      case dateClass:
        return +a == +b;
      case numberClass:
        return (a != +a) ? b != +b : (a == 0 ? (1 / a == 1 / b) : a == +b);
      case regexpClass:
      case stringClass:
        return a == String(b);
    }
    var isArr = className == arrayClass;
    if (!isArr) {
      if (className != objectClass || (!support.nodeClass && (isNode(a) || isNode(b)))) {
        return false;
      }
      var ctorA = !support.argsObject && isArguments(a) ? Object : a.constructor,
          ctorB = !support.argsObject && isArguments(b) ? Object : b.constructor;
      if (ctorA != ctorB && !(hasOwnProperty.call(a, 'constructor') && hasOwnProperty.call(b, 'constructor')) && !(isFunction(ctorA) && ctorA instanceof ctorA && isFunction(ctorB) && ctorB instanceof ctorB) && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    var initedStack = !stackA;
    stackA || (stackA = []);
    stackB || (stackB = []);
    var length = stackA.length;
    while (length--) {
      if (stackA[length] == a) {
        return stackB[length] == b;
      }
    }
    var size = 0;
    var result = true;
    stackA.push(a);
    stackB.push(b);
    if (isArr) {
      length = a.length;
      size = b.length;
      result = size == length;
      if (result) {
        while (size--) {
          var index = length,
              value = b[size];
          if (!(result = deepEquals(a[size], value, stackA, stackB))) {
            break;
          }
        }
      }
    } else {
      internalForIn(b, function(value, key, b) {
        if (hasOwnProperty.call(b, key)) {
          size++;
          return (result = hasOwnProperty.call(a, key) && deepEquals(a[key], value, stackA, stackB));
        }
      });
      if (result) {
        internalForIn(a, function(value, key, a) {
          if (hasOwnProperty.call(a, key)) {
            return (result = --size > -1);
          }
        });
      }
    }
    stackA.pop();
    stackB.pop();
    return result;
  }
  var SchedulePeriodicRecursive = Rx.internals.SchedulePeriodicRecursive = (function() {
    function tick(command, recurse) {
      recurse(0, this._period);
      try {
        this._state = this._action(this._state);
      } catch (e) {
        this._cancel.dispose();
        throw e;
      }
    }
    function SchedulePeriodicRecursive(scheduler, state, period, action) {
      this._scheduler = scheduler;
      this._state = state;
      this._period = period;
      this._action = action;
    }
    SchedulePeriodicRecursive.prototype.start = function() {
      var d = new SingleAssignmentDisposable();
      this._cancel = d;
      d.setDisposable(this._scheduler.scheduleRecursiveFuture(0, this._period, tick.bind(this)));
      return d;
    };
    return SchedulePeriodicRecursive;
  }());
  var VirtualTimeScheduler = Rx.VirtualTimeScheduler = (function(__super__) {
    inherits(VirtualTimeScheduler, __super__);
    function VirtualTimeScheduler(initialClock, comparer) {
      this.clock = initialClock;
      this.comparer = comparer;
      this.isEnabled = false;
      this.queue = new PriorityQueue(1024);
      __super__.call(this);
    }
    var VirtualTimeSchedulerPrototype = VirtualTimeScheduler.prototype;
    VirtualTimeSchedulerPrototype.now = function() {
      return this.toAbsoluteTime(this.clock);
    };
    VirtualTimeSchedulerPrototype.schedule = function(state, action) {
      return this.scheduleAbsolute(state, this.clock, action);
    };
    VirtualTimeSchedulerPrototype.scheduleFuture = function(state, dueTime, action) {
      var dt = dueTime instanceof Date ? this.toRelativeTime(dueTime - this.now()) : this.toRelativeTime(dueTime);
      return this.scheduleRelative(state, dt, action);
    };
    VirtualTimeSchedulerPrototype.add = notImplemented;
    VirtualTimeSchedulerPrototype.toAbsoluteTime = notImplemented;
    VirtualTimeSchedulerPrototype.toRelativeTime = notImplemented;
    VirtualTimeSchedulerPrototype.schedulePeriodic = function(state, period, action) {
      var s = new SchedulePeriodicRecursive(this, state, period, action);
      return s.start();
    };
    VirtualTimeSchedulerPrototype.scheduleRelative = function(state, dueTime, action) {
      var runAt = this.add(this.clock, dueTime);
      return this.scheduleAbsolute(state, runAt, action);
    };
    VirtualTimeSchedulerPrototype.start = function() {
      if (!this.isEnabled) {
        this.isEnabled = true;
        do {
          var next = this.getNext();
          if (next !== null) {
            this.comparer(next.dueTime, this.clock) > 0 && (this.clock = next.dueTime);
            next.invoke();
          } else {
            this.isEnabled = false;
          }
        } while (this.isEnabled);
      }
    };
    VirtualTimeSchedulerPrototype.stop = function() {
      this.isEnabled = false;
    };
    VirtualTimeSchedulerPrototype.advanceTo = function(time) {
      var dueToClock = this.comparer(this.clock, time);
      if (this.comparer(this.clock, time) > 0) {
        throw new ArgumentOutOfRangeError();
      }
      if (dueToClock === 0) {
        return;
      }
      if (!this.isEnabled) {
        this.isEnabled = true;
        do {
          var next = this.getNext();
          if (next !== null && this.comparer(next.dueTime, time) <= 0) {
            this.comparer(next.dueTime, this.clock) > 0 && (this.clock = next.dueTime);
            next.invoke();
          } else {
            this.isEnabled = false;
          }
        } while (this.isEnabled);
        this.clock = time;
      }
    };
    VirtualTimeSchedulerPrototype.advanceBy = function(time) {
      var dt = this.add(this.clock, time),
          dueToClock = this.comparer(this.clock, dt);
      if (dueToClock > 0) {
        throw new ArgumentOutOfRangeError();
      }
      if (dueToClock === 0) {
        return;
      }
      this.advanceTo(dt);
    };
    VirtualTimeSchedulerPrototype.sleep = function(time) {
      var dt = this.add(this.clock, time);
      if (this.comparer(this.clock, dt) >= 0) {
        throw new ArgumentOutOfRangeError();
      }
      this.clock = dt;
    };
    VirtualTimeSchedulerPrototype.getNext = function() {
      while (this.queue.length > 0) {
        var next = this.queue.peek();
        if (next.isCancelled()) {
          this.queue.dequeue();
        } else {
          return next;
        }
      }
      return null;
    };
    VirtualTimeSchedulerPrototype.scheduleAbsolute = function(state, dueTime, action) {
      var self = this;
      function run(scheduler, state1) {
        self.queue.remove(si);
        return action(scheduler, state1);
      }
      var si = new ScheduledItem(this, state, run, dueTime, this.comparer);
      this.queue.enqueue(si);
      return si.disposable;
    };
    return VirtualTimeScheduler;
  }(Scheduler));
  function OnNextPredicate(predicate) {
    this.predicate = predicate;
  }
  OnNextPredicate.prototype.equals = function(other) {
    if (other === this) {
      return true;
    }
    if (other == null) {
      return false;
    }
    if (other.kind !== 'N') {
      return false;
    }
    return this.predicate(other.value);
  };
  function OnErrorPredicate(predicate) {
    this.predicate = predicate;
  }
  OnErrorPredicate.prototype.equals = function(other) {
    if (other === this) {
      return true;
    }
    if (other == null) {
      return false;
    }
    if (other.kind !== 'E') {
      return false;
    }
    return this.predicate(other.error);
  };
  var ReactiveTest = Rx.ReactiveTest = {
    created: 100,
    subscribed: 200,
    disposed: 1000,
    onNext: function(ticks, value) {
      return typeof value === 'function' ? new Recorded(ticks, new OnNextPredicate(value)) : new Recorded(ticks, Notification.createOnNext(value));
    },
    onError: function(ticks, error) {
      return typeof error === 'function' ? new Recorded(ticks, new OnErrorPredicate(error)) : new Recorded(ticks, Notification.createOnError(error));
    },
    onCompleted: function(ticks) {
      return new Recorded(ticks, Notification.createOnCompleted());
    },
    subscribe: function(start, end) {
      return new Subscription(start, end);
    }
  };
  var Recorded = Rx.Recorded = function(time, value, comparer) {
    this.time = time;
    this.value = value;
    this.comparer = comparer || defaultComparer;
  };
  Recorded.prototype.equals = function(other) {
    return this.time === other.time && this.comparer(this.value, other.value);
  };
  Recorded.prototype.toString = function() {
    return this.value.toString() + '@' + this.time;
  };
  var Subscription = Rx.Subscription = function(start, end) {
    this.subscribe = start;
    this.unsubscribe = end || Number.MAX_VALUE;
  };
  Subscription.prototype.equals = function(other) {
    return this.subscribe === other.subscribe && this.unsubscribe === other.unsubscribe;
  };
  Subscription.prototype.toString = function() {
    return '(' + this.subscribe + ', ' + (this.unsubscribe === Number.MAX_VALUE ? 'Infinite' : this.unsubscribe) + ')';
  };
  var MockDisposable = Rx.MockDisposable = function(scheduler) {
    this.scheduler = scheduler;
    this.disposes = [];
    this.disposes.push(this.scheduler.clock);
  };
  MockDisposable.prototype.dispose = function() {
    this.disposes.push(this.scheduler.clock);
  };
  var MockObserver = (function(__super__) {
    inherits(MockObserver, __super__);
    function MockObserver(scheduler) {
      __super__.call(this);
      this.scheduler = scheduler;
      this.messages = [];
    }
    var MockObserverPrototype = MockObserver.prototype;
    MockObserverPrototype.onNext = function(value) {
      this.messages.push(new Recorded(this.scheduler.clock, Notification.createOnNext(value)));
    };
    MockObserverPrototype.onError = function(e) {
      this.messages.push(new Recorded(this.scheduler.clock, Notification.createOnError(e)));
    };
    MockObserverPrototype.onCompleted = function() {
      this.messages.push(new Recorded(this.scheduler.clock, Notification.createOnCompleted()));
    };
    return MockObserver;
  })(Observer);
  function MockPromise(scheduler, messages) {
    var self = this;
    this.scheduler = scheduler;
    this.messages = messages;
    this.subscriptions = [];
    this.observers = [];
    for (var i = 0,
        len = this.messages.length; i < len; i++) {
      var message = this.messages[i],
          notification = message.value;
      (function(innerNotification) {
        scheduler.scheduleAbsolute(null, message.time, function() {
          var obs = self.observers.slice(0);
          for (var j = 0,
              jLen = obs.length; j < jLen; j++) {
            innerNotification.accept(obs[j]);
          }
          return disposableEmpty;
        });
      })(notification);
    }
  }
  MockPromise.prototype.then = function(onResolved, onRejected) {
    var self = this;
    this.subscriptions.push(new Subscription(this.scheduler.clock));
    var index = this.subscriptions.length - 1;
    var newPromise;
    var observer = Rx.Observer.create(function(x) {
      var retValue = onResolved(x);
      if (retValue && typeof retValue.then === 'function') {
        newPromise = retValue;
      } else {
        var ticks = self.scheduler.clock;
        newPromise = new MockPromise(self.scheduler, [Rx.ReactiveTest.onNext(ticks, undefined), Rx.ReactiveTest.onCompleted(ticks)]);
      }
      var idx = self.observers.indexOf(observer);
      self.observers.splice(idx, 1);
      self.subscriptions[index] = new Subscription(self.subscriptions[index].subscribe, self.scheduler.clock);
    }, function(err) {
      onRejected(err);
      var idx = self.observers.indexOf(observer);
      self.observers.splice(idx, 1);
      self.subscriptions[index] = new Subscription(self.subscriptions[index].subscribe, self.scheduler.clock);
    });
    this.observers.push(observer);
    return newPromise || new MockPromise(this.scheduler, this.messages);
  };
  var HotObservable = (function(__super__) {
    inherits(HotObservable, __super__);
    function HotObservable(scheduler, messages) {
      __super__.call(this);
      var message,
          notification,
          observable = this;
      this.scheduler = scheduler;
      this.messages = messages;
      this.subscriptions = [];
      this.observers = [];
      for (var i = 0,
          len = this.messages.length; i < len; i++) {
        message = this.messages[i];
        notification = message.value;
        (function(innerNotification) {
          scheduler.scheduleAbsolute(null, message.time, function() {
            var obs = observable.observers.slice(0);
            for (var j = 0,
                jLen = obs.length; j < jLen; j++) {
              innerNotification.accept(obs[j]);
            }
            return disposableEmpty;
          });
        })(notification);
      }
    }
    HotObservable.prototype._subscribe = function(o) {
      var observable = this;
      this.observers.push(o);
      this.subscriptions.push(new Subscription(this.scheduler.clock));
      var index = this.subscriptions.length - 1;
      return disposableCreate(function() {
        var idx = observable.observers.indexOf(o);
        observable.observers.splice(idx, 1);
        observable.subscriptions[index] = new Subscription(observable.subscriptions[index].subscribe, observable.scheduler.clock);
      });
    };
    return HotObservable;
  })(Observable);
  var ColdObservable = (function(__super__) {
    inherits(ColdObservable, __super__);
    function ColdObservable(scheduler, messages) {
      __super__.call(this);
      this.scheduler = scheduler;
      this.messages = messages;
      this.subscriptions = [];
    }
    ColdObservable.prototype._subscribe = function(o) {
      var message,
          notification,
          observable = this;
      this.subscriptions.push(new Subscription(this.scheduler.clock));
      var index = this.subscriptions.length - 1;
      var d = new CompositeDisposable();
      for (var i = 0,
          len = this.messages.length; i < len; i++) {
        message = this.messages[i];
        notification = message.value;
        (function(innerNotification) {
          d.add(observable.scheduler.scheduleRelative(null, message.time, function() {
            innerNotification.accept(o);
            return disposableEmpty;
          }));
        })(notification);
      }
      return disposableCreate(function() {
        observable.subscriptions[index] = new Subscription(observable.subscriptions[index].subscribe, observable.scheduler.clock);
        d.dispose();
      });
    };
    return ColdObservable;
  })(Observable);
  Rx.TestScheduler = (function(__super__) {
    inherits(TestScheduler, __super__);
    function baseComparer(x, y) {
      return x > y ? 1 : (x < y ? -1 : 0);
    }
    function TestScheduler() {
      __super__.call(this, 0, baseComparer);
    }
    TestScheduler.prototype.scheduleAbsolute = function(state, dueTime, action) {
      dueTime <= this.clock && (dueTime = this.clock + 1);
      return __super__.prototype.scheduleAbsolute.call(this, state, dueTime, action);
    };
    TestScheduler.prototype.add = function(absolute, relative) {
      return absolute + relative;
    };
    TestScheduler.prototype.toAbsoluteTime = function(absolute) {
      return new Date(absolute).getTime();
    };
    TestScheduler.prototype.toRelativeTime = function(timeSpan) {
      return timeSpan;
    };
    TestScheduler.prototype.startScheduler = function(createFn, settings) {
      settings || (settings = {});
      settings.created == null && (settings.created = ReactiveTest.created);
      settings.subscribed == null && (settings.subscribed = ReactiveTest.subscribed);
      settings.disposed == null && (settings.disposed = ReactiveTest.disposed);
      var observer = this.createObserver(),
          source,
          subscription;
      this.scheduleAbsolute(null, settings.created, function() {
        source = createFn();
        return disposableEmpty;
      });
      this.scheduleAbsolute(null, settings.subscribed, function() {
        subscription = source.subscribe(observer);
        return disposableEmpty;
      });
      this.scheduleAbsolute(null, settings.disposed, function() {
        subscription.dispose();
        return disposableEmpty;
      });
      this.start();
      return observer;
    };
    TestScheduler.prototype.createHotObservable = function() {
      var len = arguments.length,
          args;
      if (Array.isArray(arguments[0])) {
        args = arguments[0];
      } else {
        args = new Array(len);
        for (var i = 0; i < len; i++) {
          args[i] = arguments[i];
        }
      }
      return new HotObservable(this, args);
    };
    TestScheduler.prototype.createColdObservable = function() {
      var len = arguments.length,
          args;
      if (Array.isArray(arguments[0])) {
        args = arguments[0];
      } else {
        args = new Array(len);
        for (var i = 0; i < len; i++) {
          args[i] = arguments[i];
        }
      }
      return new ColdObservable(this, args);
    };
    TestScheduler.prototype.createResolvedPromise = function(ticks, value) {
      return new MockPromise(this, [Rx.ReactiveTest.onNext(ticks, value), Rx.ReactiveTest.onCompleted(ticks)]);
    };
    TestScheduler.prototype.createRejectedPromise = function(ticks, reason) {
      return new MockPromise(this, [Rx.ReactiveTest.onError(ticks, reason)]);
    };
    TestScheduler.prototype.createObserver = function() {
      return new MockObserver(this);
    };
    return TestScheduler;
  })(VirtualTimeScheduler);
  return Rx;
}));
