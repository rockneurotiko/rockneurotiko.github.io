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
  var Scheduler = Rx.Scheduler,
      ScheduledItem = Rx.internals.ScheduledItem,
      SchedulePeriodicRecursive = Rx.internals.SchedulePeriodicRecursive,
      PriorityQueue = Rx.internals.PriorityQueue,
      inherits = Rx.internals.inherits,
      defaultSubComparer = Rx.helpers.defaultSubComparer,
      notImplemented = Rx.helpers.notImplemented;
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
  Rx.HistoricalScheduler = (function(__super__) {
    inherits(HistoricalScheduler, __super__);
    function HistoricalScheduler(initialClock, comparer) {
      var clock = initialClock == null ? 0 : initialClock;
      var cmp = comparer || defaultSubComparer;
      __super__.call(this, clock, cmp);
    }
    var HistoricalSchedulerProto = HistoricalScheduler.prototype;
    HistoricalSchedulerProto.add = function(absolute, relative) {
      return absolute + relative;
    };
    HistoricalSchedulerProto.toAbsoluteTime = function(absolute) {
      return new Date(absolute).getTime();
    };
    HistoricalSchedulerProto.toRelativeTime = function(timeSpan) {
      return timeSpan;
    };
    return HistoricalScheduler;
  }(Rx.VirtualTimeScheduler));
  return Rx;
}));
