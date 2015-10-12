"format global";
(function(global) {

  var defined = {};

  // indexOf polyfill for IE8
  var indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++)
      if (this[i] === item)
        return i;
    return -1;
  }

  var getOwnPropertyDescriptor = true;
  try {
    Object.getOwnPropertyDescriptor({ a: 0 }, 'a');
  }
  catch(e) {
    getOwnPropertyDescriptor = false;
  }

  var defineProperty;
  (function () {
    try {
      if (!!Object.defineProperty({}, 'a', {}))
        defineProperty = Object.defineProperty;
    }
    catch (e) {
      defineProperty = function(obj, prop, opt) {
        try {
          obj[prop] = opt.value || opt.get.call(obj);
        }
        catch(e) {}
      }
    }
  })();

  function register(name, deps, declare) {
    if (arguments.length === 4)
      return registerDynamic.apply(this, arguments);
    doRegister(name, {
      declarative: true,
      deps: deps,
      declare: declare
    });
  }

  function registerDynamic(name, deps, executingRequire, execute) {
    doRegister(name, {
      declarative: false,
      deps: deps,
      executingRequire: executingRequire,
      execute: execute
    });
  }

  function doRegister(name, entry) {
    entry.name = name;

    // we never overwrite an existing define
    if (!(name in defined))
      defined[name] = entry;

    // we have to normalize dependencies
    // (assume dependencies are normalized for now)
    // entry.normalizedDeps = entry.deps.map(normalize);
    entry.normalizedDeps = entry.deps;
  }


  function buildGroups(entry, groups) {
    groups[entry.groupIndex] = groups[entry.groupIndex] || [];

    if (indexOf.call(groups[entry.groupIndex], entry) != -1)
      return;

    groups[entry.groupIndex].push(entry);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];

      // not in the registry means already linked / ES6
      if (!depEntry || depEntry.evaluated)
        continue;

      // now we know the entry is in our unlinked linkage group
      var depGroupIndex = entry.groupIndex + (depEntry.declarative != entry.declarative);

      // the group index of an entry is always the maximum
      if (depEntry.groupIndex === undefined || depEntry.groupIndex < depGroupIndex) {

        // if already in a group, remove from the old group
        if (depEntry.groupIndex !== undefined) {
          groups[depEntry.groupIndex].splice(indexOf.call(groups[depEntry.groupIndex], depEntry), 1);

          // if the old group is empty, then we have a mixed depndency cycle
          if (groups[depEntry.groupIndex].length == 0)
            throw new TypeError("Mixed dependency cycle detected");
        }

        depEntry.groupIndex = depGroupIndex;
      }

      buildGroups(depEntry, groups);
    }
  }

  function link(name) {
    var startEntry = defined[name];

    startEntry.groupIndex = 0;

    var groups = [];

    buildGroups(startEntry, groups);

    var curGroupDeclarative = !!startEntry.declarative == groups.length % 2;
    for (var i = groups.length - 1; i >= 0; i--) {
      var group = groups[i];
      for (var j = 0; j < group.length; j++) {
        var entry = group[j];

        // link each group
        if (curGroupDeclarative)
          linkDeclarativeModule(entry);
        else
          linkDynamicModule(entry);
      }
      curGroupDeclarative = !curGroupDeclarative; 
    }
  }

  // module binding records
  var moduleRecords = {};
  function getOrCreateModuleRecord(name) {
    return moduleRecords[name] || (moduleRecords[name] = {
      name: name,
      dependencies: [],
      exports: {}, // start from an empty module and extend
      importers: []
    })
  }

  function linkDeclarativeModule(entry) {
    // only link if already not already started linking (stops at circular)
    if (entry.module)
      return;

    var module = entry.module = getOrCreateModuleRecord(entry.name);
    var exports = entry.module.exports;

    var declaration = entry.declare.call(global, function(name, value) {
      module.locked = true;

      if (typeof name == 'object') {
        for (var p in name)
          exports[p] = name[p];
      }
      else {
        exports[name] = value;
      }

      for (var i = 0, l = module.importers.length; i < l; i++) {
        var importerModule = module.importers[i];
        if (!importerModule.locked) {
          for (var j = 0; j < importerModule.dependencies.length; ++j) {
            if (importerModule.dependencies[j] === module) {
              importerModule.setters[j](exports);
            }
          }
        }
      }

      module.locked = false;
      return value;
    });

    module.setters = declaration.setters;
    module.execute = declaration.execute;

    // now link all the module dependencies
    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];
      var depModule = moduleRecords[depName];

      // work out how to set depExports based on scenarios...
      var depExports;

      if (depModule) {
        depExports = depModule.exports;
      }
      else if (depEntry && !depEntry.declarative) {
        depExports = depEntry.esModule;
      }
      // in the module registry
      else if (!depEntry) {
        depExports = load(depName);
      }
      // we have an entry -> link
      else {
        linkDeclarativeModule(depEntry);
        depModule = depEntry.module;
        depExports = depModule.exports;
      }

      // only declarative modules have dynamic bindings
      if (depModule && depModule.importers) {
        depModule.importers.push(module);
        module.dependencies.push(depModule);
      }
      else
        module.dependencies.push(null);

      // run the setter for this dependency
      if (module.setters[i])
        module.setters[i](depExports);
    }
  }

  // An analog to loader.get covering execution of all three layers (real declarative, simulated declarative, simulated dynamic)
  function getModule(name) {
    var exports;
    var entry = defined[name];

    if (!entry) {
      exports = load(name);
      if (!exports)
        throw new Error("Unable to load dependency " + name + ".");
    }

    else {
      if (entry.declarative)
        ensureEvaluated(name, []);

      else if (!entry.evaluated)
        linkDynamicModule(entry);

      exports = entry.module.exports;
    }

    if ((!entry || entry.declarative) && exports && exports.__useDefault)
      return exports['default'];

    return exports;
  }

  function linkDynamicModule(entry) {
    if (entry.module)
      return;

    var exports = {};

    var module = entry.module = { exports: exports, id: entry.name };

    // AMD requires execute the tree first
    if (!entry.executingRequire) {
      for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
        var depName = entry.normalizedDeps[i];
        var depEntry = defined[depName];
        if (depEntry)
          linkDynamicModule(depEntry);
      }
    }

    // now execute
    entry.evaluated = true;
    var output = entry.execute.call(global, function(name) {
      for (var i = 0, l = entry.deps.length; i < l; i++) {
        if (entry.deps[i] != name)
          continue;
        return getModule(entry.normalizedDeps[i]);
      }
      throw new TypeError('Module ' + name + ' not declared as a dependency.');
    }, exports, module);

    if (output)
      module.exports = output;

    // create the esModule object, which allows ES6 named imports of dynamics
    exports = module.exports;
 
    if (exports && exports.__esModule) {
      entry.esModule = exports;
    }
    else {
      entry.esModule = {};
      
      // don't trigger getters/setters in environments that support them
      if (typeof exports == 'object' || typeof exports == 'function') {
        if (getOwnPropertyDescriptor) {
          var d;
          for (var p in exports)
            if (d = Object.getOwnPropertyDescriptor(exports, p))
              defineProperty(entry.esModule, p, d);
        }
        else {
          var hasOwnProperty = exports && exports.hasOwnProperty;
          for (var p in exports) {
            if (!hasOwnProperty || exports.hasOwnProperty(p))
              entry.esModule[p] = exports[p];
          }
         }
       }
      entry.esModule['default'] = exports;
      defineProperty(entry.esModule, '__useDefault', {
        value: true
      });
    }
  }

  /*
   * Given a module, and the list of modules for this current branch,
   *  ensure that each of the dependencies of this module is evaluated
   *  (unless one is a circular dependency already in the list of seen
   *  modules, in which case we execute it)
   *
   * Then we evaluate the module itself depth-first left to right 
   * execution to match ES6 modules
   */
  function ensureEvaluated(moduleName, seen) {
    var entry = defined[moduleName];

    // if already seen, that means it's an already-evaluated non circular dependency
    if (!entry || entry.evaluated || !entry.declarative)
      return;

    // this only applies to declarative modules which late-execute

    seen.push(moduleName);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      if (indexOf.call(seen, depName) == -1) {
        if (!defined[depName])
          load(depName);
        else
          ensureEvaluated(depName, seen);
      }
    }

    if (entry.evaluated)
      return;

    entry.evaluated = true;
    entry.module.execute.call(global);
  }

  // magical execution function
  var modules = {};
  function load(name) {
    if (modules[name])
      return modules[name];

    // node core modules
    if (name.substr(0, 6) == '@node/')
      return require(name.substr(6));

    var entry = defined[name];

    // first we check if this module has already been defined in the registry
    if (!entry)
      throw "Module " + name + " not present.";

    // recursively ensure that the module and all its 
    // dependencies are linked (with dependency group handling)
    link(name);

    // now handle dependency execution in correct order
    ensureEvaluated(name, []);

    // remove from the registry
    defined[name] = undefined;

    // exported modules get __esModule defined for interop
    if (entry.declarative)
      defineProperty(entry.module.exports, '__esModule', { value: true });

    // return the defined module object
    return modules[name] = entry.declarative ? entry.module.exports : entry.esModule;
  };

  return function(mains, depNames, declare) {
    return function(formatDetect) {
      formatDetect(function(deps) {
        var System = {
          _nodeRequire: typeof require != 'undefined' && require.resolve && typeof process != 'undefined' && require,
          register: register,
          registerDynamic: registerDynamic,
          get: load, 
          set: function(name, module) {
            modules[name] = module; 
          },
          newModule: function(module) {
            return module;
          }
        };
        System.set('@empty', {});

        // register external dependencies
        for (var i = 0; i < depNames.length; i++) (function(depName, dep) {
          if (dep && dep.__esModule)
            System.register(depName, [], function(_export) {
              return {
                setters: [],
                execute: function() {
                  for (var p in dep)
                    if (p != '__esModule' && !(typeof p == 'object' && p + '' == 'Module'))
                      _export(p, dep[p]);
                }
              };
            });
          else
            System.registerDynamic(depName, [], false, function() {
              return dep;
            });
        })(depNames[i], arguments[i]);

        // register modules in this bundle
        declare(System);

        // load mains
        var firstLoad = load(mains[0]);
        if (mains.length > 1)
          for (var i = 1; i < mains.length; i++)
            load(mains[i]);

        if (firstLoad.__useDefault)
          return firstLoad['default'];
        else
          return firstLoad;
      });
    };
  };

})(typeof self != 'undefined' ? self : global)
/* (['mainModule'], ['external-dep'], function($__System) {
  System.register(...);
})
(function(factory) {
  if (typeof define && define.amd)
    define(['external-dep'], factory);
  // etc UMD / module pattern
})*/

(['1'], [], function($__System) {

(function(__global) {
  var loader = $__System;
  var indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++)
      if (this[i] === item)
        return i;
    return -1;
  }

  var commentRegEx = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;
  var cjsRequirePre = "(?:^|[^$_a-zA-Z\\xA0-\\uFFFF.])";
  var cjsRequirePost = "\\s*\\(\\s*(\"([^\"]+)\"|'([^']+)')\\s*\\)";
  var fnBracketRegEx = /\(([^\)]*)\)/;
  var wsRegEx = /^\s+|\s+$/g;
  
  var requireRegExs = {};

  function getCJSDeps(source, requireIndex) {

    // remove comments
    source = source.replace(commentRegEx, '');

    // determine the require alias
    var params = source.match(fnBracketRegEx);
    var requireAlias = (params[1].split(',')[requireIndex] || 'require').replace(wsRegEx, '');

    // find or generate the regex for this requireAlias
    var requireRegEx = requireRegExs[requireAlias] || (requireRegExs[requireAlias] = new RegExp(cjsRequirePre + requireAlias + cjsRequirePost, 'g'));

    requireRegEx.lastIndex = 0;

    var deps = [];

    var match;
    while (match = requireRegEx.exec(source))
      deps.push(match[2] || match[3]);

    return deps;
  }

  /*
    AMD-compatible require
    To copy RequireJS, set window.require = window.requirejs = loader.amdRequire
  */
  function require(names, callback, errback, referer) {
    // in amd, first arg can be a config object... we just ignore
    if (typeof names == 'object' && !(names instanceof Array))
      return require.apply(null, Array.prototype.splice.call(arguments, 1, arguments.length - 1));

    // amd require
    if (typeof names == 'string' && typeof callback == 'function')
      names = [names];
    if (names instanceof Array) {
      var dynamicRequires = [];
      for (var i = 0; i < names.length; i++)
        dynamicRequires.push(loader['import'](names[i], referer));
      Promise.all(dynamicRequires).then(function(modules) {
        if (callback)
          callback.apply(null, modules);
      }, errback);
    }

    // commonjs require
    else if (typeof names == 'string') {
      var module = loader.get(names);
      return module.__useDefault ? module['default'] : module;
    }

    else
      throw new TypeError('Invalid require');
  }

  function define(name, deps, factory) {
    if (typeof name != 'string') {
      factory = deps;
      deps = name;
      name = null;
    }
    if (!(deps instanceof Array)) {
      factory = deps;
      deps = ['require', 'exports', 'module'].splice(0, factory.length);
    }

    if (typeof factory != 'function')
      factory = (function(factory) {
        return function() { return factory; }
      })(factory);

    // in IE8, a trailing comma becomes a trailing undefined entry
    if (deps[deps.length - 1] === undefined)
      deps.pop();

    // remove system dependencies
    var requireIndex, exportsIndex, moduleIndex;
    
    if ((requireIndex = indexOf.call(deps, 'require')) != -1) {
      
      deps.splice(requireIndex, 1);

      // only trace cjs requires for non-named
      // named defines assume the trace has already been done
      if (!name)
        deps = deps.concat(getCJSDeps(factory.toString(), requireIndex));
    }

    if ((exportsIndex = indexOf.call(deps, 'exports')) != -1)
      deps.splice(exportsIndex, 1);
    
    if ((moduleIndex = indexOf.call(deps, 'module')) != -1)
      deps.splice(moduleIndex, 1);

    var define = {
      name: name,
      deps: deps,
      execute: function(req, exports, module) {

        var depValues = [];
        for (var i = 0; i < deps.length; i++)
          depValues.push(req(deps[i]));

        module.uri = module.id;

        module.config = function() {};

        // add back in system dependencies
        if (moduleIndex != -1)
          depValues.splice(moduleIndex, 0, module);
        
        if (exportsIndex != -1)
          depValues.splice(exportsIndex, 0, exports);
        
        if (requireIndex != -1) 
          depValues.splice(requireIndex, 0, function(names, callback, errback) {
            if (typeof names == 'string' && typeof callback != 'function')
              return req(names);
            return require.call(loader, names, callback, errback, module.id);
          });

        var output = factory.apply(exportsIndex == -1 ? __global : exports, depValues);

        if (typeof output == 'undefined' && module)
          output = module.exports;

        if (typeof output != 'undefined')
          return output;
      }
    };

    // anonymous define
    if (!name) {
      // already defined anonymously -> throw
      if (lastModule.anonDefine)
        throw new TypeError('Multiple defines for anonymous module');
      lastModule.anonDefine = define;
    }
    // named define
    else {
      // if we don't have any other defines,
      // then let this be an anonymous define
      // this is just to support single modules of the form:
      // define('jquery')
      // still loading anonymously
      // because it is done widely enough to be useful
      if (!lastModule.anonDefine && !lastModule.isBundle) {
        lastModule.anonDefine = define;
      }
      // otherwise its a bundle only
      else {
        // if there is an anonDefine already (we thought it could have had a single named define)
        // then we define it now
        // this is to avoid defining named defines when they are actually anonymous
        if (lastModule.anonDefine && lastModule.anonDefine.name)
          loader.registerDynamic(lastModule.anonDefine.name, lastModule.anonDefine.deps, false, lastModule.anonDefine.execute);

        lastModule.anonDefine = null;
      }

      // note this is now a bundle
      lastModule.isBundle = true;

      // define the module through the register registry
      loader.registerDynamic(name, define.deps, false, define.execute);
    }
  }
  define.amd = {};

  // adds define as a global (potentially just temporarily)
  function createDefine(loader) {
    lastModule.anonDefine = null;
    lastModule.isBundle = false;

    // ensure no NodeJS environment detection
    var oldModule = __global.module;
    var oldExports = __global.exports;
    var oldDefine = __global.define;

    __global.module = undefined;
    __global.exports = undefined;
    __global.define = define;

    return function() {
      __global.define = oldDefine;
      __global.module = oldModule;
      __global.exports = oldExports;
    };
  }

  var lastModule = {
    isBundle: false,
    anonDefine: null
  };

  loader.set('@@amd-helpers', loader.newModule({
    createDefine: createDefine,
    require: require,
    define: define,
    lastModule: lastModule
  }));
  loader.amdDefine = define;
  loader.amdRequire = require;
})(typeof self != 'undefined' ? self : global);

"bundle";
$__System.registerDynamic("2", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var process = module.exports = {};
  var queue = [];
  var draining = false;
  var currentQueue;
  var queueIndex = -1;
  function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
      queue = currentQueue.concat(queue);
    } else {
      queueIndex = -1;
    }
    if (queue.length) {
      drainQueue();
    }
  }
  function drainQueue() {
    if (draining) {
      return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;
    var len = queue.length;
    while (len) {
      currentQueue = queue;
      queue = [];
      while (++queueIndex < len) {
        if (currentQueue) {
          currentQueue[queueIndex].run();
        }
      }
      queueIndex = -1;
      len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
  }
  process.nextTick = function(fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
      for (var i = 1; i < arguments.length; i++) {
        args[i - 1] = arguments[i];
      }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
      setTimeout(drainQueue, 0);
    }
  };
  function Item(fun, array) {
    this.fun = fun;
    this.array = array;
  }
  Item.prototype.run = function() {
    this.fun.apply(null, this.array);
  };
  process.title = 'browser';
  process.browser = true;
  process.env = {};
  process.argv = [];
  process.version = '';
  process.versions = {};
  function noop() {}
  process.on = noop;
  process.addListener = noop;
  process.once = noop;
  process.off = noop;
  process.removeListener = noop;
  process.removeAllListeners = noop;
  process.emit = noop;
  process.binding = function(name) {
    throw new Error('process.binding is not supported');
  };
  process.cwd = function() {
    return '/';
  };
  process.chdir = function(dir) {
    throw new Error('process.chdir is not supported');
  };
  process.umask = function() {
    return 0;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3", ["2"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('2');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("4", ["3"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = $__System._nodeRequire ? process : req('3');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5", ["4"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('4');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("6", ["5"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "format cjs";
  (function(process) {
    ;
    (function(undefined) {
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
      var Rx = {
        internals: {},
        config: {Promise: root.Promise},
        helpers: {}
      };
      var noop = Rx.helpers.noop = function() {},
          identity = Rx.helpers.identity = function(x) {
            return x;
          },
          defaultNow = Rx.helpers.defaultNow = Date.now,
          defaultComparer = Rx.helpers.defaultComparer = function(x, y) {
            return isEqual(x, y);
          },
          defaultSubComparer = Rx.helpers.defaultSubComparer = function(x, y) {
            return x > y ? 1 : (x < y ? -1 : 0);
          },
          defaultKeySerializer = Rx.helpers.defaultKeySerializer = function(x) {
            return x.toString();
          },
          defaultError = Rx.helpers.defaultError = function(err) {
            throw err;
          },
          isPromise = Rx.helpers.isPromise = function(p) {
            return !!p && typeof p.subscribe !== 'function' && typeof p.then === 'function';
          },
          isFunction = Rx.helpers.isFunction = (function() {
            var isFn = function(value) {
              return typeof value == 'function' || false;
            };
            if (isFn(/x/)) {
              isFn = function(value) {
                return typeof value == 'function' && toString.call(value) == '[object Function]';
              };
            }
            return isFn;
          }());
      function cloneArray(arr) {
        for (var a = [],
            i = 0,
            len = arr.length; i < len; i++) {
          a.push(arr[i]);
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
      Rx.config.longStackSupport = false;
      var hasStacks = false,
          stacks = tryCatch(function() {
            throw new Error();
          })();
      hasStacks = !!stacks.e && !!stacks.e.stack;
      var rStartingLine = captureLine(),
          rFileName;
      var STACK_JUMP_SEPARATOR = 'From previous event:';
      function makeStackTraceLong(error, observable) {
        if (hasStacks && observable.stack && typeof error === 'object' && error !== null && error.stack && error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1) {
          var stacks = [];
          for (var o = observable; !!o; o = o.source) {
            if (o.stack) {
              stacks.unshift(o.stack);
            }
          }
          stacks.unshift(error.stack);
          var concatedStacks = stacks.join('\n' + STACK_JUMP_SEPARATOR + '\n');
          error.stack = filterStackString(concatedStacks);
        }
      }
      function filterStackString(stackString) {
        var lines = stackString.split('\n'),
            desiredLines = [];
        for (var i = 0,
            len = lines.length; i < len; i++) {
          var line = lines[i];
          if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
          }
        }
        return desiredLines.join('\n');
      }
      function isInternalFrame(stackLine) {
        var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);
        if (!fileNameAndLineNumber) {
          return false;
        }
        var fileName = fileNameAndLineNumber[0],
            lineNumber = fileNameAndLineNumber[1];
        return fileName === rFileName && lineNumber >= rStartingLine && lineNumber <= rEndingLine;
      }
      function isNodeFrame(stackLine) {
        return stackLine.indexOf('(module.js:') !== -1 || stackLine.indexOf('(node.js:') !== -1;
      }
      function captureLine() {
        if (!hasStacks) {
          return;
        }
        try {
          throw new Error();
        } catch (e) {
          var lines = e.stack.split('\n');
          var firstLine = lines[0].indexOf('@') > 0 ? lines[1] : lines[2];
          var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
          if (!fileNameAndLineNumber) {
            return;
          }
          rFileName = fileNameAndLineNumber[0];
          return fileNameAndLineNumber[1];
        }
      }
      function getFileNameAndLineNumber(stackLine) {
        var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
        if (attempt1) {
          return [attempt1[1], Number(attempt1[2])];
        }
        var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
        if (attempt2) {
          return [attempt2[1], Number(attempt2[2])];
        }
        var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
        if (attempt3) {
          return [attempt3[1], Number(attempt3[2])];
        }
      }
      var EmptyError = Rx.EmptyError = function() {
        this.message = 'Sequence contains no elements.';
        this.name = 'EmptyError';
        Error.call(this);
      };
      EmptyError.prototype = Object.create(Error.prototype);
      var ObjectDisposedError = Rx.ObjectDisposedError = function() {
        this.message = 'Object has been disposed';
        this.name = 'ObjectDisposedError';
        Error.call(this);
      };
      ObjectDisposedError.prototype = Object.create(Error.prototype);
      var ArgumentOutOfRangeError = Rx.ArgumentOutOfRangeError = function() {
        this.message = 'Argument out of range';
        this.name = 'ArgumentOutOfRangeError';
        Error.call(this);
      };
      ArgumentOutOfRangeError.prototype = Object.create(Error.prototype);
      var NotSupportedError = Rx.NotSupportedError = function(message) {
        this.message = message || 'This operation is not supported';
        this.name = 'NotSupportedError';
        Error.call(this);
      };
      NotSupportedError.prototype = Object.create(Error.prototype);
      var NotImplementedError = Rx.NotImplementedError = function(message) {
        this.message = message || 'This operation is not implemented';
        this.name = 'NotImplementedError';
        Error.call(this);
      };
      NotImplementedError.prototype = Object.create(Error.prototype);
      var notImplemented = Rx.helpers.notImplemented = function() {
        throw new NotImplementedError();
      };
      var notSupported = Rx.helpers.notSupported = function() {
        throw new NotSupportedError();
      };
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
      var bindCallback = Rx.internals.bindCallback = function(func, thisArg, argCount) {
        if (typeof thisArg === 'undefined') {
          return func;
        }
        switch (argCount) {
          case 0:
            return function() {
              return func.call(thisArg);
            };
          case 1:
            return function(arg) {
              return func.call(thisArg, arg);
            };
          case 2:
            return function(value, index) {
              return func.call(thisArg, value, index);
            };
          case 3:
            return function(value, index, collection) {
              return func.call(thisArg, value, index, collection);
            };
        }
        return function() {
          return func.apply(thisArg, arguments);
        };
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
      var hasProp = {}.hasOwnProperty,
          slice = Array.prototype.slice;
      var inherits = Rx.internals.inherits = function(child, parent) {
        function __() {
          this.constructor = child;
        }
        __.prototype = parent.prototype;
        child.prototype = new __();
      };
      var addProperties = Rx.internals.addProperties = function(obj) {
        for (var sources = [],
            i = 1,
            len = arguments.length; i < len; i++) {
          sources.push(arguments[i]);
        }
        for (var idx = 0,
            ln = sources.length; idx < ln; idx++) {
          var source = sources[idx];
          for (var prop in source) {
            obj[prop] = source[prop];
          }
        }
      };
      var addRef = Rx.internals.addRef = function(xs, r) {
        return new AnonymousObservable(function(observer) {
          return new BinaryDisposable(r.getDisposable(), xs.subscribe(observer));
        });
      };
      function arrayInitialize(count, factory) {
        var a = new Array(count);
        for (var i = 0; i < count; i++) {
          a[i] = factory();
        }
        return a;
      }
      var CompositeDisposable = Rx.CompositeDisposable = function() {
        var args = [],
            i,
            len;
        if (Array.isArray(arguments[0])) {
          args = arguments[0];
          len = args.length;
        } else {
          len = arguments.length;
          args = new Array(len);
          for (i = 0; i < len; i++) {
            args[i] = arguments[i];
          }
        }
        this.disposables = args;
        this.isDisposed = false;
        this.length = args.length;
      };
      var CompositeDisposablePrototype = CompositeDisposable.prototype;
      CompositeDisposablePrototype.add = function(item) {
        if (this.isDisposed) {
          item.dispose();
        } else {
          this.disposables.push(item);
          this.length++;
        }
      };
      CompositeDisposablePrototype.remove = function(item) {
        var shouldDispose = false;
        if (!this.isDisposed) {
          var idx = this.disposables.indexOf(item);
          if (idx !== -1) {
            shouldDispose = true;
            this.disposables.splice(idx, 1);
            this.length--;
            item.dispose();
          }
        }
        return shouldDispose;
      };
      CompositeDisposablePrototype.dispose = function() {
        if (!this.isDisposed) {
          this.isDisposed = true;
          var len = this.disposables.length,
              currentDisposables = new Array(len);
          for (var i = 0; i < len; i++) {
            currentDisposables[i] = this.disposables[i];
          }
          this.disposables = [];
          this.length = 0;
          for (i = 0; i < len; i++) {
            currentDisposables[i].dispose();
          }
        }
      };
      var Disposable = Rx.Disposable = function(action) {
        this.isDisposed = false;
        this.action = action || noop;
      };
      Disposable.prototype.dispose = function() {
        if (!this.isDisposed) {
          this.action();
          this.isDisposed = true;
        }
      };
      var disposableCreate = Disposable.create = function(action) {
        return new Disposable(action);
      };
      var disposableEmpty = Disposable.empty = {dispose: noop};
      var isDisposable = Disposable.isDisposable = function(d) {
        return d && isFunction(d.dispose);
      };
      var checkDisposed = Disposable.checkDisposed = function(disposable) {
        if (disposable.isDisposed) {
          throw new ObjectDisposedError();
        }
      };
      var disposableFixup = Disposable._fixup = function(result) {
        return isDisposable(result) ? result : disposableEmpty;
      };
      var SingleAssignmentDisposable = Rx.SingleAssignmentDisposable = function() {
        this.isDisposed = false;
        this.current = null;
      };
      SingleAssignmentDisposable.prototype.getDisposable = function() {
        return this.current;
      };
      SingleAssignmentDisposable.prototype.setDisposable = function(value) {
        if (this.current) {
          throw new Error('Disposable has already been assigned');
        }
        var shouldDispose = this.isDisposed;
        !shouldDispose && (this.current = value);
        shouldDispose && value && value.dispose();
      };
      SingleAssignmentDisposable.prototype.dispose = function() {
        if (!this.isDisposed) {
          this.isDisposed = true;
          var old = this.current;
          this.current = null;
          old && old.dispose();
        }
      };
      var SerialDisposable = Rx.SerialDisposable = function() {
        this.isDisposed = false;
        this.current = null;
      };
      SerialDisposable.prototype.getDisposable = function() {
        return this.current;
      };
      SerialDisposable.prototype.setDisposable = function(value) {
        var shouldDispose = this.isDisposed;
        if (!shouldDispose) {
          var old = this.current;
          this.current = value;
        }
        old && old.dispose();
        shouldDispose && value && value.dispose();
      };
      SerialDisposable.prototype.dispose = function() {
        if (!this.isDisposed) {
          this.isDisposed = true;
          var old = this.current;
          this.current = null;
        }
        old && old.dispose();
      };
      var BinaryDisposable = Rx.BinaryDisposable = function(first, second) {
        this._first = first;
        this._second = second;
        this.isDisposed = false;
      };
      BinaryDisposable.prototype.dispose = function() {
        if (!this.isDisposed) {
          this.isDisposed = true;
          var old1 = this._first;
          this._first = null;
          old1 && old1.dispose();
          var old2 = this._second;
          this._second = null;
          old2 && old2.dispose();
        }
      };
      var NAryDisposable = Rx.NAryDisposable = function(disposables) {
        this._disposables = disposables;
        this.isDisposed = false;
      };
      NAryDisposable.prototype.dispose = function() {
        if (!this.isDisposed) {
          this.isDisposed = true;
          for (var i = 0,
              len = this._disposables.length; i < len; i++) {
            this._disposables[i].dispose();
          }
          this._disposables.length = 0;
        }
      };
      var RefCountDisposable = Rx.RefCountDisposable = (function() {
        function InnerDisposable(disposable) {
          this.disposable = disposable;
          this.disposable.count++;
          this.isInnerDisposed = false;
        }
        InnerDisposable.prototype.dispose = function() {
          if (!this.disposable.isDisposed && !this.isInnerDisposed) {
            this.isInnerDisposed = true;
            this.disposable.count--;
            if (this.disposable.count === 0 && this.disposable.isPrimaryDisposed) {
              this.disposable.isDisposed = true;
              this.disposable.underlyingDisposable.dispose();
            }
          }
        };
        function RefCountDisposable(disposable) {
          this.underlyingDisposable = disposable;
          this.isDisposed = false;
          this.isPrimaryDisposed = false;
          this.count = 0;
        }
        RefCountDisposable.prototype.dispose = function() {
          if (!this.isDisposed && !this.isPrimaryDisposed) {
            this.isPrimaryDisposed = true;
            if (this.count === 0) {
              this.isDisposed = true;
              this.underlyingDisposable.dispose();
            }
          }
        };
        RefCountDisposable.prototype.getDisposable = function() {
          return this.isDisposed ? disposableEmpty : new InnerDisposable(this);
        };
        return RefCountDisposable;
      })();
      function ScheduledDisposable(scheduler, disposable) {
        this.scheduler = scheduler;
        this.disposable = disposable;
        this.isDisposed = false;
      }
      function scheduleItem(s, self) {
        if (!self.isDisposed) {
          self.isDisposed = true;
          self.disposable.dispose();
        }
      }
      ScheduledDisposable.prototype.dispose = function() {
        this.scheduler.schedule(this, scheduleItem);
      };
      var ScheduledItem = Rx.internals.ScheduledItem = function(scheduler, state, action, dueTime, comparer) {
        this.scheduler = scheduler;
        this.state = state;
        this.action = action;
        this.dueTime = dueTime;
        this.comparer = comparer || defaultSubComparer;
        this.disposable = new SingleAssignmentDisposable();
      };
      ScheduledItem.prototype.invoke = function() {
        this.disposable.setDisposable(this.invokeCore());
      };
      ScheduledItem.prototype.compareTo = function(other) {
        return this.comparer(this.dueTime, other.dueTime);
      };
      ScheduledItem.prototype.isCancelled = function() {
        return this.disposable.isDisposed;
      };
      ScheduledItem.prototype.invokeCore = function() {
        return disposableFixup(this.action(this.scheduler, this.state));
      };
      var Scheduler = Rx.Scheduler = (function() {
        function Scheduler() {}
        Scheduler.isScheduler = function(s) {
          return s instanceof Scheduler;
        };
        var schedulerProto = Scheduler.prototype;
        schedulerProto.schedule = function(state, action) {
          throw new NotImplementedError();
        };
        schedulerProto.scheduleFuture = function(state, dueTime, action) {
          var dt = dueTime;
          dt instanceof Date && (dt = dt - this.now());
          dt = Scheduler.normalize(dt);
          if (dt === 0) {
            return this.schedule(state, action);
          }
          return this._scheduleFuture(state, dt, action);
        };
        schedulerProto._scheduleFuture = function(state, dueTime, action) {
          throw new NotImplementedError();
        };
        Scheduler.now = defaultNow;
        Scheduler.prototype.now = defaultNow;
        Scheduler.normalize = function(timeSpan) {
          timeSpan < 0 && (timeSpan = 0);
          return timeSpan;
        };
        return Scheduler;
      }());
      var normalizeTime = Scheduler.normalize,
          isScheduler = Scheduler.isScheduler;
      (function(schedulerProto) {
        function invokeRecImmediate(scheduler, pair) {
          var state = pair[0],
              action = pair[1],
              group = new CompositeDisposable();
          action(state, innerAction);
          return group;
          function innerAction(state2) {
            var isAdded = false,
                isDone = false;
            var d = scheduler.schedule(state2, scheduleWork);
            if (!isDone) {
              group.add(d);
              isAdded = true;
            }
            function scheduleWork(_, state3) {
              if (isAdded) {
                group.remove(d);
              } else {
                isDone = true;
              }
              action(state3, innerAction);
              return disposableEmpty;
            }
          }
        }
        function invokeRecDate(scheduler, pair) {
          var state = pair[0],
              action = pair[1],
              group = new CompositeDisposable();
          action(state, innerAction);
          return group;
          function innerAction(state2, dueTime1) {
            var isAdded = false,
                isDone = false;
            var d = scheduler.scheduleFuture(state2, dueTime1, scheduleWork);
            if (!isDone) {
              group.add(d);
              isAdded = true;
            }
            function scheduleWork(_, state3) {
              if (isAdded) {
                group.remove(d);
              } else {
                isDone = true;
              }
              action(state3, innerAction);
              return disposableEmpty;
            }
          }
        }
        schedulerProto.scheduleRecursive = function(state, action) {
          return this.schedule([state, action], invokeRecImmediate);
        };
        schedulerProto.scheduleRecursiveFuture = function(state, dueTime, action) {
          return this.scheduleFuture([state, action], dueTime, invokeRecDate);
        };
      }(Scheduler.prototype));
      (function(schedulerProto) {
        Scheduler.prototype.schedulePeriodic = function(state, period, action) {
          if (typeof root.setInterval === 'undefined') {
            throw new NotSupportedError();
          }
          period = normalizeTime(period);
          var s = state,
              id = root.setInterval(function() {
                s = action(s);
              }, period);
          return disposableCreate(function() {
            root.clearInterval(id);
          });
        };
      }(Scheduler.prototype));
      (function(schedulerProto) {
        schedulerProto.catchError = schedulerProto['catch'] = function(handler) {
          return new CatchScheduler(this, handler);
        };
      }(Scheduler.prototype));
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
      var ImmediateScheduler = (function(__super__) {
        inherits(ImmediateScheduler, __super__);
        function ImmediateScheduler() {
          __super__.call(this);
        }
        ImmediateScheduler.prototype.schedule = function(state, action) {
          return disposableFixup(action(this, state));
        };
        return ImmediateScheduler;
      }(Scheduler));
      var immediateScheduler = Scheduler.immediate = new ImmediateScheduler();
      var CurrentThreadScheduler = (function(__super__) {
        var queue;
        function runTrampoline() {
          while (queue.length > 0) {
            var item = queue.dequeue();
            !item.isCancelled() && item.invoke();
          }
        }
        inherits(CurrentThreadScheduler, __super__);
        function CurrentThreadScheduler() {
          __super__.call(this);
        }
        CurrentThreadScheduler.prototype.schedule = function(state, action) {
          var si = new ScheduledItem(this, state, action, this.now());
          if (!queue) {
            queue = new PriorityQueue(4);
            queue.enqueue(si);
            var result = tryCatch(runTrampoline)();
            queue = null;
            if (result === errorObj) {
              thrower(result.e);
            }
          } else {
            queue.enqueue(si);
          }
          return si.disposable;
        };
        CurrentThreadScheduler.prototype.scheduleRequired = function() {
          return !queue;
        };
        return CurrentThreadScheduler;
      }(Scheduler));
      var currentThreadScheduler = Scheduler.currentThread = new CurrentThreadScheduler();
      var scheduleMethod,
          clearMethod;
      var localTimer = (function() {
        var localSetTimeout,
            localClearTimeout = noop;
        if (!!root.setTimeout) {
          localSetTimeout = root.setTimeout;
          localClearTimeout = root.clearTimeout;
        } else if (!!root.WScript) {
          localSetTimeout = function(fn, time) {
            root.WScript.Sleep(time);
            fn();
          };
        } else {
          throw new NotSupportedError();
        }
        return {
          setTimeout: localSetTimeout,
          clearTimeout: localClearTimeout
        };
      }());
      var localSetTimeout = localTimer.setTimeout,
          localClearTimeout = localTimer.clearTimeout;
      (function() {
        var nextHandle = 1,
            tasksByHandle = {},
            currentlyRunning = false;
        clearMethod = function(handle) {
          delete tasksByHandle[handle];
        };
        function runTask(handle) {
          if (currentlyRunning) {
            localSetTimeout(function() {
              runTask(handle);
            }, 0);
          } else {
            var task = tasksByHandle[handle];
            if (task) {
              currentlyRunning = true;
              var result = tryCatch(task)();
              clearMethod(handle);
              currentlyRunning = false;
              if (result === errorObj) {
                thrower(result.e);
              }
            }
          }
        }
        var reNative = new RegExp('^' + String(toString).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/toString| for [^\]]+/g, '.*?') + '$');
        var setImmediate = typeof(setImmediate = freeGlobal && moduleExports && freeGlobal.setImmediate) == 'function' && !reNative.test(setImmediate) && setImmediate;
        function postMessageSupported() {
          if (!root.postMessage || root.importScripts) {
            return false;
          }
          var isAsync = false,
              oldHandler = root.onmessage;
          root.onmessage = function() {
            isAsync = true;
          };
          root.postMessage('', '*');
          root.onmessage = oldHandler;
          return isAsync;
        }
        if (isFunction(setImmediate)) {
          scheduleMethod = function(action) {
            var id = nextHandle++;
            tasksByHandle[id] = action;
            setImmediate(function() {
              runTask(id);
            });
            return id;
          };
        } else if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
          scheduleMethod = function(action) {
            var id = nextHandle++;
            tasksByHandle[id] = action;
            process.nextTick(function() {
              runTask(id);
            });
            return id;
          };
        } else if (postMessageSupported()) {
          var MSG_PREFIX = 'ms.rx.schedule' + Math.random();
          function onGlobalPostMessage(event) {
            if (typeof event.data === 'string' && event.data.substring(0, MSG_PREFIX.length) === MSG_PREFIX) {
              runTask(event.data.substring(MSG_PREFIX.length));
            }
          }
          if (root.addEventListener) {
            root.addEventListener('message', onGlobalPostMessage, false);
          } else if (root.attachEvent) {
            root.attachEvent('onmessage', onGlobalPostMessage);
          } else {
            root.onmessage = onGlobalPostMessage;
          }
          scheduleMethod = function(action) {
            var id = nextHandle++;
            tasksByHandle[id] = action;
            root.postMessage(MSG_PREFIX + currentId, '*');
            return id;
          };
        } else if (!!root.MessageChannel) {
          var channel = new root.MessageChannel();
          channel.port1.onmessage = function(e) {
            runTask(e.data);
          };
          scheduleMethod = function(action) {
            var id = nextHandle++;
            tasksByHandle[id] = action;
            channel.port2.postMessage(id);
            return id;
          };
        } else if ('document' in root && 'onreadystatechange' in root.document.createElement('script')) {
          scheduleMethod = function(action) {
            var scriptElement = root.document.createElement('script');
            var id = nextHandle++;
            tasksByHandle[id] = action;
            scriptElement.onreadystatechange = function() {
              runTask(id);
              scriptElement.onreadystatechange = null;
              scriptElement.parentNode.removeChild(scriptElement);
              scriptElement = null;
            };
            root.document.documentElement.appendChild(scriptElement);
            return id;
          };
        } else {
          scheduleMethod = function(action) {
            var id = nextHandle++;
            tasksByHandle[id] = action;
            localSetTimeout(function() {
              runTask(id);
            }, 0);
            return id;
          };
        }
      }());
      var DefaultScheduler = (function(__super__) {
        inherits(DefaultScheduler, __super__);
        function DefaultScheduler() {
          __super__.call(this);
        }
        function DefaultSchedulerDisposable(id) {
          this._id = id;
          this.isDisposed = false;
        }
        DefaultSchedulerDisposable.prototype.dispose = function() {
          if (!this.isDisposed) {
            this.isDisposed = true;
            localClearTimeout(this._id);
          }
        };
        DefaultScheduler.prototype.schedule = function(state, action) {
          var scheduler = this,
              disposable = new SingleAssignmentDisposable();
          var id = scheduleMethod(function() {
            !disposable.isDisposed && disposable.setDisposable(disposableFixup(action(scheduler, state)));
          });
          return new BinaryDisposable(disposable, new DefaultSchedulerDisposable(id));
        };
        DefaultScheduler.prototype._scheduleFuture = function(state, dueTime, action) {
          var scheduler = this,
              dt = Scheduler.normalize(dueTime),
              disposable = new SingleAssignmentDisposable();
          if (dt === 0) {
            return scheduler.schedule(state, action);
          }
          var id = localSetTimeout(function() {
            !disposable.isDisposed && disposable.setDisposable(disposableFixup(action(scheduler, state)));
          }, dt);
          return new BinaryDisposable(disposable, new DefaultSchedulerDisposable(id));
        };
        return DefaultScheduler;
      }(Scheduler));
      var defaultScheduler = Scheduler['default'] = Scheduler.async = new DefaultScheduler();
      var CatchScheduler = (function(__super__) {
        inherits(CatchScheduler, __super__);
        function CatchScheduler(scheduler, handler) {
          this._scheduler = scheduler;
          this._handler = handler;
          this._recursiveOriginal = null;
          this._recursiveWrapper = null;
          __super__.call(this);
        }
        CatchScheduler.prototype.schedule = function(state, action) {
          return this._scheduler.schedule(state, this._wrap(action));
        };
        CatchScheduler.prototype._scheduleFuture = function(state, dueTime, action) {
          return this._scheduler.schedule(state, dueTime, this._wrap(action));
        };
        CatchScheduler.prototype.now = function() {
          return this._scheduler.now();
        };
        CatchScheduler.prototype._clone = function(scheduler) {
          return new CatchScheduler(scheduler, this._handler);
        };
        CatchScheduler.prototype._wrap = function(action) {
          var parent = this;
          return function(self, state) {
            var res = tryCatch(action)(parent._getRecursiveWrapper(self), state);
            if (res === errorObj) {
              if (!parent._handler(res.e)) {
                thrower(res.e);
              }
              return disposableEmpty;
            }
            return disposableFixup(ret);
          };
        };
        CatchScheduler.prototype._getRecursiveWrapper = function(scheduler) {
          if (this._recursiveOriginal !== scheduler) {
            this._recursiveOriginal = scheduler;
            var wrapper = this._clone(scheduler);
            wrapper._recursiveOriginal = scheduler;
            wrapper._recursiveWrapper = wrapper;
            this._recursiveWrapper = wrapper;
          }
          return this._recursiveWrapper;
        };
        CatchScheduler.prototype.schedulePeriodic = function(state, period, action) {
          var self = this,
              failed = false,
              d = new SingleAssignmentDisposable();
          d.setDisposable(this._scheduler.schedulePeriodic(state, period, function(state1) {
            if (failed) {
              return null;
            }
            var res = tryCatch(action)(state1);
            if (res === errorObj) {
              failed = true;
              if (!self._handler(res.e)) {
                thrower(res.e);
              }
              d.dispose();
              return null;
            }
            return ret;
          }));
          return d;
        };
        return CatchScheduler;
      }(Scheduler));
      function IndexedItem(id, value) {
        this.id = id;
        this.value = value;
      }
      IndexedItem.prototype.compareTo = function(other) {
        var c = this.value.compareTo(other.value);
        c === 0 && (c = this.id - other.id);
        return c;
      };
      var PriorityQueue = Rx.internals.PriorityQueue = function(capacity) {
        this.items = new Array(capacity);
        this.length = 0;
      };
      var priorityProto = PriorityQueue.prototype;
      priorityProto.isHigherPriority = function(left, right) {
        return this.items[left].compareTo(this.items[right]) < 0;
      };
      priorityProto.percolate = function(index) {
        if (index >= this.length || index < 0) {
          return;
        }
        var parent = index - 1 >> 1;
        if (parent < 0 || parent === index) {
          return;
        }
        if (this.isHigherPriority(index, parent)) {
          var temp = this.items[index];
          this.items[index] = this.items[parent];
          this.items[parent] = temp;
          this.percolate(parent);
        }
      };
      priorityProto.heapify = function(index) {
        +index || (index = 0);
        if (index >= this.length || index < 0) {
          return;
        }
        var left = 2 * index + 1,
            right = 2 * index + 2,
            first = index;
        if (left < this.length && this.isHigherPriority(left, first)) {
          first = left;
        }
        if (right < this.length && this.isHigherPriority(right, first)) {
          first = right;
        }
        if (first !== index) {
          var temp = this.items[index];
          this.items[index] = this.items[first];
          this.items[first] = temp;
          this.heapify(first);
        }
      };
      priorityProto.peek = function() {
        return this.items[0].value;
      };
      priorityProto.removeAt = function(index) {
        this.items[index] = this.items[--this.length];
        this.items[this.length] = undefined;
        this.heapify();
      };
      priorityProto.dequeue = function() {
        var result = this.peek();
        this.removeAt(0);
        return result;
      };
      priorityProto.enqueue = function(item) {
        var index = this.length++;
        this.items[index] = new IndexedItem(PriorityQueue.count++, item);
        this.percolate(index);
      };
      priorityProto.remove = function(item) {
        for (var i = 0; i < this.length; i++) {
          if (this.items[i].value === item) {
            this.removeAt(i);
            return true;
          }
        }
        return false;
      };
      PriorityQueue.count = 0;
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
      var Observer = Rx.Observer = function() {};
      Observer.prototype.toNotifier = function() {
        var observer = this;
        return function(n) {
          return n.accept(observer);
        };
      };
      Observer.prototype.asObserver = function() {
        var self = this;
        return new AnonymousObserver(function(x) {
          self.onNext(x);
        }, function(err) {
          self.onError(err);
        }, function() {
          self.onCompleted();
        });
      };
      Observer.prototype.checked = function() {
        return new CheckedObserver(this);
      };
      var observerCreate = Observer.create = function(onNext, onError, onCompleted) {
        onNext || (onNext = noop);
        onError || (onError = defaultError);
        onCompleted || (onCompleted = noop);
        return new AnonymousObserver(onNext, onError, onCompleted);
      };
      Observer.fromNotifier = function(handler, thisArg) {
        var cb = bindCallback(handler, thisArg, 1);
        return new AnonymousObserver(function(x) {
          return cb(notificationCreateOnNext(x));
        }, function(e) {
          return cb(notificationCreateOnError(e));
        }, function() {
          return cb(notificationCreateOnCompleted());
        });
      };
      Observer.prototype.notifyOn = function(scheduler) {
        return new ObserveOnObserver(scheduler, this);
      };
      Observer.prototype.makeSafe = function(disposable) {
        return new AnonymousSafeObserver(this._onNext, this._onError, this._onCompleted, disposable);
      };
      var AbstractObserver = Rx.internals.AbstractObserver = (function(__super__) {
        inherits(AbstractObserver, __super__);
        function AbstractObserver() {
          this.isStopped = false;
        }
        AbstractObserver.prototype.next = notImplemented;
        AbstractObserver.prototype.error = notImplemented;
        AbstractObserver.prototype.completed = notImplemented;
        AbstractObserver.prototype.onNext = function(value) {
          !this.isStopped && this.next(value);
        };
        AbstractObserver.prototype.onError = function(error) {
          if (!this.isStopped) {
            this.isStopped = true;
            this.error(error);
          }
        };
        AbstractObserver.prototype.onCompleted = function() {
          if (!this.isStopped) {
            this.isStopped = true;
            this.completed();
          }
        };
        AbstractObserver.prototype.dispose = function() {
          this.isStopped = true;
        };
        AbstractObserver.prototype.fail = function(e) {
          if (!this.isStopped) {
            this.isStopped = true;
            this.error(e);
            return true;
          }
          return false;
        };
        return AbstractObserver;
      }(Observer));
      var AnonymousObserver = Rx.AnonymousObserver = (function(__super__) {
        inherits(AnonymousObserver, __super__);
        function AnonymousObserver(onNext, onError, onCompleted) {
          __super__.call(this);
          this._onNext = onNext;
          this._onError = onError;
          this._onCompleted = onCompleted;
        }
        AnonymousObserver.prototype.next = function(value) {
          this._onNext(value);
        };
        AnonymousObserver.prototype.error = function(error) {
          this._onError(error);
        };
        AnonymousObserver.prototype.completed = function() {
          this._onCompleted();
        };
        return AnonymousObserver;
      }(AbstractObserver));
      var CheckedObserver = (function(__super__) {
        inherits(CheckedObserver, __super__);
        function CheckedObserver(observer) {
          __super__.call(this);
          this._observer = observer;
          this._state = 0;
        }
        var CheckedObserverPrototype = CheckedObserver.prototype;
        CheckedObserverPrototype.onNext = function(value) {
          this.checkAccess();
          var res = tryCatch(this._observer.onNext).call(this._observer, value);
          this._state = 0;
          res === errorObj && thrower(res.e);
        };
        CheckedObserverPrototype.onError = function(err) {
          this.checkAccess();
          var res = tryCatch(this._observer.onError).call(this._observer, err);
          this._state = 2;
          res === errorObj && thrower(res.e);
        };
        CheckedObserverPrototype.onCompleted = function() {
          this.checkAccess();
          var res = tryCatch(this._observer.onCompleted).call(this._observer);
          this._state = 2;
          res === errorObj && thrower(res.e);
        };
        CheckedObserverPrototype.checkAccess = function() {
          if (this._state === 1) {
            throw new Error('Re-entrancy detected');
          }
          if (this._state === 2) {
            throw new Error('Observer completed');
          }
          if (this._state === 0) {
            this._state = 1;
          }
        };
        return CheckedObserver;
      }(Observer));
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
      var ObserveOnObserver = (function(__super__) {
        inherits(ObserveOnObserver, __super__);
        function ObserveOnObserver(scheduler, observer, cancel) {
          __super__.call(this, scheduler, observer);
          this._cancel = cancel;
        }
        ObserveOnObserver.prototype.next = function(value) {
          __super__.prototype.next.call(this, value);
          this.ensureActive();
        };
        ObserveOnObserver.prototype.error = function(e) {
          __super__.prototype.error.call(this, e);
          this.ensureActive();
        };
        ObserveOnObserver.prototype.completed = function() {
          __super__.prototype.completed.call(this);
          this.ensureActive();
        };
        ObserveOnObserver.prototype.dispose = function() {
          __super__.prototype.dispose.call(this);
          this._cancel && this._cancel.dispose();
          this._cancel = null;
        };
        return ObserveOnObserver;
      })(ScheduledObserver);
      var observableProto;
      var Observable = Rx.Observable = (function() {
        function makeSubscribe(self, subscribe) {
          return function(o) {
            var oldOnError = o.onError;
            o.onError = function(e) {
              makeStackTraceLong(e, self);
              oldOnError.call(o, e);
            };
            return subscribe.call(self, o);
          };
        }
        function Observable() {
          if (Rx.config.longStackSupport && hasStacks) {
            var oldSubscribe = this._subscribe;
            var e = tryCatch(thrower)(new Error()).e;
            this.stack = e.stack.substring(e.stack.indexOf('\n') + 1);
            this._subscribe = makeSubscribe(this, oldSubscribe);
          }
        }
        observableProto = Observable.prototype;
        Observable.isObservable = function(o) {
          return o && isFunction(o.subscribe);
        };
        observableProto.subscribe = observableProto.forEach = function(oOrOnNext, onError, onCompleted) {
          return this._subscribe(typeof oOrOnNext === 'object' ? oOrOnNext : observerCreate(oOrOnNext, onError, onCompleted));
        };
        observableProto.subscribeOnNext = function(onNext, thisArg) {
          return this._subscribe(observerCreate(typeof thisArg !== 'undefined' ? function(x) {
            onNext.call(thisArg, x);
          } : onNext));
        };
        observableProto.subscribeOnError = function(onError, thisArg) {
          return this._subscribe(observerCreate(null, typeof thisArg !== 'undefined' ? function(e) {
            onError.call(thisArg, e);
          } : onError));
        };
        observableProto.subscribeOnCompleted = function(onCompleted, thisArg) {
          return this._subscribe(observerCreate(null, null, typeof thisArg !== 'undefined' ? function() {
            onCompleted.call(thisArg);
          } : onCompleted));
        };
        return Observable;
      })();
      var ObservableBase = Rx.ObservableBase = (function(__super__) {
        inherits(ObservableBase, __super__);
        function fixSubscriber(subscriber) {
          return subscriber && isFunction(subscriber.dispose) ? subscriber : isFunction(subscriber) ? disposableCreate(subscriber) : disposableEmpty;
        }
        function setDisposable(s, state) {
          var ado = state[0],
              self = state[1];
          var sub = tryCatch(self.subscribeCore).call(self, ado);
          if (sub === errorObj && !ado.fail(errorObj.e)) {
            thrower(errorObj.e);
          }
          ado.setDisposable(fixSubscriber(sub));
        }
        function ObservableBase() {
          __super__.call(this);
        }
        ObservableBase.prototype._subscribe = function(o) {
          var ado = new AutoDetachObserver(o),
              state = [ado, this];
          if (currentThreadScheduler.scheduleRequired()) {
            currentThreadScheduler.schedule(state, setDisposable);
          } else {
            setDisposable(null, state);
          }
          return ado;
        };
        ObservableBase.prototype.subscribeCore = notImplemented;
        return ObservableBase;
      }(Observable));
      var FlatMapObservable = Rx.FlatMapObservable = (function(__super__) {
        inherits(FlatMapObservable, __super__);
        function FlatMapObservable(source, selector, resultSelector, thisArg) {
          this.resultSelector = isFunction(resultSelector) ? resultSelector : null;
          this.selector = bindCallback(isFunction(selector) ? selector : function() {
            return selector;
          }, thisArg, 3);
          this.source = source;
          __super__.call(this);
        }
        FlatMapObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new InnerObserver(o, this.selector, this.resultSelector, this));
        };
        inherits(InnerObserver, AbstractObserver);
        function InnerObserver(observer, selector, resultSelector, source) {
          this.i = 0;
          this.selector = selector;
          this.resultSelector = resultSelector;
          this.source = source;
          this.o = observer;
          AbstractObserver.call(this);
        }
        InnerObserver.prototype._wrapResult = function(result, x, i) {
          return this.resultSelector ? result.map(function(y, i2) {
            return this.resultSelector(x, y, i, i2);
          }, this) : result;
        };
        InnerObserver.prototype.next = function(x) {
          var i = this.i++;
          var result = tryCatch(this.selector)(x, i, this.source);
          if (result === errorObj) {
            return this.o.onError(result.e);
          }
          isPromise(result) && (result = observableFromPromise(result));
          (isArrayLike(result) || isIterable(result)) && (result = Observable.from(result));
          this.o.onNext(this._wrapResult(result, x, i));
        };
        InnerObserver.prototype.error = function(e) {
          this.o.onError(e);
        };
        InnerObserver.prototype.onCompleted = function() {
          this.o.onCompleted();
        };
        return FlatMapObservable;
      }(ObservableBase));
      var Enumerable = Rx.internals.Enumerable = function() {};
      function IsDisposedDisposable(state) {
        this._s = state;
        this.isDisposed = false;
      }
      IsDisposedDisposable.prototype.dispose = function() {
        if (!this.isDisposed) {
          this.isDisposed = true;
          this._s.isDisposed = true;
        }
      };
      var ConcatEnumerableObservable = (function(__super__) {
        inherits(ConcatEnumerableObservable, __super__);
        function ConcatEnumerableObservable(sources) {
          this.sources = sources;
          __super__.call(this);
        }
        ConcatEnumerableObservable.prototype.subscribeCore = function(o) {
          var state = {isDisposed: false},
              subscription = new SerialDisposable();
          var cancelable = currentThreadScheduler.scheduleRecursive(this.sources[$iterator$](), function(e, self) {
            if (state.isDisposed) {
              return;
            }
            var currentItem = tryCatch(e.next).call(e);
            if (currentItem === errorObj) {
              return o.onError(currentItem.e);
            }
            if (currentItem.done) {
              return o.onCompleted();
            }
            var currentValue = currentItem.value;
            isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));
            var d = new SingleAssignmentDisposable();
            subscription.setDisposable(d);
            d.setDisposable(currentValue.subscribe(new InnerObserver(o, self, e)));
          });
          return new NAryDisposable([subscription, cancelable, new IsDisposedDisposable(state)]);
        };
        inherits(InnerObserver, AbstractObserver);
        function InnerObserver(o, s, e) {
          this._o = o;
          this._s = s;
          this._e = e;
          AbstractObserver.call(this);
        }
        InnerObserver.prototype.onNext = function(x) {
          this._o.onNext(x);
        };
        InnerObserver.prototype.onError = function(e) {
          this._o.onError(e);
        };
        InnerObserver.prototype.onCompleted = function() {
          this._s(this._e);
        };
        return ConcatEnumerableObservable;
      }(ObservableBase));
      Enumerable.prototype.concat = function() {
        return new ConcatEnumerableObservable(this);
      };
      var CatchErrorObservable = (function(__super__) {
        inherits(CatchErrorObservable, __super__);
        function CatchErrorObservable(sources) {
          this.sources = sources;
          __super__.call(this);
        }
        CatchErrorObservable.prototype.subscribeCore = function(o) {
          var e = this.sources[$iterator$]();
          var state = {isDisposed: false},
              subscription = new SerialDisposable();
          var cancelable = currentThreadScheduler.scheduleRecursive(null, function(lastException, self) {
            if (state.isDisposed) {
              return;
            }
            var currentItem = tryCatch(e.next).call(e);
            if (currentItem === errorObj) {
              return o.onError(currentItem.e);
            }
            if (currentItem.done) {
              return lastException !== null ? o.onError(lastException) : o.onCompleted();
            }
            var currentValue = currentItem.value;
            isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));
            var d = new SingleAssignmentDisposable();
            subscription.setDisposable(d);
            d.setDisposable(currentValue.subscribe(new InnerObserver(o, self)));
          });
          return new NAryDisposable([subscription, cancelable, new IsDisposedDisposable(state)]);
        };
        inherits(InnerObserver, AbstractObserver);
        function InnerObserver(o, recurse) {
          this._o = o;
          this._recurse = recurse;
          AbstractObserver.call(this);
        }
        InnerObserver.prototype.next = function(x) {
          this._o.onNext(x);
        };
        InnerObserver.prototype.error = function(e) {
          this._recurse(e);
        };
        InnerObserver.prototype.completed = function() {
          this._o.onCompleted();
        };
        return CatchErrorObservable;
      }(ObservableBase));
      Enumerable.prototype.catchError = function() {
        return new CatchErrorObservable(this);
      };
      Enumerable.prototype.catchErrorWhen = function(notificationHandler) {
        var sources = this;
        return new AnonymousObservable(function(o) {
          var exceptions = new Subject(),
              notifier = new Subject(),
              handled = notificationHandler(exceptions),
              notificationDisposable = handled.subscribe(notifier);
          var e = sources[$iterator$]();
          var state = {isDisposed: false},
              lastException,
              subscription = new SerialDisposable();
          var cancelable = currentThreadScheduler.scheduleRecursive(null, function(_, self) {
            if (state.isDisposed) {
              return;
            }
            var currentItem = tryCatch(e.next).call(e);
            if (currentItem === errorObj) {
              return o.onError(currentItem.e);
            }
            if (currentItem.done) {
              if (lastException) {
                o.onError(lastException);
              } else {
                o.onCompleted();
              }
              return;
            }
            var currentValue = currentItem.value;
            isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));
            var outer = new SingleAssignmentDisposable();
            var inner = new SingleAssignmentDisposable();
            subscription.setDisposable(new BinaryDisposable(inner, outer));
            outer.setDisposable(currentValue.subscribe(function(x) {
              o.onNext(x);
            }, function(exn) {
              inner.setDisposable(notifier.subscribe(self, function(ex) {
                o.onError(ex);
              }, function() {
                o.onCompleted();
              }));
              exceptions.onNext(exn);
            }, function() {
              o.onCompleted();
            }));
          });
          return new NAryDisposable([notificationDisposable, subscription, cancelable, new IsDisposedDisposable(state)]);
        });
      };
      var RepeatEnumerable = (function(__super__) {
        inherits(RepeatEnumerable, __super__);
        function RepeatEnumerable(v, c) {
          this.v = v;
          this.c = c == null ? -1 : c;
        }
        RepeatEnumerable.prototype[$iterator$] = function() {
          return new RepeatEnumerator(this);
        };
        function RepeatEnumerator(p) {
          this.v = p.v;
          this.l = p.c;
        }
        RepeatEnumerator.prototype.next = function() {
          if (this.l === 0) {
            return doneEnumerator;
          }
          if (this.l > 0) {
            this.l--;
          }
          return {
            done: false,
            value: this.v
          };
        };
        return RepeatEnumerable;
      }(Enumerable));
      var enumerableRepeat = Enumerable.repeat = function(value, repeatCount) {
        return new RepeatEnumerable(value, repeatCount);
      };
      var OfEnumerable = (function(__super__) {
        inherits(OfEnumerable, __super__);
        function OfEnumerable(s, fn, thisArg) {
          this.s = s;
          this.fn = fn ? bindCallback(fn, thisArg, 3) : null;
        }
        OfEnumerable.prototype[$iterator$] = function() {
          return new OfEnumerator(this);
        };
        function OfEnumerator(p) {
          this.i = -1;
          this.s = p.s;
          this.l = this.s.length;
          this.fn = p.fn;
        }
        OfEnumerator.prototype.next = function() {
          return ++this.i < this.l ? {
            done: false,
            value: !this.fn ? this.s[this.i] : this.fn(this.s[this.i], this.i, this.s)
          } : doneEnumerator;
        };
        return OfEnumerable;
      }(Enumerable));
      var enumerableOf = Enumerable.of = function(source, selector, thisArg) {
        return new OfEnumerable(source, selector, thisArg);
      };
      var ObserveOnObservable = (function(__super__) {
        inherits(ObserveOnObservable, __super__);
        function ObserveOnObservable(source, s) {
          this.source = source;
          this._s = s;
          __super__.call(this);
        }
        ObserveOnObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new ObserveOnObserver(this._s, o));
        };
        return ObserveOnObservable;
      }(ObservableBase));
      observableProto.observeOn = function(scheduler) {
        return new ObserveOnObservable(this, scheduler);
      };
      var SubscribeOnObservable = (function(__super__) {
        inherits(SubscribeOnObservable, __super__);
        function SubscribeOnObservable(source, s) {
          this.source = source;
          this._s = s;
          __super__.call(this);
        }
        function scheduleMethod(scheduler, state) {
          var source = state[0],
              d = state[1],
              o = state[2];
          d.setDisposable(new ScheduledDisposable(scheduler, source.subscribe(o)));
        }
        SubscribeOnObservable.prototype.subscribeCore = function(o) {
          var m = new SingleAssignmentDisposable(),
              d = new SerialDisposable();
          d.setDisposable(m);
          m.setDisposable(this._s.schedule([this.source, d, o], scheduleMethod));
          return d;
        };
        return SubscribeOnObservable;
      }(ObservableBase));
      observableProto.subscribeOn = function(scheduler) {
        return new SubscribeOnObservable(this, scheduler);
      };
      var FromPromiseObservable = (function(__super__) {
        inherits(FromPromiseObservable, __super__);
        function FromPromiseObservable(p) {
          this.p = p;
          __super__.call(this);
        }
        FromPromiseObservable.prototype.subscribeCore = function(o) {
          this.p.then(function(data) {
            o.onNext(data);
            o.onCompleted();
          }, function(err) {
            o.onError(err);
          });
          return disposableEmpty;
        };
        return FromPromiseObservable;
      }(ObservableBase));
      var observableFromPromise = Observable.fromPromise = function(promise) {
        return new FromPromiseObservable(promise);
      };
      observableProto.toPromise = function(promiseCtor) {
        promiseCtor || (promiseCtor = Rx.config.Promise);
        if (!promiseCtor) {
          throw new NotSupportedError('Promise type not provided nor in Rx.config.Promise');
        }
        var source = this;
        return new promiseCtor(function(resolve, reject) {
          var value;
          source.subscribe(function(v) {
            value = v;
          }, reject, function() {
            resolve(value);
          });
        });
      };
      var ToArrayObservable = (function(__super__) {
        inherits(ToArrayObservable, __super__);
        function ToArrayObservable(source) {
          this.source = source;
          __super__.call(this);
        }
        ToArrayObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new InnerObserver(o));
        };
        inherits(InnerObserver, AbstractObserver);
        function InnerObserver(o) {
          this.o = o;
          this.a = [];
          AbstractObserver.call(this);
        }
        InnerObserver.prototype.next = function(x) {
          this.a.push(x);
        };
        InnerObserver.prototype.error = function(e) {
          this.o.onError(e);
        };
        InnerObserver.prototype.completed = function() {
          this.o.onNext(this.a);
          this.o.onCompleted();
        };
        return ToArrayObservable;
      }(ObservableBase));
      observableProto.toArray = function() {
        return new ToArrayObservable(this);
      };
      Observable.create = function(subscribe, parent) {
        return new AnonymousObservable(subscribe, parent);
      };
      var Defer = (function(__super__) {
        inherits(Defer, __super__);
        function Defer(factory) {
          this._f = factory;
          __super__.call(this);
        }
        Defer.prototype.subscribeCore = function(o) {
          var result = tryCatch(this._f)();
          if (result === errorObj) {
            return observableThrow(result.e).subscribe(o);
          }
          isPromise(result) && (result = observableFromPromise(result));
          return result.subscribe(o);
        };
        return Defer;
      }(ObservableBase));
      var observableDefer = Observable.defer = function(observableFactory) {
        return new Defer(observableFactory);
      };
      var EmptyObservable = (function(__super__) {
        inherits(EmptyObservable, __super__);
        function EmptyObservable(scheduler) {
          this.scheduler = scheduler;
          __super__.call(this);
        }
        EmptyObservable.prototype.subscribeCore = function(observer) {
          var sink = new EmptySink(observer, this.scheduler);
          return sink.run();
        };
        function EmptySink(observer, scheduler) {
          this.observer = observer;
          this.scheduler = scheduler;
        }
        function scheduleItem(s, state) {
          state.onCompleted();
          return disposableEmpty;
        }
        EmptySink.prototype.run = function() {
          var state = this.observer;
          return this.scheduler === immediateScheduler ? scheduleItem(null, state) : this.scheduler.schedule(state, scheduleItem);
        };
        return EmptyObservable;
      }(ObservableBase));
      var EMPTY_OBSERVABLE = new EmptyObservable(immediateScheduler);
      var observableEmpty = Observable.empty = function(scheduler) {
        isScheduler(scheduler) || (scheduler = immediateScheduler);
        return scheduler === immediateScheduler ? EMPTY_OBSERVABLE : new EmptyObservable(scheduler);
      };
      var FromObservable = (function(__super__) {
        inherits(FromObservable, __super__);
        function FromObservable(iterable, mapper, scheduler) {
          this.iterable = iterable;
          this.mapper = mapper;
          this.scheduler = scheduler;
          __super__.call(this);
        }
        FromObservable.prototype.subscribeCore = function(o) {
          var sink = new FromSink(o, this);
          return sink.run();
        };
        return FromObservable;
      }(ObservableBase));
      var FromSink = (function() {
        function FromSink(o, parent) {
          this.o = o;
          this.parent = parent;
        }
        FromSink.prototype.run = function() {
          var list = Object(this.parent.iterable),
              it = getIterable(list),
              o = this.o,
              mapper = this.parent.mapper;
          function loopRecursive(i, recurse) {
            var next = tryCatch(it.next).call(it);
            if (next === errorObj) {
              return o.onError(next.e);
            }
            if (next.done) {
              return o.onCompleted();
            }
            var result = next.value;
            if (isFunction(mapper)) {
              result = tryCatch(mapper)(result, i);
              if (result === errorObj) {
                return o.onError(result.e);
              }
            }
            o.onNext(result);
            recurse(i + 1);
          }
          return this.parent.scheduler.scheduleRecursive(0, loopRecursive);
        };
        return FromSink;
      }());
      var maxSafeInteger = Math.pow(2, 53) - 1;
      function StringIterable(s) {
        this._s = s;
      }
      StringIterable.prototype[$iterator$] = function() {
        return new StringIterator(this._s);
      };
      function StringIterator(s) {
        this._s = s;
        this._l = s.length;
        this._i = 0;
      }
      StringIterator.prototype[$iterator$] = function() {
        return this;
      };
      StringIterator.prototype.next = function() {
        return this._i < this._l ? {
          done: false,
          value: this._s.charAt(this._i++)
        } : doneEnumerator;
      };
      function ArrayIterable(a) {
        this._a = a;
      }
      ArrayIterable.prototype[$iterator$] = function() {
        return new ArrayIterator(this._a);
      };
      function ArrayIterator(a) {
        this._a = a;
        this._l = toLength(a);
        this._i = 0;
      }
      ArrayIterator.prototype[$iterator$] = function() {
        return this;
      };
      ArrayIterator.prototype.next = function() {
        return this._i < this._l ? {
          done: false,
          value: this._a[this._i++]
        } : doneEnumerator;
      };
      function numberIsFinite(value) {
        return typeof value === 'number' && root.isFinite(value);
      }
      function isNan(n) {
        return n !== n;
      }
      function getIterable(o) {
        var i = o[$iterator$],
            it;
        if (!i && typeof o === 'string') {
          it = new StringIterable(o);
          return it[$iterator$]();
        }
        if (!i && o.length !== undefined) {
          it = new ArrayIterable(o);
          return it[$iterator$]();
        }
        if (!i) {
          throw new TypeError('Object is not iterable');
        }
        return o[$iterator$]();
      }
      function sign(value) {
        var number = +value;
        if (number === 0) {
          return number;
        }
        if (isNaN(number)) {
          return number;
        }
        return number < 0 ? -1 : 1;
      }
      function toLength(o) {
        var len = +o.length;
        if (isNaN(len)) {
          return 0;
        }
        if (len === 0 || !numberIsFinite(len)) {
          return len;
        }
        len = sign(len) * Math.floor(Math.abs(len));
        if (len <= 0) {
          return 0;
        }
        if (len > maxSafeInteger) {
          return maxSafeInteger;
        }
        return len;
      }
      var observableFrom = Observable.from = function(iterable, mapFn, thisArg, scheduler) {
        if (iterable == null) {
          throw new Error('iterable cannot be null.');
        }
        if (mapFn && !isFunction(mapFn)) {
          throw new Error('mapFn when provided must be a function');
        }
        if (mapFn) {
          var mapper = bindCallback(mapFn, thisArg, 2);
        }
        isScheduler(scheduler) || (scheduler = currentThreadScheduler);
        return new FromObservable(iterable, mapper, scheduler);
      };
      var FromArrayObservable = (function(__super__) {
        inherits(FromArrayObservable, __super__);
        function FromArrayObservable(args, scheduler) {
          this.args = args;
          this.scheduler = scheduler;
          __super__.call(this);
        }
        FromArrayObservable.prototype.subscribeCore = function(observer) {
          var sink = new FromArraySink(observer, this);
          return sink.run();
        };
        return FromArrayObservable;
      }(ObservableBase));
      function FromArraySink(observer, parent) {
        this.observer = observer;
        this.parent = parent;
      }
      FromArraySink.prototype.run = function() {
        var observer = this.observer,
            args = this.parent.args,
            len = args.length;
        function loopRecursive(i, recurse) {
          if (i < len) {
            observer.onNext(args[i]);
            recurse(i + 1);
          } else {
            observer.onCompleted();
          }
        }
        return this.parent.scheduler.scheduleRecursive(0, loopRecursive);
      };
      var observableFromArray = Observable.fromArray = function(array, scheduler) {
        isScheduler(scheduler) || (scheduler = currentThreadScheduler);
        return new FromArrayObservable(array, scheduler);
      };
      var GenerateObservable = (function(__super__) {
        inherits(GenerateObservable, __super__);
        function GenerateObservable(state, cndFn, itrFn, resFn, s) {
          this._state = state;
          this._cndFn = cndFn;
          this._itrFn = itrFn;
          this._resFn = resFn;
          this._s = s;
          this._first = true;
          __super__.call(this);
        }
        function scheduleRecursive(self, recurse) {
          if (self._first) {
            self._first = false;
          } else {
            self._state = tryCatch(self._itrFn)(self._state);
            if (self._state === errorObj) {
              return self._o.onError(self._state.e);
            }
          }
          var hasResult = tryCatch(self._cndFn)(self._state);
          if (hasResult === errorObj) {
            return self._o.onError(hasResult.e);
          }
          if (hasResult) {
            var result = tryCatch(self._resFn)(self._state);
            if (result === errorObj) {
              return self._o.onError(result.e);
            }
            self._o.onNext(result);
            recurse(self);
          } else {
            self._o.onCompleted();
          }
        }
        GenerateObservable.prototype.subscribeCore = function(o) {
          this._o = o;
          return this._s.scheduleRecursive(this, scheduleRecursive);
        };
        return GenerateObservable;
      }(ObservableBase));
      Observable.generate = function(initialState, condition, iterate, resultSelector, scheduler) {
        isScheduler(scheduler) || (scheduler = currentThreadScheduler);
        return new GenerateObservable(initialState, condition, iterate, resultSelector, scheduler);
      };
      var NeverObservable = (function(__super__) {
        inherits(NeverObservable, __super__);
        function NeverObservable() {
          __super__.call(this);
        }
        NeverObservable.prototype.subscribeCore = function(observer) {
          return disposableEmpty;
        };
        return NeverObservable;
      }(ObservableBase));
      var NEVER_OBSERVABLE = new NeverObservable();
      var observableNever = Observable.never = function() {
        return NEVER_OBSERVABLE;
      };
      function observableOf(scheduler, array) {
        isScheduler(scheduler) || (scheduler = currentThreadScheduler);
        return new FromArrayObservable(array, scheduler);
      }
      Observable.of = function() {
        var len = arguments.length,
            args = new Array(len);
        for (var i = 0; i < len; i++) {
          args[i] = arguments[i];
        }
        return new FromArrayObservable(args, currentThreadScheduler);
      };
      Observable.ofWithScheduler = function(scheduler) {
        var len = arguments.length,
            args = new Array(len - 1);
        for (var i = 1; i < len; i++) {
          args[i - 1] = arguments[i];
        }
        return new FromArrayObservable(args, scheduler);
      };
      var PairsObservable = (function(__super__) {
        inherits(PairsObservable, __super__);
        function PairsObservable(obj, scheduler) {
          this.obj = obj;
          this.keys = Object.keys(obj);
          this.scheduler = scheduler;
          __super__.call(this);
        }
        PairsObservable.prototype.subscribeCore = function(observer) {
          var sink = new PairsSink(observer, this);
          return sink.run();
        };
        return PairsObservable;
      }(ObservableBase));
      function PairsSink(observer, parent) {
        this.observer = observer;
        this.parent = parent;
      }
      PairsSink.prototype.run = function() {
        var observer = this.observer,
            obj = this.parent.obj,
            keys = this.parent.keys,
            len = keys.length;
        function loopRecursive(i, recurse) {
          if (i < len) {
            var key = keys[i];
            observer.onNext([key, obj[key]]);
            recurse(i + 1);
          } else {
            observer.onCompleted();
          }
        }
        return this.parent.scheduler.scheduleRecursive(0, loopRecursive);
      };
      Observable.pairs = function(obj, scheduler) {
        scheduler || (scheduler = currentThreadScheduler);
        return new PairsObservable(obj, scheduler);
      };
      var RangeObservable = (function(__super__) {
        inherits(RangeObservable, __super__);
        function RangeObservable(start, count, scheduler) {
          this.start = start;
          this.rangeCount = count;
          this.scheduler = scheduler;
          __super__.call(this);
        }
        RangeObservable.prototype.subscribeCore = function(observer) {
          var sink = new RangeSink(observer, this);
          return sink.run();
        };
        return RangeObservable;
      }(ObservableBase));
      var RangeSink = (function() {
        function RangeSink(observer, parent) {
          this.observer = observer;
          this.parent = parent;
        }
        RangeSink.prototype.run = function() {
          var start = this.parent.start,
              count = this.parent.rangeCount,
              observer = this.observer;
          function loopRecursive(i, recurse) {
            if (i < count) {
              observer.onNext(start + i);
              recurse(i + 1);
            } else {
              observer.onCompleted();
            }
          }
          return this.parent.scheduler.scheduleRecursive(0, loopRecursive);
        };
        return RangeSink;
      }());
      Observable.range = function(start, count, scheduler) {
        isScheduler(scheduler) || (scheduler = currentThreadScheduler);
        return new RangeObservable(start, count, scheduler);
      };
      var RepeatObservable = (function(__super__) {
        inherits(RepeatObservable, __super__);
        function RepeatObservable(value, repeatCount, scheduler) {
          this.value = value;
          this.repeatCount = repeatCount == null ? -1 : repeatCount;
          this.scheduler = scheduler;
          __super__.call(this);
        }
        RepeatObservable.prototype.subscribeCore = function(observer) {
          var sink = new RepeatSink(observer, this);
          return sink.run();
        };
        return RepeatObservable;
      }(ObservableBase));
      function RepeatSink(observer, parent) {
        this.observer = observer;
        this.parent = parent;
      }
      RepeatSink.prototype.run = function() {
        var observer = this.observer,
            value = this.parent.value;
        function loopRecursive(i, recurse) {
          if (i === -1 || i > 0) {
            observer.onNext(value);
            i > 0 && i--;
          }
          if (i === 0) {
            return observer.onCompleted();
          }
          recurse(i);
        }
        return this.parent.scheduler.scheduleRecursive(this.parent.repeatCount, loopRecursive);
      };
      Observable.repeat = function(value, repeatCount, scheduler) {
        isScheduler(scheduler) || (scheduler = currentThreadScheduler);
        return new RepeatObservable(value, repeatCount, scheduler);
      };
      var JustObservable = (function(__super__) {
        inherits(JustObservable, __super__);
        function JustObservable(value, scheduler) {
          this.value = value;
          this.scheduler = scheduler;
          __super__.call(this);
        }
        JustObservable.prototype.subscribeCore = function(observer) {
          var sink = new JustSink(observer, this.value, this.scheduler);
          return sink.run();
        };
        function JustSink(observer, value, scheduler) {
          this.observer = observer;
          this.value = value;
          this.scheduler = scheduler;
        }
        function scheduleItem(s, state) {
          var value = state[0],
              observer = state[1];
          observer.onNext(value);
          observer.onCompleted();
          return disposableEmpty;
        }
        JustSink.prototype.run = function() {
          var state = [this.value, this.observer];
          return this.scheduler === immediateScheduler ? scheduleItem(null, state) : this.scheduler.schedule(state, scheduleItem);
        };
        return JustObservable;
      }(ObservableBase));
      var observableReturn = Observable['return'] = Observable.just = function(value, scheduler) {
        isScheduler(scheduler) || (scheduler = immediateScheduler);
        return new JustObservable(value, scheduler);
      };
      var ThrowObservable = (function(__super__) {
        inherits(ThrowObservable, __super__);
        function ThrowObservable(error, scheduler) {
          this.error = error;
          this.scheduler = scheduler;
          __super__.call(this);
        }
        ThrowObservable.prototype.subscribeCore = function(o) {
          var sink = new ThrowSink(o, this);
          return sink.run();
        };
        function ThrowSink(o, p) {
          this.o = o;
          this.p = p;
        }
        function scheduleItem(s, state) {
          var e = state[0],
              o = state[1];
          o.onError(e);
        }
        ThrowSink.prototype.run = function() {
          return this.p.scheduler.schedule([this.p.error, this.o], scheduleItem);
        };
        return ThrowObservable;
      }(ObservableBase));
      var observableThrow = Observable['throw'] = function(error, scheduler) {
        isScheduler(scheduler) || (scheduler = immediateScheduler);
        return new ThrowObservable(error, scheduler);
      };
      var UsingObservable = (function(__super__) {
        inherits(UsingObservable, __super__);
        function UsingObservable(resFn, obsFn) {
          this._resFn = resFn;
          this._obsFn = obsFn;
          __super__.call(this);
        }
        UsingObservable.prototype.subscribeCore = function(o) {
          var disposable = disposableEmpty;
          var resource = tryCatch(this._resFn)();
          if (resource === errorObj) {
            return new BinaryDisposable(observableThrow(resource.e).subscribe(o), disposable);
          }
          resource && (disposable = resource);
          var source = tryCatch(this._obsFn)(resource);
          if (source === errorObj) {
            return new BinaryDisposable(observableThrow(source.e).subscribe(o), disposable);
          }
          return new BinaryDisposable(source.subscribe(o), disposable);
        };
        return UsingObservable;
      }(ObservableBase));
      Observable.using = function(resourceFactory, observableFactory) {
        return new UsingObservable(resourceFactory, observableFactory);
      };
      observableProto.amb = function(rightSource) {
        var leftSource = this;
        return new AnonymousObservable(function(observer) {
          var choice,
              leftChoice = 'L',
              rightChoice = 'R',
              leftSubscription = new SingleAssignmentDisposable(),
              rightSubscription = new SingleAssignmentDisposable();
          isPromise(rightSource) && (rightSource = observableFromPromise(rightSource));
          function choiceL() {
            if (!choice) {
              choice = leftChoice;
              rightSubscription.dispose();
            }
          }
          function choiceR() {
            if (!choice) {
              choice = rightChoice;
              leftSubscription.dispose();
            }
          }
          var leftSubscribe = observerCreate(function(left) {
            choiceL();
            choice === leftChoice && observer.onNext(left);
          }, function(e) {
            choiceL();
            choice === leftChoice && observer.onError(e);
          }, function() {
            choiceL();
            choice === leftChoice && observer.onCompleted();
          });
          var rightSubscribe = observerCreate(function(right) {
            choiceR();
            choice === rightChoice && observer.onNext(right);
          }, function(e) {
            choiceR();
            choice === rightChoice && observer.onError(e);
          }, function() {
            choiceR();
            choice === rightChoice && observer.onCompleted();
          });
          leftSubscription.setDisposable(leftSource.subscribe(leftSubscribe));
          rightSubscription.setDisposable(rightSource.subscribe(rightSubscribe));
          return new BinaryDisposable(leftSubscription, rightSubscription);
        });
      };
      function amb(p, c) {
        return p.amb(c);
      }
      Observable.amb = function() {
        var acc = observableNever(),
            items;
        if (Array.isArray(arguments[0])) {
          items = arguments[0];
        } else {
          var len = arguments.length;
          items = new Array(items);
          for (var i = 0; i < len; i++) {
            items[i] = arguments[i];
          }
        }
        for (var i = 0,
            len = items.length; i < len; i++) {
          acc = amb(acc, items[i]);
        }
        return acc;
      };
      var CatchObservable = (function(__super__) {
        inherits(CatchObservable, __super__);
        function CatchObservable(source, fn) {
          this.source = source;
          this._fn = fn;
          __super__.call(this);
        }
        CatchObservable.prototype.subscribeCore = function(o) {
          var d1 = new SingleAssignmentDisposable(),
              subscription = new SerialDisposable();
          subscription.setDisposable(d1);
          d1.setDisposable(this.source.subscribe(new CatchObserver(o, subscription, this._fn)));
          return subscription;
        };
        return CatchObservable;
      }(ObservableBase));
      var CatchObserver = (function(__super__) {
        inherits(CatchObserver, __super__);
        function CatchObserver(o, s, fn) {
          this._o = o;
          this._s = s;
          this._fn = fn;
          __super__.call(this);
        }
        CatchObserver.prototype.next = function(x) {
          this._o.onNext(x);
        };
        CatchObserver.prototype.completed = function() {
          return this._o.onCompleted();
        };
        CatchObserver.prototype.error = function(e) {
          var result = tryCatch(this._fn)(e);
          if (result === errorObj) {
            return this._o.onError(result.e);
          }
          isPromise(result) && (result = observableFromPromise(result));
          var d = new SingleAssignmentDisposable();
          this._s.setDisposable(d);
          d.setDisposable(result.subscribe(this._o));
        };
        return CatchObserver;
      }(AbstractObserver));
      observableProto['catch'] = function(handlerOrSecond) {
        return isFunction(handlerOrSecond) ? new CatchObservable(this, handlerOrSecond) : observableCatch([this, handlerOrSecond]);
      };
      var observableCatch = Observable['catch'] = function() {
        var items;
        if (Array.isArray(arguments[0])) {
          items = arguments[0];
        } else {
          var len = arguments.length;
          items = new Array(len);
          for (var i = 0; i < len; i++) {
            items[i] = arguments[i];
          }
        }
        return enumerableOf(items).catchError();
      };
      observableProto.combineLatest = function() {
        var len = arguments.length,
            args = new Array(len);
        for (var i = 0; i < len; i++) {
          args[i] = arguments[i];
        }
        if (Array.isArray(args[0])) {
          args[0].unshift(this);
        } else {
          args.unshift(this);
        }
        return combineLatest.apply(this, args);
      };
      function falseFactory() {
        return false;
      }
      function argumentsToArray() {
        var len = arguments.length,
            args = new Array(len);
        for (var i = 0; i < len; i++) {
          args[i] = arguments[i];
        }
        return args;
      }
      var CombineLatestObservable = (function(__super__) {
        inherits(CombineLatestObservable, __super__);
        function CombineLatestObservable(params, cb) {
          var len = params.length;
          this._params = params;
          this._cb = cb;
          this._hv = arrayInitialize(len, falseFactory);
          this._hvAll = false;
          this._done = arrayInitialize(len, falseFactory);
          this._v = new Array(len);
          __super__.call(this);
        }
        CombineLatestObservable.prototype.subscribeCore = function(observer) {
          var len = this._params.length,
              subscriptions = new Array(len);
          for (var i = 0; i < len; i++) {
            var source = this._params[i],
                sad = new SingleAssignmentDisposable();
            subscriptions[i] = sad;
            isPromise(source) && (source = observableFromPromise(source));
            sad.setDisposable(source.subscribe(new CombineLatestObserver(observer, i, this)));
          }
          return new NAryDisposable(subscriptions);
        };
        return CombineLatestObservable;
      }(ObservableBase));
      var CombineLatestObserver = (function(__super__) {
        inherits(CombineLatestObserver, __super__);
        function CombineLatestObserver(o, i, p) {
          this._o = o;
          this._i = i;
          this._p = p;
          __super__.call(this);
        }
        CombineLatestObserver.prototype.next = function(x) {
          this._p._v[this._i] = x;
          this._p._hv[this._i] = true;
          if (this._p._hvAll || (this._p._hvAll = this._p._hv.every(identity))) {
            var res = tryCatch(this._p._cb).apply(null, this._p._v);
            if (res === errorObj) {
              return this._o.onError(res.e);
            }
            this._o.onNext(res);
          } else if (this._p._done.filter(function(x, j) {
            return j !== this._i;
          }, this).every(identity)) {
            this._o.onCompleted();
          }
        };
        CombineLatestObserver.prototype.error = function(e) {
          this._o.onError(e);
        };
        CombineLatestObserver.prototype.completed = function() {
          this._p._done[this._i] = true;
          this._p._done.every(identity) && this._o.onCompleted();
        };
        return CombineLatestObserver;
      }(AbstractObserver));
      var combineLatest = Observable.combineLatest = function() {
        var len = arguments.length,
            args = new Array(len);
        for (var i = 0; i < len; i++) {
          args[i] = arguments[i];
        }
        var resultSelector = isFunction(args[len - 1]) ? args.pop() : argumentsToArray;
        Array.isArray(args[0]) && (args = args[0]);
        return new CombineLatestObservable(args, resultSelector);
      };
      observableProto.concat = function() {
        for (var args = [],
            i = 0,
            len = arguments.length; i < len; i++) {
          args.push(arguments[i]);
        }
        args.unshift(this);
        return observableConcat.apply(null, args);
      };
      var ConcatObservable = (function(__super__) {
        inherits(ConcatObservable, __super__);
        function ConcatObservable(sources) {
          this.sources = sources;
          __super__.call(this);
        }
        ConcatObservable.prototype.subscribeCore = function(o) {
          var sink = new ConcatSink(this.sources, o);
          return sink.run();
        };
        function ConcatSink(sources, o) {
          this.sources = sources;
          this.o = o;
        }
        ConcatSink.prototype.run = function() {
          var isDisposed,
              subscription = new SerialDisposable(),
              sources = this.sources,
              length = sources.length,
              o = this.o;
          var cancelable = immediateScheduler.scheduleRecursive(0, function(i, self) {
            if (isDisposed) {
              return;
            }
            if (i === length) {
              return o.onCompleted();
            }
            var currentValue = sources[i];
            isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));
            var d = new SingleAssignmentDisposable();
            subscription.setDisposable(d);
            d.setDisposable(currentValue.subscribe(function(x) {
              o.onNext(x);
            }, function(e) {
              o.onError(e);
            }, function() {
              self(i + 1);
            }));
          });
          return new CompositeDisposable(subscription, cancelable, disposableCreate(function() {
            isDisposed = true;
          }));
        };
        return ConcatObservable;
      }(ObservableBase));
      var observableConcat = Observable.concat = function() {
        var args;
        if (Array.isArray(arguments[0])) {
          args = arguments[0];
        } else {
          args = new Array(arguments.length);
          for (var i = 0,
              len = arguments.length; i < len; i++) {
            args[i] = arguments[i];
          }
        }
        return new ConcatObservable(args);
      };
      observableProto.concatAll = function() {
        return this.merge(1);
      };
      var MergeObservable = (function(__super__) {
        inherits(MergeObservable, __super__);
        function MergeObservable(source, maxConcurrent) {
          this.source = source;
          this.maxConcurrent = maxConcurrent;
          __super__.call(this);
        }
        MergeObservable.prototype.subscribeCore = function(observer) {
          var g = new CompositeDisposable();
          g.add(this.source.subscribe(new MergeObserver(observer, this.maxConcurrent, g)));
          return g;
        };
        return MergeObservable;
      }(ObservableBase));
      var MergeObserver = (function() {
        function MergeObserver(o, max, g) {
          this.o = o;
          this.max = max;
          this.g = g;
          this.done = false;
          this.q = [];
          this.activeCount = 0;
          this.isStopped = false;
        }
        MergeObserver.prototype.handleSubscribe = function(xs) {
          var sad = new SingleAssignmentDisposable();
          this.g.add(sad);
          isPromise(xs) && (xs = observableFromPromise(xs));
          sad.setDisposable(xs.subscribe(new InnerObserver(this, sad)));
        };
        MergeObserver.prototype.onNext = function(innerSource) {
          if (this.isStopped) {
            return;
          }
          if (this.activeCount < this.max) {
            this.activeCount++;
            this.handleSubscribe(innerSource);
          } else {
            this.q.push(innerSource);
          }
        };
        MergeObserver.prototype.onError = function(e) {
          if (!this.isStopped) {
            this.isStopped = true;
            this.o.onError(e);
          }
        };
        MergeObserver.prototype.onCompleted = function() {
          if (!this.isStopped) {
            this.isStopped = true;
            this.done = true;
            this.activeCount === 0 && this.o.onCompleted();
          }
        };
        MergeObserver.prototype.dispose = function() {
          this.isStopped = true;
        };
        MergeObserver.prototype.fail = function(e) {
          if (!this.isStopped) {
            this.isStopped = true;
            this.o.onError(e);
            return true;
          }
          return false;
        };
        function InnerObserver(parent, sad) {
          this.parent = parent;
          this.sad = sad;
          this.isStopped = false;
        }
        InnerObserver.prototype.onNext = function(x) {
          if (!this.isStopped) {
            this.parent.o.onNext(x);
          }
        };
        InnerObserver.prototype.onError = function(e) {
          if (!this.isStopped) {
            this.isStopped = true;
            this.parent.o.onError(e);
          }
        };
        InnerObserver.prototype.onCompleted = function() {
          if (!this.isStopped) {
            this.isStopped = true;
            var parent = this.parent;
            parent.g.remove(this.sad);
            if (parent.q.length > 0) {
              parent.handleSubscribe(parent.q.shift());
            } else {
              parent.activeCount--;
              parent.done && parent.activeCount === 0 && parent.o.onCompleted();
            }
          }
        };
        InnerObserver.prototype.dispose = function() {
          this.isStopped = true;
        };
        InnerObserver.prototype.fail = function(e) {
          if (!this.isStopped) {
            this.isStopped = true;
            this.parent.o.onError(e);
            return true;
          }
          return false;
        };
        return MergeObserver;
      }());
      observableProto.merge = function(maxConcurrentOrOther) {
        return typeof maxConcurrentOrOther !== 'number' ? observableMerge(this, maxConcurrentOrOther) : new MergeObservable(this, maxConcurrentOrOther);
      };
      var observableMerge = Observable.merge = function() {
        var scheduler,
            sources = [],
            i,
            len = arguments.length;
        if (!arguments[0]) {
          scheduler = immediateScheduler;
          for (i = 1; i < len; i++) {
            sources.push(arguments[i]);
          }
        } else if (isScheduler(arguments[0])) {
          scheduler = arguments[0];
          for (i = 1; i < len; i++) {
            sources.push(arguments[i]);
          }
        } else {
          scheduler = immediateScheduler;
          for (i = 0; i < len; i++) {
            sources.push(arguments[i]);
          }
        }
        if (Array.isArray(sources[0])) {
          sources = sources[0];
        }
        return observableOf(scheduler, sources).mergeAll();
      };
      var CompositeError = Rx.CompositeError = function(errors) {
        this.name = "NotImplementedError";
        this.innerErrors = errors;
        this.message = 'This contains multiple errors. Check the innerErrors';
        Error.call(this);
      };
      CompositeError.prototype = Error.prototype;
      Observable.mergeDelayError = function() {
        var args;
        if (Array.isArray(arguments[0])) {
          args = arguments[0];
        } else {
          var len = arguments.length;
          args = new Array(len);
          for (var i = 0; i < len; i++) {
            args[i] = arguments[i];
          }
        }
        var source = observableOf(null, args);
        return new AnonymousObservable(function(o) {
          var group = new CompositeDisposable(),
              m = new SingleAssignmentDisposable(),
              isStopped = false,
              errors = [];
          function setCompletion() {
            if (errors.length === 0) {
              o.onCompleted();
            } else if (errors.length === 1) {
              o.onError(errors[0]);
            } else {
              o.onError(new CompositeError(errors));
            }
          }
          group.add(m);
          m.setDisposable(source.subscribe(function(innerSource) {
            var innerSubscription = new SingleAssignmentDisposable();
            group.add(innerSubscription);
            isPromise(innerSource) && (innerSource = observableFromPromise(innerSource));
            innerSubscription.setDisposable(innerSource.subscribe(function(x) {
              o.onNext(x);
            }, function(e) {
              errors.push(e);
              group.remove(innerSubscription);
              isStopped && group.length === 1 && setCompletion();
            }, function() {
              group.remove(innerSubscription);
              isStopped && group.length === 1 && setCompletion();
            }));
          }, function(e) {
            errors.push(e);
            isStopped = true;
            group.length === 1 && setCompletion();
          }, function() {
            isStopped = true;
            group.length === 1 && setCompletion();
          }));
          return group;
        });
      };
      var MergeAllObservable = (function(__super__) {
        inherits(MergeAllObservable, __super__);
        function MergeAllObservable(source) {
          this.source = source;
          __super__.call(this);
        }
        MergeAllObservable.prototype.subscribeCore = function(observer) {
          var g = new CompositeDisposable(),
              m = new SingleAssignmentDisposable();
          g.add(m);
          m.setDisposable(this.source.subscribe(new MergeAllObserver(observer, g)));
          return g;
        };
        function MergeAllObserver(o, g) {
          this.o = o;
          this.g = g;
          this.isStopped = false;
          this.done = false;
        }
        MergeAllObserver.prototype.onNext = function(innerSource) {
          if (this.isStopped) {
            return;
          }
          var sad = new SingleAssignmentDisposable();
          this.g.add(sad);
          isPromise(innerSource) && (innerSource = observableFromPromise(innerSource));
          sad.setDisposable(innerSource.subscribe(new InnerObserver(this, sad)));
        };
        MergeAllObserver.prototype.onError = function(e) {
          if (!this.isStopped) {
            this.isStopped = true;
            this.o.onError(e);
          }
        };
        MergeAllObserver.prototype.onCompleted = function() {
          if (!this.isStopped) {
            this.isStopped = true;
            this.done = true;
            this.g.length === 1 && this.o.onCompleted();
          }
        };
        MergeAllObserver.prototype.dispose = function() {
          this.isStopped = true;
        };
        MergeAllObserver.prototype.fail = function(e) {
          if (!this.isStopped) {
            this.isStopped = true;
            this.o.onError(e);
            return true;
          }
          return false;
        };
        function InnerObserver(parent, sad) {
          this.parent = parent;
          this.sad = sad;
          this.isStopped = false;
        }
        InnerObserver.prototype.onNext = function(x) {
          if (!this.isStopped) {
            this.parent.o.onNext(x);
          }
        };
        InnerObserver.prototype.onError = function(e) {
          if (!this.isStopped) {
            this.isStopped = true;
            this.parent.o.onError(e);
          }
        };
        InnerObserver.prototype.onCompleted = function() {
          if (!this.isStopped) {
            var parent = this.parent;
            this.isStopped = true;
            parent.g.remove(this.sad);
            parent.done && parent.g.length === 1 && parent.o.onCompleted();
          }
        };
        InnerObserver.prototype.dispose = function() {
          this.isStopped = true;
        };
        InnerObserver.prototype.fail = function(e) {
          if (!this.isStopped) {
            this.isStopped = true;
            this.parent.o.onError(e);
            return true;
          }
          return false;
        };
        return MergeAllObservable;
      }(ObservableBase));
      observableProto.mergeAll = function() {
        return new MergeAllObservable(this);
      };
      observableProto.onErrorResumeNext = function(second) {
        if (!second) {
          throw new Error('Second observable is required');
        }
        return onErrorResumeNext([this, second]);
      };
      var onErrorResumeNext = Observable.onErrorResumeNext = function() {
        var sources = [];
        if (Array.isArray(arguments[0])) {
          sources = arguments[0];
        } else {
          for (var i = 0,
              len = arguments.length; i < len; i++) {
            sources.push(arguments[i]);
          }
        }
        return new AnonymousObservable(function(observer) {
          var pos = 0,
              subscription = new SerialDisposable(),
              cancelable = immediateScheduler.scheduleRecursive(null, function(_, self) {
                var current,
                    d;
                if (pos < sources.length) {
                  current = sources[pos++];
                  isPromise(current) && (current = observableFromPromise(current));
                  d = new SingleAssignmentDisposable();
                  subscription.setDisposable(d);
                  d.setDisposable(current.subscribe(observer.onNext.bind(observer), self, self));
                } else {
                  observer.onCompleted();
                }
              });
          return new BinaryDisposable(subscription, cancelable);
        });
      };
      var SkipUntilObservable = (function(__super__) {
        inherits(SkipUntilObservable, __super__);
        function SkipUntilObservable(source, other) {
          this._s = source;
          this._o = isPromise(other) ? observableFromPromise(other) : other;
          this._open = false;
          __super__.call(this);
        }
        SkipUntilObservable.prototype.subscribeCore = function(o) {
          var leftSubscription = new SingleAssignmentDisposable();
          leftSubscription.setDisposable(this._s.subscribe(new SkipUntilSourceObserver(o, this)));
          isPromise(this._o) && (this._o = observableFromPromise(this._o));
          var rightSubscription = new SingleAssignmentDisposable();
          rightSubscription.setDisposable(this._o.subscribe(new SkipUntilOtherObserver(o, this, rightSubscription)));
          return new BinaryDisposable(leftSubscription, rightSubscription);
        };
        return SkipUntilObservable;
      }(ObservableBase));
      var SkipUntilSourceObserver = (function(__super__) {
        inherits(SkipUntilSourceObserver, __super__);
        function SkipUntilSourceObserver(o, p) {
          this._o = o;
          this._p = p;
          __super__.call(this);
        }
        SkipUntilSourceObserver.prototype.next = function(x) {
          this._p._open && this._o.onNext(x);
        };
        SkipUntilSourceObserver.prototype.error = function(err) {
          this._o.onError(err);
        };
        SkipUntilSourceObserver.prototype.onCompleted = function() {
          this._p._open && this._o.onCompleted();
        };
        return SkipUntilSourceObserver;
      }(AbstractObserver));
      var SkipUntilOtherObserver = (function(__super__) {
        inherits(SkipUntilOtherObserver, __super__);
        function SkipUntilOtherObserver(o, p, r) {
          this._o = o;
          this._p = p;
          this._r = r;
          __super__.call(this);
        }
        SkipUntilOtherObserver.prototype.next = function() {
          this._p._open = true;
          this._r.dispose();
        };
        SkipUntilOtherObserver.prototype.error = function(err) {
          this._o.onError(err);
        };
        SkipUntilOtherObserver.prototype.onCompleted = function() {
          this._r.dispose();
        };
        return SkipUntilOtherObserver;
      }(AbstractObserver));
      observableProto.skipUntil = function(other) {
        return new SkipUntilObservable(this, other);
      };
      var SwitchObservable = (function(__super__) {
        inherits(SwitchObservable, __super__);
        function SwitchObservable(source) {
          this.source = source;
          __super__.call(this);
        }
        SwitchObservable.prototype.subscribeCore = function(o) {
          var inner = new SerialDisposable(),
              s = this.source.subscribe(new SwitchObserver(o, inner));
          return new BinaryDisposable(s, inner);
        };
        inherits(SwitchObserver, AbstractObserver);
        function SwitchObserver(o, inner) {
          this.o = o;
          this.inner = inner;
          this.stopped = false;
          this.latest = 0;
          this.hasLatest = false;
          AbstractObserver.call(this);
        }
        SwitchObserver.prototype.next = function(innerSource) {
          var d = new SingleAssignmentDisposable(),
              id = ++this.latest;
          this.hasLatest = true;
          this.inner.setDisposable(d);
          isPromise(innerSource) && (innerSource = observableFromPromise(innerSource));
          d.setDisposable(innerSource.subscribe(new InnerObserver(this, id)));
        };
        SwitchObserver.prototype.error = function(e) {
          this.o.onError(e);
        };
        SwitchObserver.prototype.completed = function() {
          this.stopped = true;
          !this.hasLatest && this.o.onCompleted();
        };
        inherits(InnerObserver, AbstractObserver);
        function InnerObserver(parent, id) {
          this.parent = parent;
          this.id = id;
          AbstractObserver.call(this);
        }
        InnerObserver.prototype.next = function(x) {
          this.parent.latest === this.id && this.parent.o.onNext(x);
        };
        InnerObserver.prototype.error = function(e) {
          this.parent.latest === this.id && this.parent.o.onError(e);
        };
        InnerObserver.prototype.completed = function() {
          if (this.parent.latest === this.id) {
            this.parent.hasLatest = false;
            this.parent.isStopped && this.parent.o.onCompleted();
          }
        };
        return SwitchObservable;
      }(ObservableBase));
      observableProto['switch'] = observableProto.switchLatest = function() {
        return new SwitchObservable(this);
      };
      var TakeUntilObservable = (function(__super__) {
        inherits(TakeUntilObservable, __super__);
        function TakeUntilObservable(source, other) {
          this.source = source;
          this.other = isPromise(other) ? observableFromPromise(other) : other;
          __super__.call(this);
        }
        TakeUntilObservable.prototype.subscribeCore = function(o) {
          return new BinaryDisposable(this.source.subscribe(o), this.other.subscribe(new TakeUntilObserver(o)));
        };
        return TakeUntilObservable;
      }(ObservableBase));
      var TakeUntilObserver = (function(__super__) {
        inherits(TakeUntilObserver, __super__);
        function TakeUntilObserver(o) {
          this._o = o;
          __super__.call(this);
        }
        TakeUntilObserver.prototype.next = function() {
          this._o.onCompleted();
        };
        TakeUntilObserver.prototype.error = function(err) {
          this._o.onError(err);
        };
        TakeUntilObserver.prototype.onCompleted = noop;
        return TakeUntilObserver;
      }(AbstractObserver));
      observableProto.takeUntil = function(other) {
        return new TakeUntilObservable(this, other);
      };
      function falseFactory() {
        return false;
      }
      function argumentsToArray() {
        var len = arguments.length,
            args = new Array(len);
        for (var i = 0; i < len; i++) {
          args[i] = arguments[i];
        }
        return args;
      }
      var WithLatestFromObservable = (function(__super__) {
        inherits(WithLatestFromObservable, __super__);
        function WithLatestFromObservable(source, sources, resultSelector) {
          var len = sources.length;
          this._s = source;
          this._ss = sources;
          this._cb = resultSelector;
          this._hv = arrayInitialize(len, falseFactory);
          this._hvAll = false;
          this._v = new Array(len);
          __super__.call(this);
        }
        WithLatestFromObservable.prototype.subscribeCore = function(o) {
          var n = this._ss.length,
              subscriptions = new Array(n + 1);
          for (var i = 0; i < n; i++) {
            var other = this._ss[i],
                sad = new SingleAssignmentDisposable();
            isPromise(other) && (other = observableFromPromise(other));
            sad.setDisposable(other.subscribe(new WithLatestFromOtherObserver(o, i, this)));
            subscriptions[i] = sad;
          }
          var sad = new SingleAssignmentDisposable();
          sad.setDisposable(this._s.subscribe(new WithLatestFromSourceObserver(o, this)));
          subscriptions[n] = sad;
          return new NAryDisposable(subscriptions);
        };
        return WithLatestFromObservable;
      }(ObservableBase));
      var WithLatestFromOtherObserver = (function(__super__) {
        inherits(WithLatestFromOtherObserver, __super__);
        function WithLatestFromOtherObserver(o, i, p) {
          this._o = o;
          this._i = i;
          this._p = p;
          __super__.call(this);
        }
        WithLatestFromOtherObserver.prototype.next = function(x) {
          this._p._v[this._i] = x;
          this._p._hv[this._i] = true;
          this._p._hvAll = this._p._hv.every(identity);
        };
        WithLatestFromOtherObserver.prototype.error = function(e) {
          this._o.onError(e);
        };
        WithLatestFromOtherObserver.prototype.completed = noop;
        return WithLatestFromOtherObserver;
      }(AbstractObserver));
      var WithLatestFromSourceObserver = (function(__super__) {
        inherits(WithLatestFromSourceObserver, __super__);
        function WithLatestFromSourceObserver(o, p) {
          this._o = o;
          this._p = p;
          __super__.call(this);
        }
        WithLatestFromSourceObserver.prototype.next = function(x) {
          var allValues = [x].concat(this._p._v);
          if (!this._p._hvAll) {
            return;
          }
          var res = tryCatch(this._p._cb).apply(null, allValues);
          if (res === errorObj) {
            return this._o.onError(res.e);
          }
          this._o.onNext(res);
        };
        WithLatestFromSourceObserver.prototype.error = function(e) {
          this._o.onError(e);
        };
        WithLatestFromSourceObserver.prototype.completed = function() {
          this._o.onCompleted();
        };
        return WithLatestFromSourceObserver;
      }(AbstractObserver));
      observableProto.withLatestFrom = function() {
        if (arguments.length === 0) {
          throw new Error('invalid arguments');
        }
        var len = arguments.length,
            args = new Array(len);
        for (var i = 0; i < len; i++) {
          args[i] = arguments[i];
        }
        var resultSelector = isFunction(args[len - 1]) ? args.pop() : argumentsToArray;
        Array.isArray(args[0]) && (args = args[0]);
        return new WithLatestFromObservable(this, args, resultSelector);
      };
      function falseFactory() {
        return false;
      }
      function emptyArrayFactory() {
        return [];
      }
      var ZipObservable = (function(__super__) {
        inherits(ZipObservable, __super__);
        function ZipObservable(sources, resultSelector) {
          var len = sources.length;
          this._s = sources;
          this._cb = resultSelector;
          this._done = arrayInitialize(len, falseFactory);
          this._q = arrayInitialize(len, emptyArrayFactory);
          __super__.call(this);
        }
        ZipObservable.prototype.subscribeCore = function(observer) {
          var n = this._s.length,
              subscriptions = new Array(n);
          for (var i = 0; i < n; i++) {
            var source = this._s[i],
                sad = new SingleAssignmentDisposable();
            subscriptions[i] = sad;
            isPromise(source) && (source = observableFromPromise(source));
            sad.setDisposable(source.subscribe(new ZipObserver(observer, i, this)));
          }
          return new NAryDisposable(subscriptions);
        };
        return ZipObservable;
      }(ObservableBase));
      var ZipObserver = (function(__super__) {
        inherits(ZipObserver, __super__);
        function ZipObserver(o, i, p) {
          this._o = o;
          this._i = i;
          this._p = p;
          __super__.call(this);
        }
        ZipObserver.prototype.next = function(x) {
          this._p._q[this._i].push(x);
          if (this._p._q.every(function(x) {
            return x.length > 0;
          })) {
            var queuedValues = this._p._q.map(function(x) {
              return x.shift();
            });
            var res = tryCatch(this._p._cb).apply(null, queuedValues);
            if (res === errorObj) {
              return this._o.onError(res.e);
            }
            this._o.onNext(res);
          } else if (this._p._done.filter(function(x, j) {
            return j !== this._i;
          }, this).every(identity)) {
            this._o.onCompleted();
          }
        };
        ZipObserver.prototype.error = function(e) {
          this._o.onError(e);
        };
        ZipObserver.prototype.completed = function() {
          this._p._done[this._i] = true;
          this._p._done.every(identity) && this._o.onCompleted();
        };
        return ZipObserver;
      }(AbstractObserver));
      observableProto.zip = function() {
        if (arguments.length === 0) {
          throw new Error('invalid arguments');
        }
        var len = arguments.length,
            args = new Array(len);
        for (var i = 0; i < len; i++) {
          args[i] = arguments[i];
        }
        var resultSelector = isFunction(args[len - 1]) ? args.pop() : argumentsToArray;
        Array.isArray(args[0]) && (args = args[0]);
        var parent = this;
        args.unshift(parent);
        return new ZipObservable(args, resultSelector);
      };
      Observable.zip = function() {
        var len = arguments.length,
            args = new Array(len);
        for (var i = 0; i < len; i++) {
          args[i] = arguments[i];
        }
        if (Array.isArray(args[0])) {
          args = isFunction(args[1]) ? args[0].concat(args[1]) : args[0];
        }
        var first = args.shift();
        return first.zip.apply(first, args);
      };
      function falseFactory() {
        return false;
      }
      function emptyArrayFactory() {
        return [];
      }
      function argumentsToArray() {
        var len = arguments.length,
            args = new Array(len);
        for (var i = 0; i < len; i++) {
          args[i] = arguments[i];
        }
        return args;
      }
      observableProto.zipIterable = function() {
        if (arguments.length === 0) {
          throw new Error('invalid arguments');
        }
        var len = arguments.length,
            args = new Array(len);
        for (var i = 0; i < len; i++) {
          args[i] = arguments[i];
        }
        var resultSelector = isFunction(args[len - 1]) ? args.pop() : argumentsToArray;
        var parent = this;
        args.unshift(parent);
        return new AnonymousObservable(function(o) {
          var n = args.length,
              queues = arrayInitialize(n, emptyArrayFactory),
              isDone = arrayInitialize(n, falseFactory);
          var subscriptions = new Array(n);
          for (var idx = 0; idx < n; idx++) {
            (function(i) {
              var source = args[i],
                  sad = new SingleAssignmentDisposable();
              (isArrayLike(source) || isIterable(source)) && (source = observableFrom(source));
              sad.setDisposable(source.subscribe(function(x) {
                queues[i].push(x);
                if (queues.every(function(x) {
                  return x.length > 0;
                })) {
                  var queuedValues = queues.map(function(x) {
                    return x.shift();
                  }),
                      res = tryCatch(resultSelector).apply(parent, queuedValues);
                  if (res === errorObj) {
                    return o.onError(res.e);
                  }
                  o.onNext(res);
                } else if (isDone.filter(function(x, j) {
                  return j !== i;
                }).every(identity)) {
                  o.onCompleted();
                }
              }, function(e) {
                o.onError(e);
              }, function() {
                isDone[i] = true;
                isDone.every(identity) && o.onCompleted();
              }));
              subscriptions[i] = sad;
            })(idx);
          }
          return new CompositeDisposable(subscriptions);
        }, parent);
      };
      function asObservable(source) {
        return function subscribe(o) {
          return source.subscribe(o);
        };
      }
      observableProto.asObservable = function() {
        return new AnonymousObservable(asObservable(this), this);
      };
      function toArray(x) {
        return x.toArray();
      }
      function notEmpty(x) {
        return x.length > 0;
      }
      observableProto.bufferWithCount = function(count, skip) {
        typeof skip !== 'number' && (skip = count);
        return this.windowWithCount(count, skip).flatMap(toArray).filter(notEmpty);
      };
      var DematerializeObservable = (function(__super__) {
        inherits(DematerializeObservable, __super__);
        function DematerializeObservable(source) {
          this.source = source;
          __super__.call(this);
        }
        DematerializeObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new DematerializeObserver(o));
        };
        return DematerializeObservable;
      }(ObservableBase));
      var DematerializeObserver = (function(__super__) {
        inherits(DematerializeObserver, __super__);
        function DematerializeObserver(o) {
          this._o = o;
          __super__.call(this);
        }
        DematerializeObserver.prototype.next = function(x) {
          x.accept(this._o);
        };
        DematerializeObserver.prototype.error = function(e) {
          this._o.onError(e);
        };
        DematerializeObserver.prototype.completed = function() {
          this._o.onCompleted();
        };
        return DematerializeObserver;
      }(AbstractObserver));
      observableProto.dematerialize = function() {
        return new DematerializeObservable(this);
      };
      var DistinctUntilChangedObservable = (function(__super__) {
        inherits(DistinctUntilChangedObservable, __super__);
        function DistinctUntilChangedObservable(source, keyFn, comparer) {
          this.source = source;
          this.keyFn = keyFn;
          this.comparer = comparer;
          __super__.call(this);
        }
        DistinctUntilChangedObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new DistinctUntilChangedObserver(o, this.keyFn, this.comparer));
        };
        return DistinctUntilChangedObservable;
      }(ObservableBase));
      var DistinctUntilChangedObserver = (function(__super__) {
        inherits(DistinctUntilChangedObserver, __super__);
        function DistinctUntilChangedObserver(o, keyFn, comparer) {
          this.o = o;
          this.keyFn = keyFn;
          this.comparer = comparer;
          this.hasCurrentKey = false;
          this.currentKey = null;
          __super__.call(this);
        }
        DistinctUntilChangedObserver.prototype.next = function(x) {
          var key = x,
              comparerEquals;
          if (isFunction(this.keyFn)) {
            key = tryCatch(this.keyFn)(x);
            if (key === errorObj) {
              return this.o.onError(key.e);
            }
          }
          if (this.hasCurrentKey) {
            comparerEquals = tryCatch(this.comparer)(this.currentKey, key);
            if (comparerEquals === errorObj) {
              return this.o.onError(comparerEquals.e);
            }
          }
          if (!this.hasCurrentKey || !comparerEquals) {
            this.hasCurrentKey = true;
            this.currentKey = key;
            this.o.onNext(x);
          }
        };
        DistinctUntilChangedObserver.prototype.error = function(e) {
          this.o.onError(e);
        };
        DistinctUntilChangedObserver.prototype.completed = function() {
          this.o.onCompleted();
        };
        return DistinctUntilChangedObserver;
      }(AbstractObserver));
      observableProto.distinctUntilChanged = function(keyFn, comparer) {
        comparer || (comparer = defaultComparer);
        return new DistinctUntilChangedObservable(this, keyFn, comparer);
      };
      var TapObservable = (function(__super__) {
        inherits(TapObservable, __super__);
        function TapObservable(source, observerOrOnNext, onError, onCompleted) {
          this.source = source;
          this._oN = observerOrOnNext;
          this._oE = onError;
          this._oC = onCompleted;
          __super__.call(this);
        }
        TapObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new InnerObserver(o, this));
        };
        inherits(InnerObserver, AbstractObserver);
        function InnerObserver(o, p) {
          this.o = o;
          this.t = !p._oN || isFunction(p._oN) ? observerCreate(p._oN || noop, p._oE || noop, p._oC || noop) : p._oN;
          this.isStopped = false;
          AbstractObserver.call(this);
        }
        InnerObserver.prototype.next = function(x) {
          var res = tryCatch(this.t.onNext).call(this.t, x);
          if (res === errorObj) {
            this.o.onError(res.e);
          }
          this.o.onNext(x);
        };
        InnerObserver.prototype.error = function(err) {
          var res = tryCatch(this.t.onError).call(this.t, err);
          if (res === errorObj) {
            return this.o.onError(res.e);
          }
          this.o.onError(err);
        };
        InnerObserver.prototype.completed = function() {
          var res = tryCatch(this.t.onCompleted).call(this.t);
          if (res === errorObj) {
            return this.o.onError(res.e);
          }
          this.o.onCompleted();
        };
        return TapObservable;
      }(ObservableBase));
      observableProto['do'] = observableProto.tap = observableProto.doAction = function(observerOrOnNext, onError, onCompleted) {
        return new TapObservable(this, observerOrOnNext, onError, onCompleted);
      };
      observableProto.doOnNext = observableProto.tapOnNext = function(onNext, thisArg) {
        return this.tap(typeof thisArg !== 'undefined' ? function(x) {
          onNext.call(thisArg, x);
        } : onNext);
      };
      observableProto.doOnError = observableProto.tapOnError = function(onError, thisArg) {
        return this.tap(noop, typeof thisArg !== 'undefined' ? function(e) {
          onError.call(thisArg, e);
        } : onError);
      };
      observableProto.doOnCompleted = observableProto.tapOnCompleted = function(onCompleted, thisArg) {
        return this.tap(noop, null, typeof thisArg !== 'undefined' ? function() {
          onCompleted.call(thisArg);
        } : onCompleted);
      };
      observableProto['finally'] = function(action) {
        var source = this;
        return new AnonymousObservable(function(observer) {
          var subscription = tryCatch(source.subscribe).call(source, observer);
          if (subscription === errorObj) {
            action();
            return thrower(subscription.e);
          }
          return disposableCreate(function() {
            var r = tryCatch(subscription.dispose).call(subscription);
            action();
            r === errorObj && thrower(r.e);
          });
        }, this);
      };
      var IgnoreElementsObservable = (function(__super__) {
        inherits(IgnoreElementsObservable, __super__);
        function IgnoreElementsObservable(source) {
          this.source = source;
          __super__.call(this);
        }
        IgnoreElementsObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new InnerObserver(o));
        };
        function InnerObserver(o) {
          this.o = o;
          this.isStopped = false;
        }
        InnerObserver.prototype.onNext = noop;
        InnerObserver.prototype.onError = function(err) {
          if (!this.isStopped) {
            this.isStopped = true;
            this.o.onError(err);
          }
        };
        InnerObserver.prototype.onCompleted = function() {
          if (!this.isStopped) {
            this.isStopped = true;
            this.o.onCompleted();
          }
        };
        InnerObserver.prototype.dispose = function() {
          this.isStopped = true;
        };
        InnerObserver.prototype.fail = function(e) {
          if (!this.isStopped) {
            this.isStopped = true;
            this.observer.onError(e);
            return true;
          }
          return false;
        };
        return IgnoreElementsObservable;
      }(ObservableBase));
      observableProto.ignoreElements = function() {
        return new IgnoreElementsObservable(this);
      };
      var MaterializeObservable = (function(__super__) {
        inherits(MaterializeObservable, __super__);
        function MaterializeObservable(source, fn) {
          this.source = source;
          __super__.call(this);
        }
        MaterializeObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new MaterializeObserver(o));
        };
        return MaterializeObservable;
      }(ObservableBase));
      var MaterializeObserver = (function(__super__) {
        inherits(MaterializeObserver, __super__);
        function MaterializeObserver(o) {
          this._o = o;
          __super__.call(this);
        }
        MaterializeObserver.prototype.next = function(x) {
          this._o.onNext(notificationCreateOnNext(x));
        };
        MaterializeObserver.prototype.error = function(e) {
          this._o.onNext(notificationCreateOnError(e));
          this._o.onCompleted();
        };
        MaterializeObserver.prototype.completed = function() {
          this._o.onNext(notificationCreateOnCompleted());
          this._o.onCompleted();
        };
        return MaterializeObserver;
      }(AbstractObserver));
      observableProto.materialize = function() {
        return new MaterializeObservable(this);
      };
      observableProto.repeat = function(repeatCount) {
        return enumerableRepeat(this, repeatCount).concat();
      };
      observableProto.retry = function(retryCount) {
        return enumerableRepeat(this, retryCount).catchError();
      };
      observableProto.retryWhen = function(notifier) {
        return enumerableRepeat(this).catchErrorWhen(notifier);
      };
      var ScanObservable = (function(__super__) {
        inherits(ScanObservable, __super__);
        function ScanObservable(source, accumulator, hasSeed, seed) {
          this.source = source;
          this.accumulator = accumulator;
          this.hasSeed = hasSeed;
          this.seed = seed;
          __super__.call(this);
        }
        ScanObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new ScanObserver(o, this));
        };
        return ScanObservable;
      }(ObservableBase));
      var ScanObserver = (function(__super__) {
        inherits(ScanObserver, __super__);
        function ScanObserver(o, parent) {
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
        ScanObserver.prototype.next = function(x) {
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
          this._o.onNext(this._a);
          this._i++;
        };
        ScanObserver.prototype.error = function(e) {
          this._o.onError(e);
        };
        ScanObserver.prototype.completed = function() {
          !this._hv && this._hs && this._o.onNext(this._s);
          this._o.onCompleted();
        };
        return ScanObserver;
      }(AbstractObserver));
      observableProto.scan = function() {
        var hasSeed = false,
            seed,
            accumulator = arguments[0];
        if (arguments.length === 2) {
          hasSeed = true;
          seed = arguments[1];
        }
        return new ScanObservable(this, accumulator, hasSeed, seed);
      };
      var SkipLastObservable = (function(__super__) {
        inherits(SkipLastObservable, __super__);
        function SkipLastObservable(source, c) {
          this.source = source;
          this._c = c;
          __super__.call(this);
        }
        SkipLastObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new SkipLastObserver(o, this._c));
        };
        return SkipLastObservable;
      }(ObservableBase));
      var SkipLastObserver = (function(__super__) {
        inherits(SkipLastObserver, __super__);
        function SkipLastObserver(o, c) {
          this._o = o;
          this._c = c;
          this._q = [];
          __super__.call(this);
        }
        SkipLastObserver.prototype.next = function(x) {
          this._q.push(x);
          this._q.length > this._c && this._o.onNext(this._q.shift());
        };
        SkipLastObserver.prototype.error = function(e) {
          this._o.onError(e);
        };
        SkipLastObserver.prototype.completed = function() {
          this._o.onCompleted();
        };
        return SkipLastObserver;
      }(AbstractObserver));
      observableProto.skipLast = function(count) {
        if (count < 0) {
          throw new ArgumentOutOfRangeError();
        }
        return new SkipLastObservable(this, count);
      };
      observableProto.startWith = function() {
        var values,
            scheduler,
            start = 0;
        if (!!arguments.length && isScheduler(arguments[0])) {
          scheduler = arguments[0];
          start = 1;
        } else {
          scheduler = immediateScheduler;
        }
        for (var args = [],
            i = start,
            len = arguments.length; i < len; i++) {
          args.push(arguments[i]);
        }
        return enumerableOf([observableFromArray(args, scheduler), this]).concat();
      };
      var TakeLastObserver = (function(__super__) {
        inherits(TakeLastObserver, __super__);
        function TakeLastObserver(o, c) {
          this._o = o;
          this._c = c;
          this._q = [];
          __super__.call(this);
        }
        TakeLastObserver.prototype.next = function(x) {
          this._q.push(x);
          this._q.length > this._c && this._q.shift();
        };
        TakeLastObserver.prototype.error = function(e) {
          this._o.onError(e);
        };
        TakeLastObserver.prototype.completed = function() {
          while (this._q.length > 0) {
            this._o.onNext(this._q.shift());
          }
          this._o.onCompleted();
        };
        return TakeLastObserver;
      }(AbstractObserver));
      observableProto.takeLast = function(count) {
        if (count < 0) {
          throw new ArgumentOutOfRangeError();
        }
        var source = this;
        return new AnonymousObservable(function(o) {
          return source.subscribe(new TakeLastObserver(o, count));
        }, source);
      };
      var TakeLastBufferObserver = (function(__super__) {
        inherits(TakeLastBufferObserver, __super__);
        function TakeLastBufferObserver(o, c) {
          this._o = o;
          this._c = c;
          this._q = [];
          __super__.call(this);
        }
        TakeLastBufferObserver.prototype.next = function(x) {
          this._q.push(x);
          this._q.length > this._c && this._q.shift();
        };
        TakeLastBufferObserver.prototype.error = function(e) {
          this._o.onError(e);
        };
        TakeLastBufferObserver.prototype.completed = function() {
          this._o.onNext(this._q);
          this._o.onCompleted();
        };
        return TakeLastBufferObserver;
      }(AbstractObserver));
      observableProto.takeLastBuffer = function(count) {
        if (count < 0) {
          throw new ArgumentOutOfRangeError();
        }
        var source = this;
        return new AnonymousObservable(function(o) {
          return source.subscribe(new TakeLastBufferObserver(o, count));
        }, source);
      };
      observableProto.windowWithCount = function(count, skip) {
        var source = this;
        +count || (count = 0);
        Math.abs(count) === Infinity && (count = 0);
        if (count <= 0) {
          throw new ArgumentOutOfRangeError();
        }
        skip == null && (skip = count);
        +skip || (skip = 0);
        Math.abs(skip) === Infinity && (skip = 0);
        if (skip <= 0) {
          throw new ArgumentOutOfRangeError();
        }
        return new AnonymousObservable(function(observer) {
          var m = new SingleAssignmentDisposable(),
              refCountDisposable = new RefCountDisposable(m),
              n = 0,
              q = [];
          function createWindow() {
            var s = new Subject();
            q.push(s);
            observer.onNext(addRef(s, refCountDisposable));
          }
          createWindow();
          m.setDisposable(source.subscribe(function(x) {
            for (var i = 0,
                len = q.length; i < len; i++) {
              q[i].onNext(x);
            }
            var c = n - count + 1;
            c >= 0 && c % skip === 0 && q.shift().onCompleted();
            ++n % skip === 0 && createWindow();
          }, function(e) {
            while (q.length > 0) {
              q.shift().onError(e);
            }
            observer.onError(e);
          }, function() {
            while (q.length > 0) {
              q.shift().onCompleted();
            }
            observer.onCompleted();
          }));
          return refCountDisposable;
        }, source);
      };
      observableProto.flatMapConcat = observableProto.concatMap = function(selector, resultSelector, thisArg) {
        return new FlatMapObservable(this, selector, resultSelector, thisArg).merge(1);
      };
      observableProto.concatMapObserver = observableProto.selectConcatObserver = function(onNext, onError, onCompleted, thisArg) {
        var source = this,
            onNextFunc = bindCallback(onNext, thisArg, 2),
            onErrorFunc = bindCallback(onError, thisArg, 1),
            onCompletedFunc = bindCallback(onCompleted, thisArg, 0);
        return new AnonymousObservable(function(observer) {
          var index = 0;
          return source.subscribe(function(x) {
            var result;
            try {
              result = onNextFunc(x, index++);
            } catch (e) {
              observer.onError(e);
              return;
            }
            isPromise(result) && (result = observableFromPromise(result));
            observer.onNext(result);
          }, function(err) {
            var result;
            try {
              result = onErrorFunc(err);
            } catch (e) {
              observer.onError(e);
              return;
            }
            isPromise(result) && (result = observableFromPromise(result));
            observer.onNext(result);
            observer.onCompleted();
          }, function() {
            var result;
            try {
              result = onCompletedFunc();
            } catch (e) {
              observer.onError(e);
              return;
            }
            isPromise(result) && (result = observableFromPromise(result));
            observer.onNext(result);
            observer.onCompleted();
          });
        }, this).concatAll();
      };
      var DefaultIfEmptyObserver = (function(__super__) {
        inherits(DefaultIfEmptyObserver, __super__);
        function DefaultIfEmptyObserver(o, d) {
          this._o = o;
          this._d = d;
          this._f = false;
          __super__.call(this);
        }
        DefaultIfEmptyObserver.prototype.next = function(x) {
          this._f = true;
          this._o.onNext(x);
        };
        DefaultIfEmptyObserver.prototype.error = function(e) {
          this._o.onError(e);
        };
        DefaultIfEmptyObserver.prototype.completed = function() {
          !this._f && this._o.onNext(defaultValue);
          this._o.onCompleted();
        };
        return DefaultIfEmptyObserver;
      }(AbstractObserver));
      observableProto.defaultIfEmpty = function(defaultValue) {
        var source = this;
        defaultValue === undefined && (defaultValue = null);
        return new AnonymousObservable(function(o) {
          return source.subscribe(new DefaultIfEmptyObserver(o, defaultValue));
        }, source);
      };
      function arrayIndexOfComparer(array, item, comparer) {
        for (var i = 0,
            len = array.length; i < len; i++) {
          if (comparer(array[i], item)) {
            return i;
          }
        }
        return -1;
      }
      function HashSet(comparer) {
        this.comparer = comparer;
        this.set = [];
      }
      HashSet.prototype.push = function(value) {
        var retValue = arrayIndexOfComparer(this.set, value, this.comparer) === -1;
        retValue && this.set.push(value);
        return retValue;
      };
      var DistinctObservable = (function(__super__) {
        inherits(DistinctObservable, __super__);
        function DistinctObservable(source, keyFn, cmpFn) {
          this.source = source;
          this._keyFn = keyFn;
          this._cmpFn = cmpFn;
          __super__.call(this);
        }
        DistinctObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new DistinctObserver(o, this._keyFn, this._cmpFn));
        };
        return DistinctObservable;
      }(ObservableBase));
      var DistinctObserver = (function(__super__) {
        inherits(DistinctObserver, __super__);
        function DistinctObserver(o, keyFn, cmpFn) {
          this._o = o;
          this._keyFn = keyFn;
          this._h = new HashSet(cmpFn);
          __super__.call(this);
        }
        DistinctObserver.prototype.next = function(x) {
          var key = x;
          if (isFunction(this._keyFn)) {
            key = tryCatch(this._keyFn)(x);
            if (key === errorObj) {
              return this._o.onError(key.e);
            }
          }
          this._h.push(key) && this._o.onNext(x);
        };
        DistinctObserver.prototype.error = function(e) {
          this._o.onError(e);
        };
        DistinctObserver.prototype.completed = function() {
          this._o.onCompleted();
        };
        return DistinctObserver;
      }(AbstractObserver));
      observableProto.distinct = function(keySelector, comparer) {
        comparer || (comparer = defaultComparer);
        return new DistinctObservable(this, keySelector, comparer);
      };
      var MapObservable = (function(__super__) {
        inherits(MapObservable, __super__);
        function MapObservable(source, selector, thisArg) {
          this.source = source;
          this.selector = bindCallback(selector, thisArg, 3);
          __super__.call(this);
        }
        function innerMap(selector, self) {
          return function(x, i, o) {
            return selector.call(this, self.selector(x, i, o), i, o);
          };
        }
        MapObservable.prototype.internalMap = function(selector, thisArg) {
          return new MapObservable(this.source, innerMap(selector, this), thisArg);
        };
        MapObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new InnerObserver(o, this.selector, this));
        };
        inherits(InnerObserver, AbstractObserver);
        function InnerObserver(o, selector, source) {
          this.o = o;
          this.selector = selector;
          this.source = source;
          this.i = 0;
          AbstractObserver.call(this);
        }
        InnerObserver.prototype.next = function(x) {
          var result = tryCatch(this.selector)(x, this.i++, this.source);
          if (result === errorObj) {
            return this.o.onError(result.e);
          }
          this.o.onNext(result);
        };
        InnerObserver.prototype.error = function(e) {
          this.o.onError(e);
        };
        InnerObserver.prototype.completed = function() {
          this.o.onCompleted();
        };
        return MapObservable;
      }(ObservableBase));
      observableProto.map = observableProto.select = function(selector, thisArg) {
        var selectorFn = typeof selector === 'function' ? selector : function() {
          return selector;
        };
        return this instanceof MapObservable ? this.internalMap(selectorFn, thisArg) : new MapObservable(this, selectorFn, thisArg);
      };
      function plucker(args, len) {
        return function mapper(x) {
          var currentProp = x;
          for (var i = 0; i < len; i++) {
            var p = currentProp[args[i]];
            if (typeof p !== 'undefined') {
              currentProp = p;
            } else {
              return undefined;
            }
          }
          return currentProp;
        };
      }
      observableProto.pluck = function() {
        var len = arguments.length,
            args = new Array(len);
        if (len === 0) {
          throw new Error('List of properties cannot be empty.');
        }
        for (var i = 0; i < len; i++) {
          args[i] = arguments[i];
        }
        return this.map(plucker(args, len));
      };
      observableProto.flatMapObserver = observableProto.selectManyObserver = function(onNext, onError, onCompleted, thisArg) {
        var source = this;
        return new AnonymousObservable(function(observer) {
          var index = 0;
          return source.subscribe(function(x) {
            var result;
            try {
              result = onNext.call(thisArg, x, index++);
            } catch (e) {
              observer.onError(e);
              return;
            }
            isPromise(result) && (result = observableFromPromise(result));
            observer.onNext(result);
          }, function(err) {
            var result;
            try {
              result = onError.call(thisArg, err);
            } catch (e) {
              observer.onError(e);
              return;
            }
            isPromise(result) && (result = observableFromPromise(result));
            observer.onNext(result);
            observer.onCompleted();
          }, function() {
            var result;
            try {
              result = onCompleted.call(thisArg);
            } catch (e) {
              observer.onError(e);
              return;
            }
            isPromise(result) && (result = observableFromPromise(result));
            observer.onNext(result);
            observer.onCompleted();
          });
        }, source).mergeAll();
      };
      observableProto.flatMap = observableProto.selectMany = function(selector, resultSelector, thisArg) {
        return new FlatMapObservable(this, selector, resultSelector, thisArg).mergeAll();
      };
      Rx.Observable.prototype.flatMapLatest = function(selector, resultSelector, thisArg) {
        return new FlatMapObservable(this, selector, resultSelector, thisArg).switchLatest();
      };
      var SkipObservable = (function(__super__) {
        inherits(SkipObservable, __super__);
        function SkipObservable(source, count) {
          this.source = source;
          this.skipCount = count;
          __super__.call(this);
        }
        SkipObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new InnerObserver(o, this.skipCount));
        };
        function InnerObserver(o, c) {
          this.c = c;
          this.r = c;
          this.o = o;
          this.isStopped = false;
        }
        InnerObserver.prototype.onNext = function(x) {
          if (this.isStopped) {
            return;
          }
          if (this.r <= 0) {
            this.o.onNext(x);
          } else {
            this.r--;
          }
        };
        InnerObserver.prototype.onError = function(e) {
          if (!this.isStopped) {
            this.isStopped = true;
            this.o.onError(e);
          }
        };
        InnerObserver.prototype.onCompleted = function() {
          if (!this.isStopped) {
            this.isStopped = true;
            this.o.onCompleted();
          }
        };
        InnerObserver.prototype.dispose = function() {
          this.isStopped = true;
        };
        InnerObserver.prototype.fail = function(e) {
          if (!this.isStopped) {
            this.isStopped = true;
            this.o.onError(e);
            return true;
          }
          return false;
        };
        return SkipObservable;
      }(ObservableBase));
      observableProto.skip = function(count) {
        if (count < 0) {
          throw new ArgumentOutOfRangeError();
        }
        return new SkipObservable(this, count);
      };
      var SkipWhileObservable = (function(__super__) {
        inherits(SkipWhileObservable, __super__);
        function SkipWhileObservable(source, fn) {
          this.source = source;
          this._fn = fn;
          __super__.call(this);
        }
        SkipWhileObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new SkipWhileObserver(o, this));
        };
        return SkipWhileObservable;
      }(ObservableBase));
      var SkipWhileObserver = (function(__super__) {
        inherits(SkipWhileObserver, __super__);
        function SkipWhileObserver(o, p) {
          this._o = o;
          this._p = p;
          this._i = 0;
          this._r = false;
          __super__.call(this);
        }
        SkipWhileObserver.prototype.next = function(x) {
          if (!this._r) {
            var res = tryCatch(this._p._fn)(x, this._i++, this._p);
            if (res === errorObj) {
              return this._o.onError(res.e);
            }
            this._r = !res;
          }
          this._r && this._o.onNext(x);
        };
        SkipWhileObserver.prototype.error = function(e) {
          this._o.onError(e);
        };
        SkipWhileObserver.prototype.completed = function() {
          this._o.onCompleted();
        };
        return SkipWhileObserver;
      }(AbstractObserver));
      observableProto.skipWhile = function(predicate, thisArg) {
        var fn = bindCallback(predicate, thisArg, 3);
        return new SkipWhileObservable(this, fn);
      };
      var TakeObservable = (function(__super__) {
        inherits(TakeObservable, __super__);
        function TakeObservable(source, count) {
          this.source = source;
          this.takeCount = count;
          __super__.call(this);
        }
        TakeObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new InnerObserver(o, this.takeCount));
        };
        function InnerObserver(o, c) {
          this.o = o;
          this.c = c;
          this.r = c;
          this.isStopped = false;
        }
        InnerObserver.prototype = {
          onNext: function(x) {
            if (this.isStopped) {
              return;
            }
            if (this.r-- > 0) {
              this.o.onNext(x);
              this.r <= 0 && this.o.onCompleted();
            }
          },
          onError: function(err) {
            if (!this.isStopped) {
              this.isStopped = true;
              this.o.onError(err);
            }
          },
          onCompleted: function() {
            if (!this.isStopped) {
              this.isStopped = true;
              this.o.onCompleted();
            }
          },
          dispose: function() {
            this.isStopped = true;
          },
          fail: function(e) {
            if (!this.isStopped) {
              this.isStopped = true;
              this.o.onError(e);
              return true;
            }
            return false;
          }
        };
        return TakeObservable;
      }(ObservableBase));
      observableProto.take = function(count, scheduler) {
        if (count < 0) {
          throw new ArgumentOutOfRangeError();
        }
        if (count === 0) {
          return observableEmpty(scheduler);
        }
        return new TakeObservable(this, count);
      };
      var TakeWhileObservable = (function(__super__) {
        inherits(TakeWhileObservable, __super__);
        function TakeWhileObservable(source, fn) {
          this.source = source;
          this._fn = fn;
          __super__.call(this);
        }
        TakeWhileObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new TakeWhileObserver(o, this));
        };
        return TakeWhileObservable;
      }(ObservableBase));
      var TakeWhileObserver = (function(__super__) {
        inherits(TakeWhileObserver, __super__);
        function TakeWhileObserver(o, p) {
          this._o = o;
          this._p = p;
          this._i = 0;
          this._r = true;
          __super__.call(this);
        }
        TakeWhileObserver.prototype.next = function(x) {
          if (this._r) {
            this._r = tryCatch(this._p._fn)(x, this._i++, this._p);
            if (this._r === errorObj) {
              return this._o.onError(this._r.e);
            }
          }
          if (this._r) {
            this._o.onNext(x);
          } else {
            this._o.onCompleted();
          }
        };
        TakeWhileObserver.prototype.error = function(e) {
          this._o.onError(e);
        };
        TakeWhileObserver.prototype.completed = function() {
          this._o.onCompleted();
        };
        return TakeWhileObserver;
      }(AbstractObserver));
      observableProto.takeWhile = function(predicate, thisArg) {
        var fn = bindCallback(predicate, thisArg, 3);
        return new TakeWhileObservable(this, fn);
      };
      var FilterObservable = (function(__super__) {
        inherits(FilterObservable, __super__);
        function FilterObservable(source, predicate, thisArg) {
          this.source = source;
          this.predicate = bindCallback(predicate, thisArg, 3);
          __super__.call(this);
        }
        FilterObservable.prototype.subscribeCore = function(o) {
          return this.source.subscribe(new InnerObserver(o, this.predicate, this));
        };
        function innerPredicate(predicate, self) {
          return function(x, i, o) {
            return self.predicate(x, i, o) && predicate.call(this, x, i, o);
          };
        }
        FilterObservable.prototype.internalFilter = function(predicate, thisArg) {
          return new FilterObservable(this.source, innerPredicate(predicate, this), thisArg);
        };
        inherits(InnerObserver, AbstractObserver);
        function InnerObserver(o, predicate, source) {
          this.o = o;
          this.predicate = predicate;
          this.source = source;
          this.i = 0;
          AbstractObserver.call(this);
        }
        InnerObserver.prototype.next = function(x) {
          var shouldYield = tryCatch(this.predicate)(x, this.i++, this.source);
          if (shouldYield === errorObj) {
            return this.o.onError(shouldYield.e);
          }
          shouldYield && this.o.onNext(x);
        };
        InnerObserver.prototype.error = function(e) {
          this.o.onError(e);
        };
        InnerObserver.prototype.completed = function() {
          this.o.onCompleted();
        };
        return FilterObservable;
      }(ObservableBase));
      observableProto.filter = observableProto.where = function(predicate, thisArg) {
        return this instanceof FilterObservable ? this.internalFilter(predicate, thisArg) : new FilterObservable(this, predicate, thisArg);
      };
      var TransduceObserver = (function(__super__) {
        inherits(TransduceObserver, __super__);
        function TransduceObserver(o, xform) {
          this._o = o;
          this._xform = xform;
          __super__.call(this);
        }
        TransduceObserver.prototype.next = function(x) {
          var res = tryCatch(this._xform['@@transducer/step']).call(this._xform, this._o, x);
          if (res === errorObj) {
            this._o.onError(res.e);
          }
        };
        TransduceObserver.prototype.error = function(e) {
          this._o.onError(e);
        };
        TransduceObserver.prototype.completed = function() {
          this._xform['@@transducer/result'](this._o);
        };
        return TransduceObserver;
      }(AbstractObserver));
      function transformForObserver(o) {
        return {
          '@@transducer/init': function() {
            return o;
          },
          '@@transducer/step': function(obs, input) {
            return obs.onNext(input);
          },
          '@@transducer/result': function(obs) {
            return obs.onCompleted();
          }
        };
      }
      observableProto.transduce = function(transducer) {
        var source = this;
        return new AnonymousObservable(function(o) {
          var xform = transducer(transformForObserver(o));
          return source.subscribe(new TransduceObserver(o, xform));
        }, source);
      };
      var AnonymousObservable = Rx.AnonymousObservable = (function(__super__) {
        inherits(AnonymousObservable, __super__);
        function fixSubscriber(subscriber) {
          return subscriber && isFunction(subscriber.dispose) ? subscriber : isFunction(subscriber) ? disposableCreate(subscriber) : disposableEmpty;
        }
        function setDisposable(s, state) {
          var ado = state[0],
              self = state[1];
          var sub = tryCatch(self.__subscribe).call(self, ado);
          if (sub === errorObj && !ado.fail(errorObj.e)) {
            thrower(errorObj.e);
          }
          ado.setDisposable(fixSubscriber(sub));
        }
        function AnonymousObservable(subscribe, parent) {
          this.source = parent;
          this.__subscribe = subscribe;
          __super__.call(this);
        }
        AnonymousObservable.prototype._subscribe = function(o) {
          var ado = new AutoDetachObserver(o),
              state = [ado, this];
          if (currentThreadScheduler.scheduleRequired()) {
            currentThreadScheduler.schedule(state, setDisposable);
          } else {
            setDisposable(null, state);
          }
          return ado;
        };
        return AnonymousObservable;
      }(Observable));
      var AutoDetachObserver = (function(__super__) {
        inherits(AutoDetachObserver, __super__);
        function AutoDetachObserver(observer) {
          __super__.call(this);
          this.observer = observer;
          this.m = new SingleAssignmentDisposable();
        }
        var AutoDetachObserverPrototype = AutoDetachObserver.prototype;
        AutoDetachObserverPrototype.next = function(value) {
          var result = tryCatch(this.observer.onNext).call(this.observer, value);
          if (result === errorObj) {
            this.dispose();
            thrower(result.e);
          }
        };
        AutoDetachObserverPrototype.error = function(err) {
          var result = tryCatch(this.observer.onError).call(this.observer, err);
          this.dispose();
          result === errorObj && thrower(result.e);
        };
        AutoDetachObserverPrototype.completed = function() {
          var result = tryCatch(this.observer.onCompleted).call(this.observer);
          this.dispose();
          result === errorObj && thrower(result.e);
        };
        AutoDetachObserverPrototype.setDisposable = function(value) {
          this.m.setDisposable(value);
        };
        AutoDetachObserverPrototype.getDisposable = function() {
          return this.m.getDisposable();
        };
        AutoDetachObserverPrototype.dispose = function() {
          __super__.prototype.dispose.call(this);
          this.m.dispose();
        };
        return AutoDetachObserver;
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
      if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
        root.Rx = Rx;
        define(function() {
          return Rx;
        });
      } else if (freeExports && freeModule) {
        if (moduleExports) {
          (freeModule.exports = Rx).Rx = Rx;
        } else {
          freeExports.Rx = Rx;
        }
      } else {
        root.Rx = Rx;
      }
      var rEndingLine = captureLine();
    }.call(this));
  })(req('5'));
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("7", ["6"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
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
      module.exports = factory(root, module.exports, req('6'));
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("8", ["6", "5"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
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
        module.exports = factory(root, module.exports, req('6'));
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
      function createEventListener(el, eventName, handler) {
        var disposables = new CompositeDisposable();
        var elemToString = Object.prototype.toString.call(el);
        if (elemToString === '[object NodeList]' || elemToString === '[object HTMLCollection]') {
          for (var i = 0,
              len = el.length; i < len; i++) {
            disposables.add(createEventListener(el.item(i), eventName, handler));
          }
        } else if (el) {
          disposables.add(new ListenDisposable(el, eventName, handler));
        }
        return disposables;
      }
      Rx.config.useNativeEvents = false;
      function eventHandler(o, selector) {
        return function handler() {
          var results = arguments[0];
          if (isFunction(selector)) {
            results = tryCatch(selector).apply(null, arguments);
            if (results === errorObj) {
              return o.onError(results.e);
            }
          }
          o.onNext(results);
        };
      }
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
          return createEventListener(element, eventName, eventHandler(o, selector));
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
  })(req('5'));
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("9", ["6"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
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
      module.exports = factory(root, module.exports, req('6'));
    } else {
      root.Rx = factory(root, {}, root.Rx);
    }
  }.call(this, function(root, exp, Rx, undefined) {
    var Observable = Rx.Observable,
        observableProto = Observable.prototype,
        AnonymousObservable = Rx.AnonymousObservable,
        AbstractObserver = Rx.internals.AbstractObserver,
        CompositeDisposable = Rx.CompositeDisposable,
        BinaryDisposable = Rx.BinaryDisposable,
        NAryDisposable = Rx.NAryDisposable,
        Notification = Rx.Notification,
        Subject = Rx.Subject,
        Observer = Rx.Observer,
        disposableEmpty = Rx.Disposable.empty,
        disposableCreate = Rx.Disposable.create,
        inherits = Rx.internals.inherits,
        addProperties = Rx.internals.addProperties,
        defaultScheduler = Rx.Scheduler['default'],
        currentThreadScheduler = Rx.Scheduler.currentThread,
        identity = Rx.helpers.identity,
        isScheduler = Rx.Scheduler.isScheduler,
        isFunction = Rx.helpers.isFunction,
        checkDisposed = Rx.Disposable.checkDisposed;
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
    Rx.Pauser = (function(__super__) {
      inherits(Pauser, __super__);
      function Pauser() {
        __super__.call(this);
      }
      Pauser.prototype.pause = function() {
        this.onNext(false);
      };
      Pauser.prototype.resume = function() {
        this.onNext(true);
      };
      return Pauser;
    }(Subject));
    var PausableObservable = (function(__super__) {
      inherits(PausableObservable, __super__);
      function PausableObservable(source, pauser) {
        this.source = source;
        this.controller = new Subject();
        if (pauser && pauser.subscribe) {
          this.pauser = this.controller.merge(pauser);
        } else {
          this.pauser = this.controller;
        }
        __super__.call(this);
      }
      PausableObservable.prototype._subscribe = function(o) {
        var conn = this.source.publish(),
            subscription = conn.subscribe(o),
            connection = disposableEmpty;
        var pausable = this.pauser.distinctUntilChanged().subscribe(function(b) {
          if (b) {
            connection = conn.connect();
          } else {
            connection.dispose();
            connection = disposableEmpty;
          }
        });
        return new NAryDisposable([subscription, connection, pausable]);
      };
      PausableObservable.prototype.pause = function() {
        this.controller.onNext(false);
      };
      PausableObservable.prototype.resume = function() {
        this.controller.onNext(true);
      };
      return PausableObservable;
    }(Observable));
    observableProto.pausable = function(pauser) {
      return new PausableObservable(this, pauser);
    };
    function combineLatestSource(source, subject, resultSelector) {
      return new AnonymousObservable(function(o) {
        var hasValue = [false, false],
            hasValueAll = false,
            isDone = false,
            values = new Array(2),
            err;
        function next(x, i) {
          values[i] = x;
          hasValue[i] = true;
          if (hasValueAll || (hasValueAll = hasValue.every(identity))) {
            if (err) {
              return o.onError(err);
            }
            var res = tryCatch(resultSelector).apply(null, values);
            if (res === errorObj) {
              return o.onError(res.e);
            }
            o.onNext(res);
          }
          isDone && values[1] && o.onCompleted();
        }
        return new BinaryDisposable(source.subscribe(function(x) {
          next(x, 0);
        }, function(e) {
          if (values[1]) {
            o.onError(e);
          } else {
            err = e;
          }
        }, function() {
          isDone = true;
          values[1] && o.onCompleted();
        }), subject.subscribe(function(x) {
          next(x, 1);
        }, function(e) {
          o.onError(e);
        }, function() {
          isDone = true;
          next(true, 1);
        }));
      }, source);
    }
    var PausableBufferedObservable = (function(__super__) {
      inherits(PausableBufferedObservable, __super__);
      function PausableBufferedObservable(source, pauser) {
        this.source = source;
        this.controller = new Subject();
        if (pauser && pauser.subscribe) {
          this.pauser = this.controller.merge(pauser);
        } else {
          this.pauser = this.controller;
        }
        __super__.call(this);
      }
      PausableBufferedObservable.prototype._subscribe = function(o) {
        var q = [],
            previousShouldFire;
        function drainQueue() {
          while (q.length > 0) {
            o.onNext(q.shift());
          }
        }
        var subscription = combineLatestSource(this.source, this.pauser.startWith(false).distinctUntilChanged(), function(data, shouldFire) {
          return {
            data: data,
            shouldFire: shouldFire
          };
        }).subscribe(function(results) {
          if (previousShouldFire !== undefined && results.shouldFire !== previousShouldFire) {
            previousShouldFire = results.shouldFire;
            if (results.shouldFire) {
              drainQueue();
            }
          } else {
            previousShouldFire = results.shouldFire;
            if (results.shouldFire) {
              o.onNext(results.data);
            } else {
              q.push(results.data);
            }
          }
        }, function(err) {
          drainQueue();
          o.onError(err);
        }, function() {
          drainQueue();
          o.onCompleted();
        });
        return subscription;
      };
      PausableBufferedObservable.prototype.pause = function() {
        this.controller.onNext(false);
      };
      PausableBufferedObservable.prototype.resume = function() {
        this.controller.onNext(true);
      };
      return PausableBufferedObservable;
    }(Observable));
    observableProto.pausableBuffered = function(subject) {
      return new PausableBufferedObservable(this, subject);
    };
    var ControlledObservable = (function(__super__) {
      inherits(ControlledObservable, __super__);
      function ControlledObservable(source, enableQueue, scheduler) {
        __super__.call(this);
        this.subject = new ControlledSubject(enableQueue, scheduler);
        this.source = source.multicast(this.subject).refCount();
      }
      ControlledObservable.prototype._subscribe = function(o) {
        return this.source.subscribe(o);
      };
      ControlledObservable.prototype.request = function(numberOfItems) {
        return this.subject.request(numberOfItems == null ? -1 : numberOfItems);
      };
      return ControlledObservable;
    }(Observable));
    var ControlledSubject = (function(__super__) {
      inherits(ControlledSubject, __super__);
      function ControlledSubject(enableQueue, scheduler) {
        enableQueue == null && (enableQueue = true);
        __super__.call(this);
        this.subject = new Subject();
        this.enableQueue = enableQueue;
        this.queue = enableQueue ? [] : null;
        this.requestedCount = 0;
        this.requestedDisposable = null;
        this.error = null;
        this.hasFailed = false;
        this.hasCompleted = false;
        this.scheduler = scheduler || currentThreadScheduler;
      }
      addProperties(ControlledSubject.prototype, Observer, {
        _subscribe: function(o) {
          return this.subject.subscribe(o);
        },
        onCompleted: function() {
          this.hasCompleted = true;
          if (!this.enableQueue || this.queue.length === 0) {
            this.subject.onCompleted();
            this.disposeCurrentRequest();
          } else {
            this.queue.push(Notification.createOnCompleted());
          }
        },
        onError: function(error) {
          this.hasFailed = true;
          this.error = error;
          if (!this.enableQueue || this.queue.length === 0) {
            this.subject.onError(error);
            this.disposeCurrentRequest();
          } else {
            this.queue.push(Notification.createOnError(error));
          }
        },
        onNext: function(value) {
          if (this.requestedCount <= 0) {
            this.enableQueue && this.queue.push(Notification.createOnNext(value));
          } else {
            (this.requestedCount-- === 0) && this.disposeCurrentRequest();
            this.subject.onNext(value);
          }
        },
        _processRequest: function(numberOfItems) {
          if (this.enableQueue) {
            while (this.queue.length > 0 && (numberOfItems > 0 || this.queue[0].kind !== 'N')) {
              var first = this.queue.shift();
              first.accept(this.subject);
              if (first.kind === 'N') {
                numberOfItems--;
              } else {
                this.disposeCurrentRequest();
                this.queue = [];
              }
            }
          }
          return numberOfItems;
        },
        request: function(number) {
          this.disposeCurrentRequest();
          var self = this;
          this.requestedDisposable = this.scheduler.schedule(number, function(s, i) {
            var remaining = self._processRequest(i);
            var stopped = self.hasCompleted || self.hasFailed;
            if (!stopped && remaining > 0) {
              self.requestedCount = remaining;
              return disposableCreate(function() {
                self.requestedCount = 0;
              });
            }
          });
          return this.requestedDisposable;
        },
        disposeCurrentRequest: function() {
          if (this.requestedDisposable) {
            this.requestedDisposable.dispose();
            this.requestedDisposable = null;
          }
        }
      });
      return ControlledSubject;
    }(Observable));
    observableProto.controlled = function(enableQueue, scheduler) {
      if (enableQueue && isScheduler(enableQueue)) {
        scheduler = enableQueue;
        enableQueue = true;
      }
      if (enableQueue == null) {
        enableQueue = true;
      }
      return new ControlledObservable(this, enableQueue, scheduler);
    };
    var StopAndWaitObservable = (function(__super__) {
      inherits(StopAndWaitObservable, __super__);
      function StopAndWaitObservable(source) {
        __super__.call(this);
        this.source = source;
      }
      function scheduleMethod(s, self) {
        self.source.request(1);
      }
      StopAndWaitObservable.prototype._subscribe = function(o) {
        this.subscription = this.source.subscribe(new StopAndWaitObserver(o, this, this.subscription));
        return new BinaryDisposable(this.subscription, defaultScheduler.schedule(this, scheduleMethod));
      };
      var StopAndWaitObserver = (function(__sub__) {
        inherits(StopAndWaitObserver, __sub__);
        function StopAndWaitObserver(observer, observable, cancel) {
          __sub__.call(this);
          this.observer = observer;
          this.observable = observable;
          this.cancel = cancel;
          this.scheduleDisposable = null;
        }
        StopAndWaitObserver.prototype.completed = function() {
          this.observer.onCompleted();
          this.dispose();
        };
        StopAndWaitObserver.prototype.error = function(error) {
          this.observer.onError(error);
          this.dispose();
        };
        function innerScheduleMethod(s, self) {
          self.observable.source.request(1);
        }
        StopAndWaitObserver.prototype.next = function(value) {
          this.observer.onNext(value);
          this.scheduleDisposable = defaultScheduler.schedule(this, innerScheduleMethod);
        };
        StopAndWaitObservable.dispose = function() {
          this.observer = null;
          if (this.cancel) {
            this.cancel.dispose();
            this.cancel = null;
          }
          if (this.scheduleDisposable) {
            this.scheduleDisposable.dispose();
            this.scheduleDisposable = null;
          }
          __sub__.prototype.dispose.call(this);
        };
        return StopAndWaitObserver;
      }(AbstractObserver));
      return StopAndWaitObservable;
    }(Observable));
    ControlledObservable.prototype.stopAndWait = function() {
      return new StopAndWaitObservable(this);
    };
    var WindowedObservable = (function(__super__) {
      inherits(WindowedObservable, __super__);
      function WindowedObservable(source, windowSize) {
        __super__.call(this);
        this.source = source;
        this.windowSize = windowSize;
      }
      function scheduleMethod(s, self) {
        self.source.request(self.windowSize);
      }
      WindowedObservable.prototype._subscribe = function(o) {
        this.subscription = this.source.subscribe(new WindowedObserver(o, this, this.subscription));
        return new BinaryDisposable(this.subscription, defaultScheduler.schedule(this, scheduleMethod));
      };
      var WindowedObserver = (function(__sub__) {
        inherits(WindowedObserver, __sub__);
        function WindowedObserver(observer, observable, cancel) {
          this.observer = observer;
          this.observable = observable;
          this.cancel = cancel;
          this.received = 0;
          this.scheduleDisposable = null;
          __sub__.call(this);
        }
        WindowedObserver.prototype.completed = function() {
          this.observer.onCompleted();
          this.dispose();
        };
        WindowedObserver.prototype.error = function(error) {
          this.observer.onError(error);
          this.dispose();
        };
        function innerScheduleMethod(s, self) {
          self.observable.source.request(self.observable.windowSize);
        }
        WindowedObserver.prototype.next = function(value) {
          this.observer.onNext(value);
          this.received = ++this.received % this.observable.windowSize;
          this.received === 0 && (this.scheduleDisposable = defaultScheduler.schedule(this, innerScheduleMethod));
        };
        WindowedObserver.prototype.dispose = function() {
          this.observer = null;
          if (this.cancel) {
            this.cancel.dispose();
            this.cancel = null;
          }
          if (this.scheduleDisposable) {
            this.scheduleDisposable.dispose();
            this.scheduleDisposable = null;
          }
          __sub__.prototype.dispose.call(this);
        };
        return WindowedObserver;
      }(AbstractObserver));
      return WindowedObservable;
    }(Observable));
    ControlledObservable.prototype.windowed = function(windowSize) {
      return new WindowedObservable(this, windowSize);
    };
    observableProto.pipe = function(dest) {
      var source = this.pausableBuffered();
      function onDrain() {
        source.resume();
      }
      dest.addListener('drain', onDrain);
      source.subscribe(function(x) {
        !dest.write(String(x)) && source.pause();
      }, function(err) {
        dest.emit('error', err);
      }, function() {
        !dest._isStdio && dest.end();
        dest.removeListener('drain', onDrain);
      });
      source.resume();
      return dest;
    };
    return Rx;
  }));
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("a", ["6"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
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
      module.exports = factory(root, module.exports, req('6'));
    } else {
      root.Rx = factory(root, {}, root.Rx);
    }
  }.call(this, function(root, exp, Rx, undefined) {
    var Observable = Rx.Observable,
        observableProto = Observable.prototype,
        AnonymousObservable = Rx.AnonymousObservable,
        ObservableBase = Rx.ObservableBase,
        Subject = Rx.Subject,
        AsyncSubject = Rx.AsyncSubject,
        Observer = Rx.Observer,
        ScheduledObserver = Rx.internals.ScheduledObserver,
        disposableCreate = Rx.Disposable.create,
        disposableEmpty = Rx.Disposable.empty,
        BinaryDisposable = Rx.BinaryDisposable,
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
    observableProto.singleInstance = function() {
      var source = this,
          hasObservable = false,
          observable;
      function getObservable() {
        if (!hasObservable) {
          hasObservable = true;
          observable = source.finally(function() {
            hasObservable = false;
          }).publish().refCount();
        }
        return observable;
      }
      return new AnonymousObservable(function(o) {
        return getObservable().subscribe(o);
      });
    };
    return Rx;
  }));
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("b", ["6"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
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
      module.exports = factory(root, module.exports, req('6'));
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("c", ["6"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
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
      module.exports = factory(root, module.exports, req('6'));
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("d", ["6"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
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
      module.exports = factory(root, module.exports, req('6'));
    } else {
      root.Rx = factory(root, {}, root.Rx);
    }
  }.call(this, function(root, exp, Rx, undefined) {
    var Observable = Rx.Observable,
        observableProto = Observable.prototype,
        AnonymousObservable = Rx.AnonymousObservable,
        observableThrow = Observable.throwError,
        observerCreate = Rx.Observer.create,
        SingleAssignmentDisposable = Rx.SingleAssignmentDisposable,
        CompositeDisposable = Rx.CompositeDisposable,
        AbstractObserver = Rx.internals.AbstractObserver,
        noop = Rx.helpers.noop,
        inherits = Rx.internals.inherits;
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
    function Pattern(patterns) {
      this.patterns = patterns;
    }
    Pattern.prototype.and = function(other) {
      return new Pattern(this.patterns.concat(other));
    };
    Pattern.prototype.thenDo = function(selector) {
      return new Plan(this, selector);
    };
    function Plan(expression, selector) {
      this.expression = expression;
      this.selector = selector;
    }
    Plan.prototype.activate = function(externalSubscriptions, observer, deactivate) {
      var self = this;
      var joinObservers = [];
      for (var i = 0,
          len = this.expression.patterns.length; i < len; i++) {
        joinObservers.push(planCreateObserver(externalSubscriptions, this.expression.patterns[i], observer.onError.bind(observer)));
      }
      var activePlan = new ActivePlan(joinObservers, function() {
        var result;
        try {
          result = self.selector.apply(self, arguments);
        } catch (e) {
          observer.onError(e);
          return;
        }
        observer.onNext(result);
      }, function() {
        for (var j = 0,
            jlen = joinObservers.length; j < jlen; j++) {
          joinObservers[j].removeActivePlan(activePlan);
        }
        deactivate(activePlan);
      });
      for (i = 0, len = joinObservers.length; i < len; i++) {
        joinObservers[i].addActivePlan(activePlan);
      }
      return activePlan;
    };
    function planCreateObserver(externalSubscriptions, observable, onError) {
      var entry = externalSubscriptions.get(observable);
      if (!entry) {
        var observer = new JoinObserver(observable, onError);
        externalSubscriptions.set(observable, observer);
        return observer;
      }
      return entry;
    }
    function ActivePlan(joinObserverArray, onNext, onCompleted) {
      this.joinObserverArray = joinObserverArray;
      this.onNext = onNext;
      this.onCompleted = onCompleted;
      this.joinObservers = new Map();
      for (var i = 0,
          len = this.joinObserverArray.length; i < len; i++) {
        var joinObserver = this.joinObserverArray[i];
        this.joinObservers.set(joinObserver, joinObserver);
      }
    }
    ActivePlan.prototype.dequeue = function() {
      this.joinObservers.forEach(function(v) {
        v.queue.shift();
      });
    };
    ActivePlan.prototype.match = function() {
      var i,
          len,
          hasValues = true;
      for (i = 0, len = this.joinObserverArray.length; i < len; i++) {
        if (this.joinObserverArray[i].queue.length === 0) {
          hasValues = false;
          break;
        }
      }
      if (hasValues) {
        var firstValues = [],
            isCompleted = false;
        for (i = 0, len = this.joinObserverArray.length; i < len; i++) {
          firstValues.push(this.joinObserverArray[i].queue[0]);
          this.joinObserverArray[i].queue[0].kind === 'C' && (isCompleted = true);
        }
        if (isCompleted) {
          this.onCompleted();
        } else {
          this.dequeue();
          var values = [];
          for (i = 0, len = firstValues.length; i < firstValues.length; i++) {
            values.push(firstValues[i].value);
          }
          this.onNext.apply(this, values);
        }
      }
    };
    var JoinObserver = (function(__super__) {
      inherits(JoinObserver, __super__);
      function JoinObserver(source, onError) {
        __super__.call(this);
        this.source = source;
        this.onError = onError;
        this.queue = [];
        this.activePlans = [];
        this.subscription = new SingleAssignmentDisposable();
        this.isDisposed = false;
      }
      var JoinObserverPrototype = JoinObserver.prototype;
      JoinObserverPrototype.next = function(notification) {
        if (!this.isDisposed) {
          if (notification.kind === 'E') {
            return this.onError(notification.error);
          }
          this.queue.push(notification);
          var activePlans = this.activePlans.slice(0);
          for (var i = 0,
              len = activePlans.length; i < len; i++) {
            activePlans[i].match();
          }
        }
      };
      JoinObserverPrototype.error = noop;
      JoinObserverPrototype.completed = noop;
      JoinObserverPrototype.addActivePlan = function(activePlan) {
        this.activePlans.push(activePlan);
      };
      JoinObserverPrototype.subscribe = function() {
        this.subscription.setDisposable(this.source.materialize().subscribe(this));
      };
      JoinObserverPrototype.removeActivePlan = function(activePlan) {
        this.activePlans.splice(this.activePlans.indexOf(activePlan), 1);
        this.activePlans.length === 0 && this.dispose();
      };
      JoinObserverPrototype.dispose = function() {
        __super__.prototype.dispose.call(this);
        if (!this.isDisposed) {
          this.isDisposed = true;
          this.subscription.dispose();
        }
      };
      return JoinObserver;
    }(AbstractObserver));
    observableProto.and = function(right) {
      return new Pattern([this, right]);
    };
    observableProto.thenDo = function(selector) {
      return new Pattern([this]).thenDo(selector);
    };
    Observable.when = function() {
      var len = arguments.length,
          plans;
      if (Array.isArray(arguments[0])) {
        plans = arguments[0];
      } else {
        plans = new Array(len);
        for (var i = 0; i < len; i++) {
          plans[i] = arguments[i];
        }
      }
      return new AnonymousObservable(function(o) {
        var activePlans = [],
            externalSubscriptions = new Map();
        var outObserver = observerCreate(function(x) {
          o.onNext(x);
        }, function(err) {
          externalSubscriptions.forEach(function(v) {
            v.onError(err);
          });
          o.onError(err);
        }, function(x) {
          o.onCompleted();
        });
        try {
          for (var i = 0,
              len = plans.length; i < len; i++) {
            activePlans.push(plans[i].activate(externalSubscriptions, outObserver, function(activePlan) {
              var idx = activePlans.indexOf(activePlan);
              activePlans.splice(idx, 1);
              activePlans.length === 0 && o.onCompleted();
            }));
          }
        } catch (e) {
          observableThrow(e).subscribe(o);
        }
        var group = new CompositeDisposable();
        externalSubscriptions.forEach(function(joinObserver) {
          joinObserver.subscribe();
          group.add(joinObserver);
        });
        return group;
      });
    };
    return Rx;
  }));
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("e", ["6"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
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
      module.exports = factory(root, module.exports, req('6'));
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("f", ["6"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
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
      module.exports = factory(root, module.exports, req('6'));
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("10", ["6"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
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
      define(['./rx.virtualtime', 'exports'], function(Rx, exports) {
        root.Rx = factory(root, exports, Rx);
        return root.Rx;
      });
    } else if (typeof module === 'object' && module && module.exports === freeExports) {
      module.exports = factory(root, module.exports, req('6'));
    } else {
      root.Rx = factory(root, {}, root.Rx);
    }
  }.call(this, function(root, exp, Rx, undefined) {
    var Observer = Rx.Observer,
        Observable = Rx.Observable,
        Notification = Rx.Notification,
        VirtualTimeScheduler = Rx.VirtualTimeScheduler,
        Disposable = Rx.Disposable,
        disposableEmpty = Disposable.empty,
        disposableCreate = Disposable.create,
        CompositeDisposable = Rx.CompositeDisposable,
        inherits = Rx.internals.inherits,
        defaultComparer = Rx.internals.isEqual;
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("11", ["6"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
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
      module.exports = factory(root, module.exports, req('6'));
    } else {
      root.Rx = factory(root, {}, root.Rx);
    }
  }.call(this, function(root, exp, Rx, undefined) {
    var inherits = Rx.internals.inherits,
        AbstractObserver = Rx.internals.AbstractObserver,
        Observable = Rx.Observable,
        observableProto = Observable.prototype,
        AnonymousObservable = Rx.AnonymousObservable,
        ObservableBase = Rx.ObservableBase,
        observableDefer = Observable.defer,
        observableEmpty = Observable.empty,
        observableNever = Observable.never,
        observableThrow = Observable['throw'],
        observableFromArray = Observable.fromArray,
        defaultScheduler = Rx.Scheduler['default'],
        SingleAssignmentDisposable = Rx.SingleAssignmentDisposable,
        SerialDisposable = Rx.SerialDisposable,
        CompositeDisposable = Rx.CompositeDisposable,
        BinaryDisposable = Rx.BinaryDisposable,
        RefCountDisposable = Rx.RefCountDisposable,
        Subject = Rx.Subject,
        addRef = Rx.internals.addRef,
        normalizeTime = Rx.Scheduler.normalize,
        helpers = Rx.helpers,
        isPromise = helpers.isPromise,
        isFunction = helpers.isFunction,
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
    var TimerObservable = (function(__super__) {
      inherits(TimerObservable, __super__);
      function TimerObservable(dt, s) {
        this._dt = dt;
        this._s = s;
        __super__.call(this);
      }
      TimerObservable.prototype.subscribeCore = function(o) {
        return this._s.scheduleFuture(o, this._dt, scheduleMethod);
      };
      function scheduleMethod(s, o) {
        o.onNext(0);
        o.onCompleted();
      }
      return TimerObservable;
    }(ObservableBase));
    function _observableTimer(dueTime, scheduler) {
      return new TimerObservable(dueTime, scheduler);
    }
    function observableTimerDateAndPeriod(dueTime, period, scheduler) {
      return new AnonymousObservable(function(observer) {
        var d = dueTime,
            p = normalizeTime(period);
        return scheduler.scheduleRecursiveFuture(0, d, function(count, self) {
          if (p > 0) {
            var now = scheduler.now();
            d = d + p;
            d <= now && (d = now + p);
          }
          observer.onNext(count);
          self(count + 1, new Date(d));
        });
      });
    }
    function observableTimerTimeSpanAndPeriod(dueTime, period, scheduler) {
      return dueTime === period ? new AnonymousObservable(function(observer) {
        return scheduler.schedulePeriodic(0, period, function(count) {
          observer.onNext(count);
          return count + 1;
        });
      }) : observableDefer(function() {
        return observableTimerDateAndPeriod(new Date(scheduler.now() + dueTime), period, scheduler);
      });
    }
    var observableinterval = Observable.interval = function(period, scheduler) {
      return observableTimerTimeSpanAndPeriod(period, period, isScheduler(scheduler) ? scheduler : defaultScheduler);
    };
    var observableTimer = Observable.timer = function(dueTime, periodOrScheduler, scheduler) {
      var period;
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      if (periodOrScheduler != null && typeof periodOrScheduler === 'number') {
        period = periodOrScheduler;
      } else if (isScheduler(periodOrScheduler)) {
        scheduler = periodOrScheduler;
      }
      if ((dueTime instanceof Date || typeof dueTime === 'number') && period === undefined) {
        return _observableTimer(dueTime, scheduler);
      }
      if (dueTime instanceof Date && period !== undefined) {
        return observableTimerDateAndPeriod(dueTime.getTime(), periodOrScheduler, scheduler);
      }
      return observableTimerTimeSpanAndPeriod(dueTime, period, scheduler);
    };
    function observableDelayRelative(source, dueTime, scheduler) {
      return new AnonymousObservable(function(o) {
        var active = false,
            cancelable = new SerialDisposable(),
            exception = null,
            q = [],
            running = false,
            subscription;
        subscription = source.materialize().timestamp(scheduler).subscribe(function(notification) {
          var d,
              shouldRun;
          if (notification.value.kind === 'E') {
            q = [];
            q.push(notification);
            exception = notification.value.error;
            shouldRun = !running;
          } else {
            q.push({
              value: notification.value,
              timestamp: notification.timestamp + dueTime
            });
            shouldRun = !active;
            active = true;
          }
          if (shouldRun) {
            if (exception !== null) {
              o.onError(exception);
            } else {
              d = new SingleAssignmentDisposable();
              cancelable.setDisposable(d);
              d.setDisposable(scheduler.scheduleRecursiveFuture(null, dueTime, function(_, self) {
                var e,
                    recurseDueTime,
                    result,
                    shouldRecurse;
                if (exception !== null) {
                  return;
                }
                running = true;
                do {
                  result = null;
                  if (q.length > 0 && q[0].timestamp - scheduler.now() <= 0) {
                    result = q.shift().value;
                  }
                  if (result !== null) {
                    result.accept(o);
                  }
                } while (result !== null);
                shouldRecurse = false;
                recurseDueTime = 0;
                if (q.length > 0) {
                  shouldRecurse = true;
                  recurseDueTime = Math.max(0, q[0].timestamp - scheduler.now());
                } else {
                  active = false;
                }
                e = exception;
                running = false;
                if (e !== null) {
                  o.onError(e);
                } else if (shouldRecurse) {
                  self(null, recurseDueTime);
                }
              }));
            }
          }
        });
        return new BinaryDisposable(subscription, cancelable);
      }, source);
    }
    function observableDelayAbsolute(source, dueTime, scheduler) {
      return observableDefer(function() {
        return observableDelayRelative(source, dueTime - scheduler.now(), scheduler);
      });
    }
    function delayWithSelector(source, subscriptionDelay, delayDurationSelector) {
      var subDelay,
          selector;
      if (isFunction(subscriptionDelay)) {
        selector = subscriptionDelay;
      } else {
        subDelay = subscriptionDelay;
        selector = delayDurationSelector;
      }
      return new AnonymousObservable(function(o) {
        var delays = new CompositeDisposable(),
            atEnd = false,
            subscription = new SerialDisposable();
        function start() {
          subscription.setDisposable(source.subscribe(function(x) {
            var delay = tryCatch(selector)(x);
            if (delay === errorObj) {
              return o.onError(delay.e);
            }
            var d = new SingleAssignmentDisposable();
            delays.add(d);
            d.setDisposable(delay.subscribe(function() {
              o.onNext(x);
              delays.remove(d);
              done();
            }, function(e) {
              o.onError(e);
            }, function() {
              o.onNext(x);
              delays.remove(d);
              done();
            }));
          }, function(e) {
            o.onError(e);
          }, function() {
            atEnd = true;
            subscription.dispose();
            done();
          }));
        }
        function done() {
          atEnd && delays.length === 0 && o.onCompleted();
        }
        if (!subDelay) {
          start();
        } else {
          subscription.setDisposable(subDelay.subscribe(start, function(e) {
            o.onError(e);
          }, start));
        }
        return new BinaryDisposable(subscription, delays);
      }, this);
    }
    observableProto.delay = function() {
      var firstArg = arguments[0];
      if (typeof firstArg === 'number' || firstArg instanceof Date) {
        var dueTime = firstArg,
            scheduler = arguments[1];
        isScheduler(scheduler) || (scheduler = defaultScheduler);
        return dueTime instanceof Date ? observableDelayAbsolute(this, dueTime, scheduler) : observableDelayRelative(this, dueTime, scheduler);
      } else if (Observable.isObservable(firstArg) || isFunction(firstArg)) {
        return delayWithSelector(this, firstArg, arguments[1]);
      } else {
        throw new Error('Invalid arguments');
      }
    };
    var DebounceObservable = (function(__super__) {
      inherits(DebounceObservable, __super__);
      function DebounceObservable(source, dt, s) {
        isScheduler(s) || (s = defaultScheduler);
        this.source = source;
        this._dt = dt;
        this._s = s;
        __super__.call(this);
      }
      DebounceObservable.prototype.subscribeCore = function(o) {
        var cancelable = new SerialDisposable();
        return new BinaryDisposable(this.source.subscribe(new DebounceObserver(o, this.source, this._dt, this._s, cancelable)), cancelable);
      };
      return DebounceObservable;
    }(ObservableBase));
    var DebounceObserver = (function(__super__) {
      inherits(DebounceObserver, __super__);
      function DebounceObserver(observer, source, dueTime, scheduler, cancelable) {
        this._o = observer;
        this._s = source;
        this._d = dueTime;
        this._scheduler = scheduler;
        this._c = cancelable;
        this._v = null;
        this._hv = false;
        this._id = 0;
        __super__.call(this);
      }
      DebounceObserver.prototype.next = function(x) {
        this._hv = true;
        this._v = x;
        var currentId = ++this._id,
            d = new SingleAssignmentDisposable();
        this._c.setDisposable(d);
        d.setDisposable(this._scheduler.scheduleFuture(this, this._d, function(_, self) {
          self._hv && self._id === currentId && self._o.onNext(x);
          self._hv = false;
        }));
      };
      DebounceObserver.prototype.error = function(e) {
        this._c.dispose();
        this._o.onError(e);
        this._hv = false;
        this._id++;
      };
      DebounceObserver.prototype.completed = function() {
        this._c.dispose();
        this._hv && this._o.onNext(this._v);
        this._o.onCompleted();
        this._hv = false;
        this._id++;
      };
      return DebounceObserver;
    }(AbstractObserver));
    function debounceWithSelector(source, durationSelector) {
      return new AnonymousObservable(function(o) {
        var value,
            hasValue = false,
            cancelable = new SerialDisposable(),
            id = 0;
        var subscription = source.subscribe(function(x) {
          var throttle = tryCatch(durationSelector)(x);
          if (throttle === errorObj) {
            return o.onError(throttle.e);
          }
          isPromise(throttle) && (throttle = observableFromPromise(throttle));
          hasValue = true;
          value = x;
          id++;
          var currentid = id,
              d = new SingleAssignmentDisposable();
          cancelable.setDisposable(d);
          d.setDisposable(throttle.subscribe(function() {
            hasValue && id === currentid && o.onNext(value);
            hasValue = false;
            d.dispose();
          }, function(e) {
            o.onError(e);
          }, function() {
            hasValue && id === currentid && o.onNext(value);
            hasValue = false;
            d.dispose();
          }));
        }, function(e) {
          cancelable.dispose();
          o.onError(e);
          hasValue = false;
          id++;
        }, function() {
          cancelable.dispose();
          hasValue && o.onNext(value);
          o.onCompleted();
          hasValue = false;
          id++;
        });
        return new BinaryDisposable(subscription, cancelable);
      }, source);
    }
    observableProto.debounce = function() {
      if (isFunction(arguments[0])) {
        return debounceWithSelector(this, arguments[0]);
      } else if (typeof arguments[0] === 'number') {
        return new DebounceObservable(this, arguments[0], arguments[1]);
      } else {
        throw new Error('Invalid arguments');
      }
    };
    observableProto.windowWithTime = function(timeSpan, timeShiftOrScheduler, scheduler) {
      var source = this,
          timeShift;
      timeShiftOrScheduler == null && (timeShift = timeSpan);
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      if (typeof timeShiftOrScheduler === 'number') {
        timeShift = timeShiftOrScheduler;
      } else if (isScheduler(timeShiftOrScheduler)) {
        timeShift = timeSpan;
        scheduler = timeShiftOrScheduler;
      }
      return new AnonymousObservable(function(observer) {
        var groupDisposable,
            nextShift = timeShift,
            nextSpan = timeSpan,
            q = [],
            refCountDisposable,
            timerD = new SerialDisposable(),
            totalTime = 0;
        groupDisposable = new CompositeDisposable(timerD), refCountDisposable = new RefCountDisposable(groupDisposable);
        function createTimer() {
          var m = new SingleAssignmentDisposable(),
              isSpan = false,
              isShift = false;
          timerD.setDisposable(m);
          if (nextSpan === nextShift) {
            isSpan = true;
            isShift = true;
          } else if (nextSpan < nextShift) {
            isSpan = true;
          } else {
            isShift = true;
          }
          var newTotalTime = isSpan ? nextSpan : nextShift,
              ts = newTotalTime - totalTime;
          totalTime = newTotalTime;
          if (isSpan) {
            nextSpan += timeShift;
          }
          if (isShift) {
            nextShift += timeShift;
          }
          m.setDisposable(scheduler.scheduleFuture(null, ts, function() {
            if (isShift) {
              var s = new Subject();
              q.push(s);
              observer.onNext(addRef(s, refCountDisposable));
            }
            isSpan && q.shift().onCompleted();
            createTimer();
          }));
        }
        ;
        q.push(new Subject());
        observer.onNext(addRef(q[0], refCountDisposable));
        createTimer();
        groupDisposable.add(source.subscribe(function(x) {
          for (var i = 0,
              len = q.length; i < len; i++) {
            q[i].onNext(x);
          }
        }, function(e) {
          for (var i = 0,
              len = q.length; i < len; i++) {
            q[i].onError(e);
          }
          observer.onError(e);
        }, function() {
          for (var i = 0,
              len = q.length; i < len; i++) {
            q[i].onCompleted();
          }
          observer.onCompleted();
        }));
        return refCountDisposable;
      }, source);
    };
    observableProto.windowWithTimeOrCount = function(timeSpan, count, scheduler) {
      var source = this;
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      return new AnonymousObservable(function(observer) {
        var timerD = new SerialDisposable(),
            groupDisposable = new CompositeDisposable(timerD),
            refCountDisposable = new RefCountDisposable(groupDisposable),
            n = 0,
            windowId = 0,
            s = new Subject();
        function createTimer(id) {
          var m = new SingleAssignmentDisposable();
          timerD.setDisposable(m);
          m.setDisposable(scheduler.scheduleFuture(null, timeSpan, function() {
            if (id !== windowId) {
              return;
            }
            n = 0;
            var newId = ++windowId;
            s.onCompleted();
            s = new Subject();
            observer.onNext(addRef(s, refCountDisposable));
            createTimer(newId);
          }));
        }
        observer.onNext(addRef(s, refCountDisposable));
        createTimer(0);
        groupDisposable.add(source.subscribe(function(x) {
          var newId = 0,
              newWindow = false;
          s.onNext(x);
          if (++n === count) {
            newWindow = true;
            n = 0;
            newId = ++windowId;
            s.onCompleted();
            s = new Subject();
            observer.onNext(addRef(s, refCountDisposable));
          }
          newWindow && createTimer(newId);
        }, function(e) {
          s.onError(e);
          observer.onError(e);
        }, function() {
          s.onCompleted();
          observer.onCompleted();
        }));
        return refCountDisposable;
      }, source);
    };
    function toArray(x) {
      return x.toArray();
    }
    observableProto.bufferWithTime = function(timeSpan, timeShiftOrScheduler, scheduler) {
      return this.windowWithTime(timeSpan, timeShiftOrScheduler, scheduler).flatMap(toArray);
    };
    function toArray(x) {
      return x.toArray();
    }
    observableProto.bufferWithTimeOrCount = function(timeSpan, count, scheduler) {
      return this.windowWithTimeOrCount(timeSpan, count, scheduler).flatMap(toArray);
    };
    var TimeIntervalObservable = (function(__super__) {
      inherits(TimeIntervalObservable, __super__);
      function TimeIntervalObservable(source, s) {
        this.source = source;
        this._s = s;
        __super__.call(this);
      }
      TimeIntervalObservable.prototype.subscribeCore = function(o) {
        return this.source.subscribe(new TimeIntervalObserver(o, this._s));
      };
      return TimeIntervalObservable;
    }(ObservableBase));
    var TimeIntervalObserver = (function(__super__) {
      inherits(TimeIntervalObserver, __super__);
      function TimeIntervalObserver(o, s) {
        this._o = o;
        this._s = s;
        this._l = s.now();
        __super__.call(this);
      }
      TimeIntervalObserver.prototype.next = function(x) {
        var now = this._s.now(),
            span = now - this._l;
        this._l = now;
        this._o.onNext({
          value: x,
          interval: span
        });
      };
      TimeIntervalObserver.prototype.error = function(e) {
        this._o.onError(e);
      };
      TimeIntervalObserver.prototype.completed = function() {
        this._o.onCompleted();
      };
      return TimeIntervalObserver;
    }(AbstractObserver));
    observableProto.timeInterval = function(scheduler) {
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      return new TimeIntervalObservable(this, scheduler);
    };
    var TimestampObservable = (function(__super__) {
      inherits(TimestampObservable, __super__);
      function TimestampObservable(source, s) {
        this.source = source;
        this._s = s;
        __super__.call(this);
      }
      TimestampObservable.prototype.subscribeCore = function(o) {
        return this.source.subscribe(new TimestampObserver(o, this._s));
      };
      return TimestampObservable;
    }(ObservableBase));
    var TimestampObserver = (function(__super__) {
      inherits(TimestampObserver, __super__);
      function TimestampObserver(o, s) {
        this._o = o;
        this._s = s;
        __super__.call(this);
      }
      TimestampObserver.prototype.next = function(x) {
        this._o.onNext({
          value: x,
          timestamp: this._s.now()
        });
      };
      TimestampObserver.prototype.error = function(e) {
        this._o.onError(e);
      };
      TimestampObserver.prototype.completed = function() {
        this._o.onCompleted();
      };
      return TimestampObserver;
    }(AbstractObserver));
    observableProto.timestamp = function(scheduler) {
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      return new TimestampObservable(this, scheduler);
    };
    function sampleObservable(source, sampler) {
      return new AnonymousObservable(function(o) {
        var atEnd = false,
            value,
            hasValue = false;
        function sampleSubscribe() {
          if (hasValue) {
            hasValue = false;
            o.onNext(value);
          }
          atEnd && o.onCompleted();
        }
        var sourceSubscription = new SingleAssignmentDisposable();
        sourceSubscription.setDisposable(source.subscribe(function(newValue) {
          hasValue = true;
          value = newValue;
        }, function(e) {
          o.onError(e);
        }, function() {
          atEnd = true;
          sourceSubscription.dispose();
        }));
        return new BinaryDisposable(sourceSubscription, sampler.subscribe(sampleSubscribe, function(e) {
          o.onError(e);
        }, sampleSubscribe));
      }, source);
    }
    observableProto.sample = observableProto.throttleLatest = function(intervalOrSampler, scheduler) {
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      return typeof intervalOrSampler === 'number' ? sampleObservable(this, observableinterval(intervalOrSampler, scheduler)) : sampleObservable(this, intervalOrSampler);
    };
    var TimeoutError = Rx.TimeoutError = function(message) {
      this.message = message || 'Timeout has occurred';
      this.name = 'TimeoutError';
      Error.call(this);
    };
    TimeoutError.prototype = Object.create(Error.prototype);
    function timeoutWithSelector(source, firstTimeout, timeoutDurationSelector, other) {
      if (isFunction(firstTimeout)) {
        other = timeoutDurationSelector;
        timeoutDurationSelector = firstTimeout;
        firstTimeout = observableNever();
      }
      other || (other = observableThrow(new TimeoutError()));
      return new AnonymousObservable(function(o) {
        var subscription = new SerialDisposable(),
            timer = new SerialDisposable(),
            original = new SingleAssignmentDisposable();
        subscription.setDisposable(original);
        var id = 0,
            switched = false;
        function setTimer(timeout) {
          var myId = id,
              d = new SingleAssignmentDisposable();
          function timerWins() {
            switched = (myId === id);
            return switched;
          }
          timer.setDisposable(d);
          d.setDisposable(timeout.subscribe(function() {
            timerWins() && subscription.setDisposable(other.subscribe(o));
            d.dispose();
          }, function(e) {
            timerWins() && o.onError(e);
          }, function() {
            timerWins() && subscription.setDisposable(other.subscribe(o));
          }));
        }
        ;
        setTimer(firstTimeout);
        function oWins() {
          var res = !switched;
          if (res) {
            id++;
          }
          return res;
        }
        original.setDisposable(source.subscribe(function(x) {
          if (oWins()) {
            o.onNext(x);
            var timeout = tryCatch(timeoutDurationSelector)(x);
            if (timeout === errorObj) {
              return o.onError(timeout.e);
            }
            setTimer(isPromise(timeout) ? observableFromPromise(timeout) : timeout);
          }
        }, function(e) {
          oWins() && o.onError(e);
        }, function() {
          oWins() && o.onCompleted();
        }));
        return new BinaryDisposable(subscription, timer);
      }, source);
    }
    function timeout(source, dueTime, other, scheduler) {
      if (isScheduler(other)) {
        scheduler = other;
        other = observableThrow(new TimeoutError());
      }
      if (other instanceof Error) {
        other = observableThrow(other);
      }
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      return new AnonymousObservable(function(o) {
        var id = 0,
            original = new SingleAssignmentDisposable(),
            subscription = new SerialDisposable(),
            switched = false,
            timer = new SerialDisposable();
        subscription.setDisposable(original);
        function createTimer() {
          var myId = id;
          timer.setDisposable(scheduler.scheduleFuture(null, dueTime, function() {
            switched = id === myId;
            if (switched) {
              isPromise(other) && (other = observableFromPromise(other));
              subscription.setDisposable(other.subscribe(o));
            }
          }));
        }
        createTimer();
        original.setDisposable(source.subscribe(function(x) {
          if (!switched) {
            id++;
            o.onNext(x);
            createTimer();
          }
        }, function(e) {
          if (!switched) {
            id++;
            o.onError(e);
          }
        }, function() {
          if (!switched) {
            id++;
            o.onCompleted();
          }
        }));
        return new BinaryDisposable(subscription, timer);
      }, source);
    }
    observableProto.timeout = function() {
      var firstArg = arguments[0];
      if (firstArg instanceof Date || typeof firstArg === 'number') {
        return timeout(this, firstArg, arguments[1], arguments[2]);
      } else if (Observable.isObservable(firstArg) || isFunction(firstArg)) {
        return timeoutWithSelector(this, firstArg, arguments[1], arguments[2]);
      } else {
        throw new Error('Invalid arguments');
      }
    };
    var GenerateAbsoluteObservable = (function(__super__) {
      inherits(GenerateAbsoluteObservable, __super__);
      function GenerateAbsoluteObservable(state, cndFn, itrFn, resFn, timeFn, s) {
        this._state = state;
        this._cndFn = cndFn;
        this._itrFn = itrFn;
        this._resFn = resFn;
        this._timeFn = timeFn;
        this._s = s;
        this._first = true;
        this._hasResult = false;
        __super__.call(this);
      }
      function scheduleRecursive(self, recurse) {
        self._hasResult && self._o.onNext(self._state);
        if (self._first) {
          self._first = false;
        } else {
          self._state = tryCatch(self._itrFn)(self._state);
          if (self._state === errorObj) {
            return self._o.onError(self._state.e);
          }
        }
        self._hasResult = tryCatch(self._cndFn)(self._state);
        if (self._hasResult === errorObj) {
          return self._o.onError(self._hasResult.e);
        }
        if (self._hasResult) {
          var result = tryCatch(self._resFn)(self._state);
          if (result === errorObj) {
            return self._o.onError(result.e);
          }
          var time = tryCatch(self._timeFn)(self._state);
          if (time === errorObj) {
            return self._o.onError(time.e);
          }
          recurse(self, time);
        } else {
          self._o.onCompleted();
        }
      }
      GenerateAbsoluteObservable.prototype.subscribeCore = function(o) {
        this._o = o;
        return this._s.scheduleRecursiveFuture(this, new Date(this._s.now()), scheduleRecursive);
      };
      return GenerateAbsoluteObservable;
    }(ObservableBase));
    Observable.generateWithAbsoluteTime = function(initialState, condition, iterate, resultSelector, timeSelector, scheduler) {
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      return new GenerateAbsoluteObservable(initialState, condition, iterate, resultSelector, timeSelector, scheduler);
    };
    var GenerateRelativeObservable = (function(__super__) {
      inherits(GenerateRelativeObservable, __super__);
      function GenerateRelativeObservable(state, cndFn, itrFn, resFn, timeFn, s) {
        this._state = state;
        this._cndFn = cndFn;
        this._itrFn = itrFn;
        this._resFn = resFn;
        this._timeFn = timeFn;
        this._s = s;
        this._first = true;
        this._hasResult = false;
        __super__.call(this);
      }
      function scheduleRecursive(self, recurse) {
        self._hasResult && self._o.onNext(self._state);
        if (self._first) {
          self._first = false;
        } else {
          self._state = tryCatch(self._itrFn)(self._state);
          if (self._state === errorObj) {
            return self._o.onError(self._state.e);
          }
        }
        self._hasResult = tryCatch(self._cndFn)(self._state);
        if (self._hasResult === errorObj) {
          return self._o.onError(self._hasResult.e);
        }
        if (self._hasResult) {
          var result = tryCatch(self._resFn)(self._state);
          if (result === errorObj) {
            return self._o.onError(result.e);
          }
          var time = tryCatch(self._timeFn)(self._state);
          if (time === errorObj) {
            return self._o.onError(time.e);
          }
          recurse(self, time);
        } else {
          self._o.onCompleted();
        }
      }
      GenerateRelativeObservable.prototype.subscribeCore = function(o) {
        this._o = o;
        return this._s.scheduleRecursiveFuture(this, 0, scheduleRecursive);
      };
      return GenerateRelativeObservable;
    }(ObservableBase));
    Observable.generateWithRelativeTime = function(initialState, condition, iterate, resultSelector, timeSelector, scheduler) {
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      return new GenerateRelativeObservable(initialState, condition, iterate, resultSelector, timeSelector, scheduler);
    };
    var DelaySubscription = (function(__super__) {
      inherits(DelaySubscription, __super__);
      function DelaySubscription(source, dt, s) {
        this.source = source;
        this._dt = dt;
        this._s = s;
        __super__.call(this);
      }
      DelaySubscription.prototype.subscribeCore = function(o) {
        var d = new SerialDisposable();
        d.setDisposable(this._s.scheduleFuture([this.source, o, d], this._dt, scheduleMethod));
        return d;
      };
      function scheduleMethod(s, state) {
        var source = state[0],
            o = state[1],
            d = state[2];
        d.setDisposable(source.subscribe(o));
      }
      return DelaySubscription;
    }(ObservableBase));
    observableProto.delaySubscription = function(dueTime, scheduler) {
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      return new DelaySubscription(this, dueTime, scheduler);
    };
    var SkipLastWithTimeObservable = (function(__super__) {
      inherits(SkipLastWithTimeObservable, __super__);
      function SkipLastWithTimeObservable(source, d, s) {
        this.source = source;
        this._d = d;
        this._s = s;
        __super__.call(this);
      }
      SkipLastWithTimeObservable.prototype.subscribeCore = function(o) {
        return this.source.subscribe(new SkipLastWithTimeObserver(o, this));
      };
      return SkipLastWithTimeObservable;
    }(ObservableBase));
    var SkipLastWithTimeObserver = (function(__super__) {
      inherits(SkipLastWithTimeObserver, __super__);
      function SkipLastWithTimeObserver(o, p) {
        this._o = o;
        this._s = p._s;
        this._d = p._d;
        this._q = [];
        __super__.call(this);
      }
      SkipLastWithTimeObserver.prototype.next = function(x) {
        var now = this._s.now();
        this._q.push({
          interval: now,
          value: x
        });
        while (this._q.length > 0 && now - this._q[0].interval >= this._d) {
          this._o.onNext(this._q.shift().value);
        }
      };
      SkipLastWithTimeObserver.prototype.error = function(e) {
        this._o.onError(e);
      };
      SkipLastWithTimeObserver.prototype.completed = function() {
        var now = this._s.now();
        while (this._q.length > 0 && now - this._q[0].interval >= this._d) {
          this._o.onNext(this._q.shift().value);
        }
        this._o.onCompleted();
      };
      return SkipLastWithTimeObserver;
    }(AbstractObserver));
    observableProto.skipLastWithTime = function(duration, scheduler) {
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      return new SkipLastWithTimeObservable(this, duration, scheduler);
    };
    var TakeLastWithTimeObservable = (function(__super__) {
      inherits(TakeLastWithTimeObservable, __super__);
      function TakeLastWithTimeObservable(source, d, s) {
        this.source = source;
        this._d = d;
        this._s = s;
        __super__.call(this);
      }
      TakeLastWithTimeObservable.prototype.subscribeCore = function(o) {
        return this.source.subscribe(new TakeLastWithTimeObserver(o, this._d, this._s));
      };
      return TakeLastWithTimeObservable;
    }(ObservableBase));
    var TakeLastWithTimeObserver = (function(__super__) {
      inherits(TakeLastWithTimeObserver, __super__);
      function TakeLastWithTimeObserver(o, d, s) {
        this._o = o;
        this._d = d;
        this._s = s;
        this._q = [];
        __super__.call(this);
      }
      TakeLastWithTimeObserver.prototype.next = function(x) {
        var now = this._s.now();
        this._q.push({
          interval: now,
          value: x
        });
        while (this._q.length > 0 && now - this._q[0].interval >= this._d) {
          this._q.shift();
        }
      };
      TakeLastWithTimeObserver.prototype.error = function(e) {
        this._o.onError(e);
      };
      TakeLastWithTimeObserver.prototype.completed = function() {
        var now = this._s.now();
        while (this._q.length > 0) {
          var next = this._q.shift();
          if (now - next.interval <= this._d) {
            this._o.onNext(next.value);
          }
        }
        this._o.onCompleted();
      };
      return TakeLastWithTimeObserver;
    }(AbstractObserver));
    observableProto.takeLastWithTime = function(duration, scheduler) {
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      return new TakeLastWithTimeObservable(this, duration, scheduler);
    };
    observableProto.takeLastBufferWithTime = function(duration, scheduler) {
      var source = this;
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      return new AnonymousObservable(function(o) {
        var q = [];
        return source.subscribe(function(x) {
          var now = scheduler.now();
          q.push({
            interval: now,
            value: x
          });
          while (q.length > 0 && now - q[0].interval >= duration) {
            q.shift();
          }
        }, function(e) {
          o.onError(e);
        }, function() {
          var now = scheduler.now(),
              res = [];
          while (q.length > 0) {
            var next = q.shift();
            now - next.interval <= duration && res.push(next.value);
          }
          o.onNext(res);
          o.onCompleted();
        });
      }, source);
    };
    var TakeWithTimeObservable = (function(__super__) {
      inherits(TakeWithTimeObservable, __super__);
      function TakeWithTimeObservable(source, d, s) {
        this.source = source;
        this._d = d;
        this._s = s;
        __super__.call(this);
      }
      function scheduleMethod(s, o) {
        o.onCompleted();
      }
      TakeWithTimeObservable.prototype.subscribeCore = function(o) {
        return new BinaryDisposable(this._s.scheduleFuture(o, this._d, scheduleMethod), this.source.subscribe(o));
      };
      return TakeWithTimeObservable;
    }(ObservableBase));
    observableProto.takeWithTime = function(duration, scheduler) {
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      return new TakeWithTimeObservable(this, duration, scheduler);
    };
    var SkipWithTimeObservable = (function(__super__) {
      inherits(SkipWithTimeObservable, __super__);
      function SkipWithTimeObservable(source, d, s) {
        this.source = source;
        this._d = d;
        this._s = s;
        this._open = false;
        __super__.call(this);
      }
      function scheduleMethod(s, self) {
        self._open = true;
      }
      SkipWithTimeObservable.prototype.subscribeCore = function(o) {
        return new BinaryDisposable(this._s.scheduleFuture(this, this._d, scheduleMethod), this.source.subscribe(new SkipWithTimeObserver(o, this)));
      };
      return SkipWithTimeObservable;
    }(ObservableBase));
    var SkipWithTimeObserver = (function(__super__) {
      inherits(SkipWithTimeObserver, __super__);
      function SkipWithTimeObserver(o, p) {
        this._o = o;
        this._p = p;
        __super__.call(this);
      }
      SkipWithTimeObserver.prototype.next = function(x) {
        this._p._open && this._o.onNext(x);
      };
      SkipWithTimeObserver.prototype.error = function(e) {
        this._o.onError(e);
      };
      SkipWithTimeObserver.prototype.completed = function() {
        this._o.onCompleted();
      };
      return SkipWithTimeObserver;
    }(AbstractObserver));
    observableProto.skipWithTime = function(duration, scheduler) {
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      return new SkipWithTimeObservable(this, duration, scheduler);
    };
    var SkipUntilWithTimeObservable = (function(__super__) {
      inherits(SkipUntilWithTimeObservable, __super__);
      function SkipUntilWithTimeObservable(source, startTime, scheduler) {
        this.source = source;
        this._st = startTime;
        this._s = scheduler;
        __super__.call(this);
      }
      function scheduleMethod(s, state) {
        state._open = true;
      }
      SkipUntilWithTimeObservable.prototype.subscribeCore = function(o) {
        this._open = false;
        return new BinaryDisposable(this._s.scheduleFuture(this, this._st, scheduleMethod), this.source.subscribe(new SkipUntilWithTimeObserver(o, this)));
      };
      return SkipUntilWithTimeObservable;
    }(ObservableBase));
    var SkipUntilWithTimeObserver = (function(__super__) {
      inherits(SkipUntilWithTimeObserver, __super__);
      function SkipUntilWithTimeObserver(o, p) {
        this._o = o;
        this._p = p;
        __super__.call(this);
      }
      SkipUntilWithTimeObserver.prototype.next = function(x) {
        this._p._open && this._o.onNext(x);
      };
      SkipUntilWithTimeObserver.prototype.error = function(e) {
        this._o.onError(e);
      };
      SkipUntilWithTimeObserver.prototype.completed = function() {
        this._o.onCompleted();
      };
      return SkipUntilWithTimeObserver;
    }(AbstractObserver));
    observableProto.skipUntilWithTime = function(startTime, scheduler) {
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      return new SkipUntilWithTimeObservable(this, startTime, scheduler);
    };
    observableProto.takeUntilWithTime = function(endTime, scheduler) {
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      var source = this;
      return new AnonymousObservable(function(o) {
        return new BinaryDisposable(scheduler.scheduleFuture(o, endTime, function(_, o) {
          o.onCompleted();
        }), source.subscribe(o));
      }, source);
    };
    observableProto.throttle = function(windowDuration, scheduler) {
      isScheduler(scheduler) || (scheduler = defaultScheduler);
      var duration = +windowDuration || 0;
      if (duration <= 0) {
        throw new RangeError('windowDuration cannot be less or equal zero.');
      }
      var source = this;
      return new AnonymousObservable(function(o) {
        var lastOnNext = 0;
        return source.subscribe(function(x) {
          var now = scheduler.now();
          if (lastOnNext === 0 || now - lastOnNext >= duration) {
            lastOnNext = now;
            o.onNext(x);
          }
        }, function(e) {
          o.onError(e);
        }, function() {
          o.onCompleted();
        });
      }, source);
    };
    return Rx;
  }));
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("12", ["6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "10", "11"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var Rx = req('6');
  req('7');
  req('8');
  req('9');
  req('a');
  req('b');
  req('c');
  req('d');
  req('e');
  req('f');
  req('10');
  req('11');
  module.exports = Rx;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("13", ["12"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('12');
  global.define = __define;
  return module.exports;
});

(function() {
var _removeDefine = $__System.get("@@amd-helpers").createDefine();
(function(global, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = global.document ? factory(global, true) : function(w) {
      if (!w.document) {
        throw new Error("jQuery requires a window with a document");
      }
      return factory(w);
    };
  } else {
    factory(global);
  }
}(typeof window !== "undefined" ? window : this, function(window, noGlobal) {
  var arr = [];
  var slice = arr.slice;
  var concat = arr.concat;
  var push = arr.push;
  var indexOf = arr.indexOf;
  var class2type = {};
  var toString = class2type.toString;
  var hasOwn = class2type.hasOwnProperty;
  var support = {};
  var document = window.document,
      version = "2.1.4",
      jQuery = function(selector, context) {
        return new jQuery.fn.init(selector, context);
      },
      rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,
      rmsPrefix = /^-ms-/,
      rdashAlpha = /-([\da-z])/gi,
      fcamelCase = function(all, letter) {
        return letter.toUpperCase();
      };
  jQuery.fn = jQuery.prototype = {
    jquery: version,
    constructor: jQuery,
    selector: "",
    length: 0,
    toArray: function() {
      return slice.call(this);
    },
    get: function(num) {
      return num != null ? (num < 0 ? this[num + this.length] : this[num]) : slice.call(this);
    },
    pushStack: function(elems) {
      var ret = jQuery.merge(this.constructor(), elems);
      ret.prevObject = this;
      ret.context = this.context;
      return ret;
    },
    each: function(callback, args) {
      return jQuery.each(this, callback, args);
    },
    map: function(callback) {
      return this.pushStack(jQuery.map(this, function(elem, i) {
        return callback.call(elem, i, elem);
      }));
    },
    slice: function() {
      return this.pushStack(slice.apply(this, arguments));
    },
    first: function() {
      return this.eq(0);
    },
    last: function() {
      return this.eq(-1);
    },
    eq: function(i) {
      var len = this.length,
          j = +i + (i < 0 ? len : 0);
      return this.pushStack(j >= 0 && j < len ? [this[j]] : []);
    },
    end: function() {
      return this.prevObject || this.constructor(null);
    },
    push: push,
    sort: arr.sort,
    splice: arr.splice
  };
  jQuery.extend = jQuery.fn.extend = function() {
    var options,
        name,
        src,
        copy,
        copyIsArray,
        clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;
    if (typeof target === "boolean") {
      deep = target;
      target = arguments[i] || {};
      i++;
    }
    if (typeof target !== "object" && !jQuery.isFunction(target)) {
      target = {};
    }
    if (i === length) {
      target = this;
      i--;
    }
    for (; i < length; i++) {
      if ((options = arguments[i]) != null) {
        for (name in options) {
          src = target[name];
          copy = options[name];
          if (target === copy) {
            continue;
          }
          if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)))) {
            if (copyIsArray) {
              copyIsArray = false;
              clone = src && jQuery.isArray(src) ? src : [];
            } else {
              clone = src && jQuery.isPlainObject(src) ? src : {};
            }
            target[name] = jQuery.extend(deep, clone, copy);
          } else if (copy !== undefined) {
            target[name] = copy;
          }
        }
      }
    }
    return target;
  };
  jQuery.extend({
    expando: "jQuery" + (version + Math.random()).replace(/\D/g, ""),
    isReady: true,
    error: function(msg) {
      throw new Error(msg);
    },
    noop: function() {},
    isFunction: function(obj) {
      return jQuery.type(obj) === "function";
    },
    isArray: Array.isArray,
    isWindow: function(obj) {
      return obj != null && obj === obj.window;
    },
    isNumeric: function(obj) {
      return !jQuery.isArray(obj) && (obj - parseFloat(obj) + 1) >= 0;
    },
    isPlainObject: function(obj) {
      if (jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow(obj)) {
        return false;
      }
      if (obj.constructor && !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
        return false;
      }
      return true;
    },
    isEmptyObject: function(obj) {
      var name;
      for (name in obj) {
        return false;
      }
      return true;
    },
    type: function(obj) {
      if (obj == null) {
        return obj + "";
      }
      return typeof obj === "object" || typeof obj === "function" ? class2type[toString.call(obj)] || "object" : typeof obj;
    },
    globalEval: function(code) {
      var script,
          indirect = eval;
      code = jQuery.trim(code);
      if (code) {
        if (code.indexOf("use strict") === 1) {
          script = document.createElement("script");
          script.text = code;
          document.head.appendChild(script).parentNode.removeChild(script);
        } else {
          indirect(code);
        }
      }
    },
    camelCase: function(string) {
      return string.replace(rmsPrefix, "ms-").replace(rdashAlpha, fcamelCase);
    },
    nodeName: function(elem, name) {
      return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
    },
    each: function(obj, callback, args) {
      var value,
          i = 0,
          length = obj.length,
          isArray = isArraylike(obj);
      if (args) {
        if (isArray) {
          for (; i < length; i++) {
            value = callback.apply(obj[i], args);
            if (value === false) {
              break;
            }
          }
        } else {
          for (i in obj) {
            value = callback.apply(obj[i], args);
            if (value === false) {
              break;
            }
          }
        }
      } else {
        if (isArray) {
          for (; i < length; i++) {
            value = callback.call(obj[i], i, obj[i]);
            if (value === false) {
              break;
            }
          }
        } else {
          for (i in obj) {
            value = callback.call(obj[i], i, obj[i]);
            if (value === false) {
              break;
            }
          }
        }
      }
      return obj;
    },
    trim: function(text) {
      return text == null ? "" : (text + "").replace(rtrim, "");
    },
    makeArray: function(arr, results) {
      var ret = results || [];
      if (arr != null) {
        if (isArraylike(Object(arr))) {
          jQuery.merge(ret, typeof arr === "string" ? [arr] : arr);
        } else {
          push.call(ret, arr);
        }
      }
      return ret;
    },
    inArray: function(elem, arr, i) {
      return arr == null ? -1 : indexOf.call(arr, elem, i);
    },
    merge: function(first, second) {
      var len = +second.length,
          j = 0,
          i = first.length;
      for (; j < len; j++) {
        first[i++] = second[j];
      }
      first.length = i;
      return first;
    },
    grep: function(elems, callback, invert) {
      var callbackInverse,
          matches = [],
          i = 0,
          length = elems.length,
          callbackExpect = !invert;
      for (; i < length; i++) {
        callbackInverse = !callback(elems[i], i);
        if (callbackInverse !== callbackExpect) {
          matches.push(elems[i]);
        }
      }
      return matches;
    },
    map: function(elems, callback, arg) {
      var value,
          i = 0,
          length = elems.length,
          isArray = isArraylike(elems),
          ret = [];
      if (isArray) {
        for (; i < length; i++) {
          value = callback(elems[i], i, arg);
          if (value != null) {
            ret.push(value);
          }
        }
      } else {
        for (i in elems) {
          value = callback(elems[i], i, arg);
          if (value != null) {
            ret.push(value);
          }
        }
      }
      return concat.apply([], ret);
    },
    guid: 1,
    proxy: function(fn, context) {
      var tmp,
          args,
          proxy;
      if (typeof context === "string") {
        tmp = fn[context];
        context = fn;
        fn = tmp;
      }
      if (!jQuery.isFunction(fn)) {
        return undefined;
      }
      args = slice.call(arguments, 2);
      proxy = function() {
        return fn.apply(context || this, args.concat(slice.call(arguments)));
      };
      proxy.guid = fn.guid = fn.guid || jQuery.guid++;
      return proxy;
    },
    now: Date.now,
    support: support
  });
  jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
    class2type["[object " + name + "]"] = name.toLowerCase();
  });
  function isArraylike(obj) {
    var length = "length" in obj && obj.length,
        type = jQuery.type(obj);
    if (type === "function" || jQuery.isWindow(obj)) {
      return false;
    }
    if (obj.nodeType === 1 && length) {
      return true;
    }
    return type === "array" || length === 0 || typeof length === "number" && length > 0 && (length - 1) in obj;
  }
  var Sizzle = (function(window) {
    var i,
        support,
        Expr,
        getText,
        isXML,
        tokenize,
        compile,
        select,
        outermostContext,
        sortInput,
        hasDuplicate,
        setDocument,
        document,
        docElem,
        documentIsHTML,
        rbuggyQSA,
        rbuggyMatches,
        matches,
        contains,
        expando = "sizzle" + 1 * new Date(),
        preferredDoc = window.document,
        dirruns = 0,
        done = 0,
        classCache = createCache(),
        tokenCache = createCache(),
        compilerCache = createCache(),
        sortOrder = function(a, b) {
          if (a === b) {
            hasDuplicate = true;
          }
          return 0;
        },
        MAX_NEGATIVE = 1 << 31,
        hasOwn = ({}).hasOwnProperty,
        arr = [],
        pop = arr.pop,
        push_native = arr.push,
        push = arr.push,
        slice = arr.slice,
        indexOf = function(list, elem) {
          var i = 0,
              len = list.length;
          for (; i < len; i++) {
            if (list[i] === elem) {
              return i;
            }
          }
          return -1;
        },
        booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",
        whitespace = "[\\x20\\t\\r\\n\\f]",
        characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",
        identifier = characterEncoding.replace("w", "w#"),
        attributes = "\\[" + whitespace + "*(" + characterEncoding + ")(?:" + whitespace + "*([*^$|!~]?=)" + whitespace + "*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace + "*\\]",
        pseudos = ":(" + characterEncoding + ")(?:\\((" + "('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" + "((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" + ".*" + ")\\)|)",
        rwhitespace = new RegExp(whitespace + "+", "g"),
        rtrim = new RegExp("^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g"),
        rcomma = new RegExp("^" + whitespace + "*," + whitespace + "*"),
        rcombinators = new RegExp("^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*"),
        rattributeQuotes = new RegExp("=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g"),
        rpseudo = new RegExp(pseudos),
        ridentifier = new RegExp("^" + identifier + "$"),
        matchExpr = {
          "ID": new RegExp("^#(" + characterEncoding + ")"),
          "CLASS": new RegExp("^\\.(" + characterEncoding + ")"),
          "TAG": new RegExp("^(" + characterEncoding.replace("w", "w*") + ")"),
          "ATTR": new RegExp("^" + attributes),
          "PSEUDO": new RegExp("^" + pseudos),
          "CHILD": new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace + "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace + "*(\\d+)|))" + whitespace + "*\\)|)", "i"),
          "bool": new RegExp("^(?:" + booleans + ")$", "i"),
          "needsContext": new RegExp("^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i")
        },
        rinputs = /^(?:input|select|textarea|button)$/i,
        rheader = /^h\d$/i,
        rnative = /^[^{]+\{\s*\[native \w/,
        rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,
        rsibling = /[+~]/,
        rescape = /'|\\/g,
        runescape = new RegExp("\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig"),
        funescape = function(_, escaped, escapedWhitespace) {
          var high = "0x" + escaped - 0x10000;
          return high !== high || escapedWhitespace ? escaped : high < 0 ? String.fromCharCode(high + 0x10000) : String.fromCharCode(high >> 10 | 0xD800, high & 0x3FF | 0xDC00);
        },
        unloadHandler = function() {
          setDocument();
        };
    try {
      push.apply((arr = slice.call(preferredDoc.childNodes)), preferredDoc.childNodes);
      arr[preferredDoc.childNodes.length].nodeType;
    } catch (e) {
      push = {apply: arr.length ? function(target, els) {
          push_native.apply(target, slice.call(els));
        } : function(target, els) {
          var j = target.length,
              i = 0;
          while ((target[j++] = els[i++])) {}
          target.length = j - 1;
        }};
    }
    function Sizzle(selector, context, results, seed) {
      var match,
          elem,
          m,
          nodeType,
          i,
          groups,
          old,
          nid,
          newContext,
          newSelector;
      if ((context ? context.ownerDocument || context : preferredDoc) !== document) {
        setDocument(context);
      }
      context = context || document;
      results = results || [];
      nodeType = context.nodeType;
      if (typeof selector !== "string" || !selector || nodeType !== 1 && nodeType !== 9 && nodeType !== 11) {
        return results;
      }
      if (!seed && documentIsHTML) {
        if (nodeType !== 11 && (match = rquickExpr.exec(selector))) {
          if ((m = match[1])) {
            if (nodeType === 9) {
              elem = context.getElementById(m);
              if (elem && elem.parentNode) {
                if (elem.id === m) {
                  results.push(elem);
                  return results;
                }
              } else {
                return results;
              }
            } else {
              if (context.ownerDocument && (elem = context.ownerDocument.getElementById(m)) && contains(context, elem) && elem.id === m) {
                results.push(elem);
                return results;
              }
            }
          } else if (match[2]) {
            push.apply(results, context.getElementsByTagName(selector));
            return results;
          } else if ((m = match[3]) && support.getElementsByClassName) {
            push.apply(results, context.getElementsByClassName(m));
            return results;
          }
        }
        if (support.qsa && (!rbuggyQSA || !rbuggyQSA.test(selector))) {
          nid = old = expando;
          newContext = context;
          newSelector = nodeType !== 1 && selector;
          if (nodeType === 1 && context.nodeName.toLowerCase() !== "object") {
            groups = tokenize(selector);
            if ((old = context.getAttribute("id"))) {
              nid = old.replace(rescape, "\\$&");
            } else {
              context.setAttribute("id", nid);
            }
            nid = "[id='" + nid + "'] ";
            i = groups.length;
            while (i--) {
              groups[i] = nid + toSelector(groups[i]);
            }
            newContext = rsibling.test(selector) && testContext(context.parentNode) || context;
            newSelector = groups.join(",");
          }
          if (newSelector) {
            try {
              push.apply(results, newContext.querySelectorAll(newSelector));
              return results;
            } catch (qsaError) {} finally {
              if (!old) {
                context.removeAttribute("id");
              }
            }
          }
        }
      }
      return select(selector.replace(rtrim, "$1"), context, results, seed);
    }
    function createCache() {
      var keys = [];
      function cache(key, value) {
        if (keys.push(key + " ") > Expr.cacheLength) {
          delete cache[keys.shift()];
        }
        return (cache[key + " "] = value);
      }
      return cache;
    }
    function markFunction(fn) {
      fn[expando] = true;
      return fn;
    }
    function assert(fn) {
      var div = document.createElement("div");
      try {
        return !!fn(div);
      } catch (e) {
        return false;
      } finally {
        if (div.parentNode) {
          div.parentNode.removeChild(div);
        }
        div = null;
      }
    }
    function addHandle(attrs, handler) {
      var arr = attrs.split("|"),
          i = attrs.length;
      while (i--) {
        Expr.attrHandle[arr[i]] = handler;
      }
    }
    function siblingCheck(a, b) {
      var cur = b && a,
          diff = cur && a.nodeType === 1 && b.nodeType === 1 && (~b.sourceIndex || MAX_NEGATIVE) - (~a.sourceIndex || MAX_NEGATIVE);
      if (diff) {
        return diff;
      }
      if (cur) {
        while ((cur = cur.nextSibling)) {
          if (cur === b) {
            return -1;
          }
        }
      }
      return a ? 1 : -1;
    }
    function createInputPseudo(type) {
      return function(elem) {
        var name = elem.nodeName.toLowerCase();
        return name === "input" && elem.type === type;
      };
    }
    function createButtonPseudo(type) {
      return function(elem) {
        var name = elem.nodeName.toLowerCase();
        return (name === "input" || name === "button") && elem.type === type;
      };
    }
    function createPositionalPseudo(fn) {
      return markFunction(function(argument) {
        argument = +argument;
        return markFunction(function(seed, matches) {
          var j,
              matchIndexes = fn([], seed.length, argument),
              i = matchIndexes.length;
          while (i--) {
            if (seed[(j = matchIndexes[i])]) {
              seed[j] = !(matches[j] = seed[j]);
            }
          }
        });
      });
    }
    function testContext(context) {
      return context && typeof context.getElementsByTagName !== "undefined" && context;
    }
    support = Sizzle.support = {};
    isXML = Sizzle.isXML = function(elem) {
      var documentElement = elem && (elem.ownerDocument || elem).documentElement;
      return documentElement ? documentElement.nodeName !== "HTML" : false;
    };
    setDocument = Sizzle.setDocument = function(node) {
      var hasCompare,
          parent,
          doc = node ? node.ownerDocument || node : preferredDoc;
      if (doc === document || doc.nodeType !== 9 || !doc.documentElement) {
        return document;
      }
      document = doc;
      docElem = doc.documentElement;
      parent = doc.defaultView;
      if (parent && parent !== parent.top) {
        if (parent.addEventListener) {
          parent.addEventListener("unload", unloadHandler, false);
        } else if (parent.attachEvent) {
          parent.attachEvent("onunload", unloadHandler);
        }
      }
      documentIsHTML = !isXML(doc);
      support.attributes = assert(function(div) {
        div.className = "i";
        return !div.getAttribute("className");
      });
      support.getElementsByTagName = assert(function(div) {
        div.appendChild(doc.createComment(""));
        return !div.getElementsByTagName("*").length;
      });
      support.getElementsByClassName = rnative.test(doc.getElementsByClassName);
      support.getById = assert(function(div) {
        docElem.appendChild(div).id = expando;
        return !doc.getElementsByName || !doc.getElementsByName(expando).length;
      });
      if (support.getById) {
        Expr.find["ID"] = function(id, context) {
          if (typeof context.getElementById !== "undefined" && documentIsHTML) {
            var m = context.getElementById(id);
            return m && m.parentNode ? [m] : [];
          }
        };
        Expr.filter["ID"] = function(id) {
          var attrId = id.replace(runescape, funescape);
          return function(elem) {
            return elem.getAttribute("id") === attrId;
          };
        };
      } else {
        delete Expr.find["ID"];
        Expr.filter["ID"] = function(id) {
          var attrId = id.replace(runescape, funescape);
          return function(elem) {
            var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
            return node && node.value === attrId;
          };
        };
      }
      Expr.find["TAG"] = support.getElementsByTagName ? function(tag, context) {
        if (typeof context.getElementsByTagName !== "undefined") {
          return context.getElementsByTagName(tag);
        } else if (support.qsa) {
          return context.querySelectorAll(tag);
        }
      } : function(tag, context) {
        var elem,
            tmp = [],
            i = 0,
            results = context.getElementsByTagName(tag);
        if (tag === "*") {
          while ((elem = results[i++])) {
            if (elem.nodeType === 1) {
              tmp.push(elem);
            }
          }
          return tmp;
        }
        return results;
      };
      Expr.find["CLASS"] = support.getElementsByClassName && function(className, context) {
        if (documentIsHTML) {
          return context.getElementsByClassName(className);
        }
      };
      rbuggyMatches = [];
      rbuggyQSA = [];
      if ((support.qsa = rnative.test(doc.querySelectorAll))) {
        assert(function(div) {
          docElem.appendChild(div).innerHTML = "<a id='" + expando + "'></a>" + "<select id='" + expando + "-\f]' msallowcapture=''>" + "<option selected=''></option></select>";
          if (div.querySelectorAll("[msallowcapture^='']").length) {
            rbuggyQSA.push("[*^$]=" + whitespace + "*(?:''|\"\")");
          }
          if (!div.querySelectorAll("[selected]").length) {
            rbuggyQSA.push("\\[" + whitespace + "*(?:value|" + booleans + ")");
          }
          if (!div.querySelectorAll("[id~=" + expando + "-]").length) {
            rbuggyQSA.push("~=");
          }
          if (!div.querySelectorAll(":checked").length) {
            rbuggyQSA.push(":checked");
          }
          if (!div.querySelectorAll("a#" + expando + "+*").length) {
            rbuggyQSA.push(".#.+[+~]");
          }
        });
        assert(function(div) {
          var input = doc.createElement("input");
          input.setAttribute("type", "hidden");
          div.appendChild(input).setAttribute("name", "D");
          if (div.querySelectorAll("[name=d]").length) {
            rbuggyQSA.push("name" + whitespace + "*[*^$|!~]?=");
          }
          if (!div.querySelectorAll(":enabled").length) {
            rbuggyQSA.push(":enabled", ":disabled");
          }
          div.querySelectorAll("*,:x");
          rbuggyQSA.push(",.*:");
        });
      }
      if ((support.matchesSelector = rnative.test((matches = docElem.matches || docElem.webkitMatchesSelector || docElem.mozMatchesSelector || docElem.oMatchesSelector || docElem.msMatchesSelector)))) {
        assert(function(div) {
          support.disconnectedMatch = matches.call(div, "div");
          matches.call(div, "[s!='']:x");
          rbuggyMatches.push("!=", pseudos);
        });
      }
      rbuggyQSA = rbuggyQSA.length && new RegExp(rbuggyQSA.join("|"));
      rbuggyMatches = rbuggyMatches.length && new RegExp(rbuggyMatches.join("|"));
      hasCompare = rnative.test(docElem.compareDocumentPosition);
      contains = hasCompare || rnative.test(docElem.contains) ? function(a, b) {
        var adown = a.nodeType === 9 ? a.documentElement : a,
            bup = b && b.parentNode;
        return a === bup || !!(bup && bup.nodeType === 1 && (adown.contains ? adown.contains(bup) : a.compareDocumentPosition && a.compareDocumentPosition(bup) & 16));
      } : function(a, b) {
        if (b) {
          while ((b = b.parentNode)) {
            if (b === a) {
              return true;
            }
          }
        }
        return false;
      };
      sortOrder = hasCompare ? function(a, b) {
        if (a === b) {
          hasDuplicate = true;
          return 0;
        }
        var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
        if (compare) {
          return compare;
        }
        compare = (a.ownerDocument || a) === (b.ownerDocument || b) ? a.compareDocumentPosition(b) : 1;
        if (compare & 1 || (!support.sortDetached && b.compareDocumentPosition(a) === compare)) {
          if (a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a)) {
            return -1;
          }
          if (b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b)) {
            return 1;
          }
          return sortInput ? (indexOf(sortInput, a) - indexOf(sortInput, b)) : 0;
        }
        return compare & 4 ? -1 : 1;
      } : function(a, b) {
        if (a === b) {
          hasDuplicate = true;
          return 0;
        }
        var cur,
            i = 0,
            aup = a.parentNode,
            bup = b.parentNode,
            ap = [a],
            bp = [b];
        if (!aup || !bup) {
          return a === doc ? -1 : b === doc ? 1 : aup ? -1 : bup ? 1 : sortInput ? (indexOf(sortInput, a) - indexOf(sortInput, b)) : 0;
        } else if (aup === bup) {
          return siblingCheck(a, b);
        }
        cur = a;
        while ((cur = cur.parentNode)) {
          ap.unshift(cur);
        }
        cur = b;
        while ((cur = cur.parentNode)) {
          bp.unshift(cur);
        }
        while (ap[i] === bp[i]) {
          i++;
        }
        return i ? siblingCheck(ap[i], bp[i]) : ap[i] === preferredDoc ? -1 : bp[i] === preferredDoc ? 1 : 0;
      };
      return doc;
    };
    Sizzle.matches = function(expr, elements) {
      return Sizzle(expr, null, null, elements);
    };
    Sizzle.matchesSelector = function(elem, expr) {
      if ((elem.ownerDocument || elem) !== document) {
        setDocument(elem);
      }
      expr = expr.replace(rattributeQuotes, "='$1']");
      if (support.matchesSelector && documentIsHTML && (!rbuggyMatches || !rbuggyMatches.test(expr)) && (!rbuggyQSA || !rbuggyQSA.test(expr))) {
        try {
          var ret = matches.call(elem, expr);
          if (ret || support.disconnectedMatch || elem.document && elem.document.nodeType !== 11) {
            return ret;
          }
        } catch (e) {}
      }
      return Sizzle(expr, document, null, [elem]).length > 0;
    };
    Sizzle.contains = function(context, elem) {
      if ((context.ownerDocument || context) !== document) {
        setDocument(context);
      }
      return contains(context, elem);
    };
    Sizzle.attr = function(elem, name) {
      if ((elem.ownerDocument || elem) !== document) {
        setDocument(elem);
      }
      var fn = Expr.attrHandle[name.toLowerCase()],
          val = fn && hasOwn.call(Expr.attrHandle, name.toLowerCase()) ? fn(elem, name, !documentIsHTML) : undefined;
      return val !== undefined ? val : support.attributes || !documentIsHTML ? elem.getAttribute(name) : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
    };
    Sizzle.error = function(msg) {
      throw new Error("Syntax error, unrecognized expression: " + msg);
    };
    Sizzle.uniqueSort = function(results) {
      var elem,
          duplicates = [],
          j = 0,
          i = 0;
      hasDuplicate = !support.detectDuplicates;
      sortInput = !support.sortStable && results.slice(0);
      results.sort(sortOrder);
      if (hasDuplicate) {
        while ((elem = results[i++])) {
          if (elem === results[i]) {
            j = duplicates.push(i);
          }
        }
        while (j--) {
          results.splice(duplicates[j], 1);
        }
      }
      sortInput = null;
      return results;
    };
    getText = Sizzle.getText = function(elem) {
      var node,
          ret = "",
          i = 0,
          nodeType = elem.nodeType;
      if (!nodeType) {
        while ((node = elem[i++])) {
          ret += getText(node);
        }
      } else if (nodeType === 1 || nodeType === 9 || nodeType === 11) {
        if (typeof elem.textContent === "string") {
          return elem.textContent;
        } else {
          for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
            ret += getText(elem);
          }
        }
      } else if (nodeType === 3 || nodeType === 4) {
        return elem.nodeValue;
      }
      return ret;
    };
    Expr = Sizzle.selectors = {
      cacheLength: 50,
      createPseudo: markFunction,
      match: matchExpr,
      attrHandle: {},
      find: {},
      relative: {
        ">": {
          dir: "parentNode",
          first: true
        },
        " ": {dir: "parentNode"},
        "+": {
          dir: "previousSibling",
          first: true
        },
        "~": {dir: "previousSibling"}
      },
      preFilter: {
        "ATTR": function(match) {
          match[1] = match[1].replace(runescape, funescape);
          match[3] = (match[3] || match[4] || match[5] || "").replace(runescape, funescape);
          if (match[2] === "~=") {
            match[3] = " " + match[3] + " ";
          }
          return match.slice(0, 4);
        },
        "CHILD": function(match) {
          match[1] = match[1].toLowerCase();
          if (match[1].slice(0, 3) === "nth") {
            if (!match[3]) {
              Sizzle.error(match[0]);
            }
            match[4] = +(match[4] ? match[5] + (match[6] || 1) : 2 * (match[3] === "even" || match[3] === "odd"));
            match[5] = +((match[7] + match[8]) || match[3] === "odd");
          } else if (match[3]) {
            Sizzle.error(match[0]);
          }
          return match;
        },
        "PSEUDO": function(match) {
          var excess,
              unquoted = !match[6] && match[2];
          if (matchExpr["CHILD"].test(match[0])) {
            return null;
          }
          if (match[3]) {
            match[2] = match[4] || match[5] || "";
          } else if (unquoted && rpseudo.test(unquoted) && (excess = tokenize(unquoted, true)) && (excess = unquoted.indexOf(")", unquoted.length - excess) - unquoted.length)) {
            match[0] = match[0].slice(0, excess);
            match[2] = unquoted.slice(0, excess);
          }
          return match.slice(0, 3);
        }
      },
      filter: {
        "TAG": function(nodeNameSelector) {
          var nodeName = nodeNameSelector.replace(runescape, funescape).toLowerCase();
          return nodeNameSelector === "*" ? function() {
            return true;
          } : function(elem) {
            return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
          };
        },
        "CLASS": function(className) {
          var pattern = classCache[className + " "];
          return pattern || (pattern = new RegExp("(^|" + whitespace + ")" + className + "(" + whitespace + "|$)")) && classCache(className, function(elem) {
            return pattern.test(typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "");
          });
        },
        "ATTR": function(name, operator, check) {
          return function(elem) {
            var result = Sizzle.attr(elem, name);
            if (result == null) {
              return operator === "!=";
            }
            if (!operator) {
              return true;
            }
            result += "";
            return operator === "=" ? result === check : operator === "!=" ? result !== check : operator === "^=" ? check && result.indexOf(check) === 0 : operator === "*=" ? check && result.indexOf(check) > -1 : operator === "$=" ? check && result.slice(-check.length) === check : operator === "~=" ? (" " + result.replace(rwhitespace, " ") + " ").indexOf(check) > -1 : operator === "|=" ? result === check || result.slice(0, check.length + 1) === check + "-" : false;
          };
        },
        "CHILD": function(type, what, argument, first, last) {
          var simple = type.slice(0, 3) !== "nth",
              forward = type.slice(-4) !== "last",
              ofType = what === "of-type";
          return first === 1 && last === 0 ? function(elem) {
            return !!elem.parentNode;
          } : function(elem, context, xml) {
            var cache,
                outerCache,
                node,
                diff,
                nodeIndex,
                start,
                dir = simple !== forward ? "nextSibling" : "previousSibling",
                parent = elem.parentNode,
                name = ofType && elem.nodeName.toLowerCase(),
                useCache = !xml && !ofType;
            if (parent) {
              if (simple) {
                while (dir) {
                  node = elem;
                  while ((node = node[dir])) {
                    if (ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) {
                      return false;
                    }
                  }
                  start = dir = type === "only" && !start && "nextSibling";
                }
                return true;
              }
              start = [forward ? parent.firstChild : parent.lastChild];
              if (forward && useCache) {
                outerCache = parent[expando] || (parent[expando] = {});
                cache = outerCache[type] || [];
                nodeIndex = cache[0] === dirruns && cache[1];
                diff = cache[0] === dirruns && cache[2];
                node = nodeIndex && parent.childNodes[nodeIndex];
                while ((node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop())) {
                  if (node.nodeType === 1 && ++diff && node === elem) {
                    outerCache[type] = [dirruns, nodeIndex, diff];
                    break;
                  }
                }
              } else if (useCache && (cache = (elem[expando] || (elem[expando] = {}))[type]) && cache[0] === dirruns) {
                diff = cache[1];
              } else {
                while ((node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop())) {
                  if ((ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) && ++diff) {
                    if (useCache) {
                      (node[expando] || (node[expando] = {}))[type] = [dirruns, diff];
                    }
                    if (node === elem) {
                      break;
                    }
                  }
                }
              }
              diff -= last;
              return diff === first || (diff % first === 0 && diff / first >= 0);
            }
          };
        },
        "PSEUDO": function(pseudo, argument) {
          var args,
              fn = Expr.pseudos[pseudo] || Expr.setFilters[pseudo.toLowerCase()] || Sizzle.error("unsupported pseudo: " + pseudo);
          if (fn[expando]) {
            return fn(argument);
          }
          if (fn.length > 1) {
            args = [pseudo, pseudo, "", argument];
            return Expr.setFilters.hasOwnProperty(pseudo.toLowerCase()) ? markFunction(function(seed, matches) {
              var idx,
                  matched = fn(seed, argument),
                  i = matched.length;
              while (i--) {
                idx = indexOf(seed, matched[i]);
                seed[idx] = !(matches[idx] = matched[i]);
              }
            }) : function(elem) {
              return fn(elem, 0, args);
            };
          }
          return fn;
        }
      },
      pseudos: {
        "not": markFunction(function(selector) {
          var input = [],
              results = [],
              matcher = compile(selector.replace(rtrim, "$1"));
          return matcher[expando] ? markFunction(function(seed, matches, context, xml) {
            var elem,
                unmatched = matcher(seed, null, xml, []),
                i = seed.length;
            while (i--) {
              if ((elem = unmatched[i])) {
                seed[i] = !(matches[i] = elem);
              }
            }
          }) : function(elem, context, xml) {
            input[0] = elem;
            matcher(input, null, xml, results);
            input[0] = null;
            return !results.pop();
          };
        }),
        "has": markFunction(function(selector) {
          return function(elem) {
            return Sizzle(selector, elem).length > 0;
          };
        }),
        "contains": markFunction(function(text) {
          text = text.replace(runescape, funescape);
          return function(elem) {
            return (elem.textContent || elem.innerText || getText(elem)).indexOf(text) > -1;
          };
        }),
        "lang": markFunction(function(lang) {
          if (!ridentifier.test(lang || "")) {
            Sizzle.error("unsupported lang: " + lang);
          }
          lang = lang.replace(runescape, funescape).toLowerCase();
          return function(elem) {
            var elemLang;
            do {
              if ((elemLang = documentIsHTML ? elem.lang : elem.getAttribute("xml:lang") || elem.getAttribute("lang"))) {
                elemLang = elemLang.toLowerCase();
                return elemLang === lang || elemLang.indexOf(lang + "-") === 0;
              }
            } while ((elem = elem.parentNode) && elem.nodeType === 1);
            return false;
          };
        }),
        "target": function(elem) {
          var hash = window.location && window.location.hash;
          return hash && hash.slice(1) === elem.id;
        },
        "root": function(elem) {
          return elem === docElem;
        },
        "focus": function(elem) {
          return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
        },
        "enabled": function(elem) {
          return elem.disabled === false;
        },
        "disabled": function(elem) {
          return elem.disabled === true;
        },
        "checked": function(elem) {
          var nodeName = elem.nodeName.toLowerCase();
          return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
        },
        "selected": function(elem) {
          if (elem.parentNode) {
            elem.parentNode.selectedIndex;
          }
          return elem.selected === true;
        },
        "empty": function(elem) {
          for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
            if (elem.nodeType < 6) {
              return false;
            }
          }
          return true;
        },
        "parent": function(elem) {
          return !Expr.pseudos["empty"](elem);
        },
        "header": function(elem) {
          return rheader.test(elem.nodeName);
        },
        "input": function(elem) {
          return rinputs.test(elem.nodeName);
        },
        "button": function(elem) {
          var name = elem.nodeName.toLowerCase();
          return name === "input" && elem.type === "button" || name === "button";
        },
        "text": function(elem) {
          var attr;
          return elem.nodeName.toLowerCase() === "input" && elem.type === "text" && ((attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text");
        },
        "first": createPositionalPseudo(function() {
          return [0];
        }),
        "last": createPositionalPseudo(function(matchIndexes, length) {
          return [length - 1];
        }),
        "eq": createPositionalPseudo(function(matchIndexes, length, argument) {
          return [argument < 0 ? argument + length : argument];
        }),
        "even": createPositionalPseudo(function(matchIndexes, length) {
          var i = 0;
          for (; i < length; i += 2) {
            matchIndexes.push(i);
          }
          return matchIndexes;
        }),
        "odd": createPositionalPseudo(function(matchIndexes, length) {
          var i = 1;
          for (; i < length; i += 2) {
            matchIndexes.push(i);
          }
          return matchIndexes;
        }),
        "lt": createPositionalPseudo(function(matchIndexes, length, argument) {
          var i = argument < 0 ? argument + length : argument;
          for (; --i >= 0; ) {
            matchIndexes.push(i);
          }
          return matchIndexes;
        }),
        "gt": createPositionalPseudo(function(matchIndexes, length, argument) {
          var i = argument < 0 ? argument + length : argument;
          for (; ++i < length; ) {
            matchIndexes.push(i);
          }
          return matchIndexes;
        })
      }
    };
    Expr.pseudos["nth"] = Expr.pseudos["eq"];
    for (i in {
      radio: true,
      checkbox: true,
      file: true,
      password: true,
      image: true
    }) {
      Expr.pseudos[i] = createInputPseudo(i);
    }
    for (i in {
      submit: true,
      reset: true
    }) {
      Expr.pseudos[i] = createButtonPseudo(i);
    }
    function setFilters() {}
    setFilters.prototype = Expr.filters = Expr.pseudos;
    Expr.setFilters = new setFilters();
    tokenize = Sizzle.tokenize = function(selector, parseOnly) {
      var matched,
          match,
          tokens,
          type,
          soFar,
          groups,
          preFilters,
          cached = tokenCache[selector + " "];
      if (cached) {
        return parseOnly ? 0 : cached.slice(0);
      }
      soFar = selector;
      groups = [];
      preFilters = Expr.preFilter;
      while (soFar) {
        if (!matched || (match = rcomma.exec(soFar))) {
          if (match) {
            soFar = soFar.slice(match[0].length) || soFar;
          }
          groups.push((tokens = []));
        }
        matched = false;
        if ((match = rcombinators.exec(soFar))) {
          matched = match.shift();
          tokens.push({
            value: matched,
            type: match[0].replace(rtrim, " ")
          });
          soFar = soFar.slice(matched.length);
        }
        for (type in Expr.filter) {
          if ((match = matchExpr[type].exec(soFar)) && (!preFilters[type] || (match = preFilters[type](match)))) {
            matched = match.shift();
            tokens.push({
              value: matched,
              type: type,
              matches: match
            });
            soFar = soFar.slice(matched.length);
          }
        }
        if (!matched) {
          break;
        }
      }
      return parseOnly ? soFar.length : soFar ? Sizzle.error(selector) : tokenCache(selector, groups).slice(0);
    };
    function toSelector(tokens) {
      var i = 0,
          len = tokens.length,
          selector = "";
      for (; i < len; i++) {
        selector += tokens[i].value;
      }
      return selector;
    }
    function addCombinator(matcher, combinator, base) {
      var dir = combinator.dir,
          checkNonElements = base && dir === "parentNode",
          doneName = done++;
      return combinator.first ? function(elem, context, xml) {
        while ((elem = elem[dir])) {
          if (elem.nodeType === 1 || checkNonElements) {
            return matcher(elem, context, xml);
          }
        }
      } : function(elem, context, xml) {
        var oldCache,
            outerCache,
            newCache = [dirruns, doneName];
        if (xml) {
          while ((elem = elem[dir])) {
            if (elem.nodeType === 1 || checkNonElements) {
              if (matcher(elem, context, xml)) {
                return true;
              }
            }
          }
        } else {
          while ((elem = elem[dir])) {
            if (elem.nodeType === 1 || checkNonElements) {
              outerCache = elem[expando] || (elem[expando] = {});
              if ((oldCache = outerCache[dir]) && oldCache[0] === dirruns && oldCache[1] === doneName) {
                return (newCache[2] = oldCache[2]);
              } else {
                outerCache[dir] = newCache;
                if ((newCache[2] = matcher(elem, context, xml))) {
                  return true;
                }
              }
            }
          }
        }
      };
    }
    function elementMatcher(matchers) {
      return matchers.length > 1 ? function(elem, context, xml) {
        var i = matchers.length;
        while (i--) {
          if (!matchers[i](elem, context, xml)) {
            return false;
          }
        }
        return true;
      } : matchers[0];
    }
    function multipleContexts(selector, contexts, results) {
      var i = 0,
          len = contexts.length;
      for (; i < len; i++) {
        Sizzle(selector, contexts[i], results);
      }
      return results;
    }
    function condense(unmatched, map, filter, context, xml) {
      var elem,
          newUnmatched = [],
          i = 0,
          len = unmatched.length,
          mapped = map != null;
      for (; i < len; i++) {
        if ((elem = unmatched[i])) {
          if (!filter || filter(elem, context, xml)) {
            newUnmatched.push(elem);
            if (mapped) {
              map.push(i);
            }
          }
        }
      }
      return newUnmatched;
    }
    function setMatcher(preFilter, selector, matcher, postFilter, postFinder, postSelector) {
      if (postFilter && !postFilter[expando]) {
        postFilter = setMatcher(postFilter);
      }
      if (postFinder && !postFinder[expando]) {
        postFinder = setMatcher(postFinder, postSelector);
      }
      return markFunction(function(seed, results, context, xml) {
        var temp,
            i,
            elem,
            preMap = [],
            postMap = [],
            preexisting = results.length,
            elems = seed || multipleContexts(selector || "*", context.nodeType ? [context] : context, []),
            matcherIn = preFilter && (seed || !selector) ? condense(elems, preMap, preFilter, context, xml) : elems,
            matcherOut = matcher ? postFinder || (seed ? preFilter : preexisting || postFilter) ? [] : results : matcherIn;
        if (matcher) {
          matcher(matcherIn, matcherOut, context, xml);
        }
        if (postFilter) {
          temp = condense(matcherOut, postMap);
          postFilter(temp, [], context, xml);
          i = temp.length;
          while (i--) {
            if ((elem = temp[i])) {
              matcherOut[postMap[i]] = !(matcherIn[postMap[i]] = elem);
            }
          }
        }
        if (seed) {
          if (postFinder || preFilter) {
            if (postFinder) {
              temp = [];
              i = matcherOut.length;
              while (i--) {
                if ((elem = matcherOut[i])) {
                  temp.push((matcherIn[i] = elem));
                }
              }
              postFinder(null, (matcherOut = []), temp, xml);
            }
            i = matcherOut.length;
            while (i--) {
              if ((elem = matcherOut[i]) && (temp = postFinder ? indexOf(seed, elem) : preMap[i]) > -1) {
                seed[temp] = !(results[temp] = elem);
              }
            }
          }
        } else {
          matcherOut = condense(matcherOut === results ? matcherOut.splice(preexisting, matcherOut.length) : matcherOut);
          if (postFinder) {
            postFinder(null, results, matcherOut, xml);
          } else {
            push.apply(results, matcherOut);
          }
        }
      });
    }
    function matcherFromTokens(tokens) {
      var checkContext,
          matcher,
          j,
          len = tokens.length,
          leadingRelative = Expr.relative[tokens[0].type],
          implicitRelative = leadingRelative || Expr.relative[" "],
          i = leadingRelative ? 1 : 0,
          matchContext = addCombinator(function(elem) {
            return elem === checkContext;
          }, implicitRelative, true),
          matchAnyContext = addCombinator(function(elem) {
            return indexOf(checkContext, elem) > -1;
          }, implicitRelative, true),
          matchers = [function(elem, context, xml) {
            var ret = (!leadingRelative && (xml || context !== outermostContext)) || ((checkContext = context).nodeType ? matchContext(elem, context, xml) : matchAnyContext(elem, context, xml));
            checkContext = null;
            return ret;
          }];
      for (; i < len; i++) {
        if ((matcher = Expr.relative[tokens[i].type])) {
          matchers = [addCombinator(elementMatcher(matchers), matcher)];
        } else {
          matcher = Expr.filter[tokens[i].type].apply(null, tokens[i].matches);
          if (matcher[expando]) {
            j = ++i;
            for (; j < len; j++) {
              if (Expr.relative[tokens[j].type]) {
                break;
              }
            }
            return setMatcher(i > 1 && elementMatcher(matchers), i > 1 && toSelector(tokens.slice(0, i - 1).concat({value: tokens[i - 2].type === " " ? "*" : ""})).replace(rtrim, "$1"), matcher, i < j && matcherFromTokens(tokens.slice(i, j)), j < len && matcherFromTokens((tokens = tokens.slice(j))), j < len && toSelector(tokens));
          }
          matchers.push(matcher);
        }
      }
      return elementMatcher(matchers);
    }
    function matcherFromGroupMatchers(elementMatchers, setMatchers) {
      var bySet = setMatchers.length > 0,
          byElement = elementMatchers.length > 0,
          superMatcher = function(seed, context, xml, results, outermost) {
            var elem,
                j,
                matcher,
                matchedCount = 0,
                i = "0",
                unmatched = seed && [],
                setMatched = [],
                contextBackup = outermostContext,
                elems = seed || byElement && Expr.find["TAG"]("*", outermost),
                dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
                len = elems.length;
            if (outermost) {
              outermostContext = context !== document && context;
            }
            for (; i !== len && (elem = elems[i]) != null; i++) {
              if (byElement && elem) {
                j = 0;
                while ((matcher = elementMatchers[j++])) {
                  if (matcher(elem, context, xml)) {
                    results.push(elem);
                    break;
                  }
                }
                if (outermost) {
                  dirruns = dirrunsUnique;
                }
              }
              if (bySet) {
                if ((elem = !matcher && elem)) {
                  matchedCount--;
                }
                if (seed) {
                  unmatched.push(elem);
                }
              }
            }
            matchedCount += i;
            if (bySet && i !== matchedCount) {
              j = 0;
              while ((matcher = setMatchers[j++])) {
                matcher(unmatched, setMatched, context, xml);
              }
              if (seed) {
                if (matchedCount > 0) {
                  while (i--) {
                    if (!(unmatched[i] || setMatched[i])) {
                      setMatched[i] = pop.call(results);
                    }
                  }
                }
                setMatched = condense(setMatched);
              }
              push.apply(results, setMatched);
              if (outermost && !seed && setMatched.length > 0 && (matchedCount + setMatchers.length) > 1) {
                Sizzle.uniqueSort(results);
              }
            }
            if (outermost) {
              dirruns = dirrunsUnique;
              outermostContext = contextBackup;
            }
            return unmatched;
          };
      return bySet ? markFunction(superMatcher) : superMatcher;
    }
    compile = Sizzle.compile = function(selector, match) {
      var i,
          setMatchers = [],
          elementMatchers = [],
          cached = compilerCache[selector + " "];
      if (!cached) {
        if (!match) {
          match = tokenize(selector);
        }
        i = match.length;
        while (i--) {
          cached = matcherFromTokens(match[i]);
          if (cached[expando]) {
            setMatchers.push(cached);
          } else {
            elementMatchers.push(cached);
          }
        }
        cached = compilerCache(selector, matcherFromGroupMatchers(elementMatchers, setMatchers));
        cached.selector = selector;
      }
      return cached;
    };
    select = Sizzle.select = function(selector, context, results, seed) {
      var i,
          tokens,
          token,
          type,
          find,
          compiled = typeof selector === "function" && selector,
          match = !seed && tokenize((selector = compiled.selector || selector));
      results = results || [];
      if (match.length === 1) {
        tokens = match[0] = match[0].slice(0);
        if (tokens.length > 2 && (token = tokens[0]).type === "ID" && support.getById && context.nodeType === 9 && documentIsHTML && Expr.relative[tokens[1].type]) {
          context = (Expr.find["ID"](token.matches[0].replace(runescape, funescape), context) || [])[0];
          if (!context) {
            return results;
          } else if (compiled) {
            context = context.parentNode;
          }
          selector = selector.slice(tokens.shift().value.length);
        }
        i = matchExpr["needsContext"].test(selector) ? 0 : tokens.length;
        while (i--) {
          token = tokens[i];
          if (Expr.relative[(type = token.type)]) {
            break;
          }
          if ((find = Expr.find[type])) {
            if ((seed = find(token.matches[0].replace(runescape, funescape), rsibling.test(tokens[0].type) && testContext(context.parentNode) || context))) {
              tokens.splice(i, 1);
              selector = seed.length && toSelector(tokens);
              if (!selector) {
                push.apply(results, seed);
                return results;
              }
              break;
            }
          }
        }
      }
      (compiled || compile(selector, match))(seed, context, !documentIsHTML, results, rsibling.test(selector) && testContext(context.parentNode) || context);
      return results;
    };
    support.sortStable = expando.split("").sort(sortOrder).join("") === expando;
    support.detectDuplicates = !!hasDuplicate;
    setDocument();
    support.sortDetached = assert(function(div1) {
      return div1.compareDocumentPosition(document.createElement("div")) & 1;
    });
    if (!assert(function(div) {
      div.innerHTML = "<a href='#'></a>";
      return div.firstChild.getAttribute("href") === "#";
    })) {
      addHandle("type|href|height|width", function(elem, name, isXML) {
        if (!isXML) {
          return elem.getAttribute(name, name.toLowerCase() === "type" ? 1 : 2);
        }
      });
    }
    if (!support.attributes || !assert(function(div) {
      div.innerHTML = "<input/>";
      div.firstChild.setAttribute("value", "");
      return div.firstChild.getAttribute("value") === "";
    })) {
      addHandle("value", function(elem, name, isXML) {
        if (!isXML && elem.nodeName.toLowerCase() === "input") {
          return elem.defaultValue;
        }
      });
    }
    if (!assert(function(div) {
      return div.getAttribute("disabled") == null;
    })) {
      addHandle(booleans, function(elem, name, isXML) {
        var val;
        if (!isXML) {
          return elem[name] === true ? name.toLowerCase() : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
        }
      });
    }
    return Sizzle;
  })(window);
  jQuery.find = Sizzle;
  jQuery.expr = Sizzle.selectors;
  jQuery.expr[":"] = jQuery.expr.pseudos;
  jQuery.unique = Sizzle.uniqueSort;
  jQuery.text = Sizzle.getText;
  jQuery.isXMLDoc = Sizzle.isXML;
  jQuery.contains = Sizzle.contains;
  var rneedsContext = jQuery.expr.match.needsContext;
  var rsingleTag = (/^<(\w+)\s*\/?>(?:<\/\1>|)$/);
  var risSimple = /^.[^:#\[\.,]*$/;
  function winnow(elements, qualifier, not) {
    if (jQuery.isFunction(qualifier)) {
      return jQuery.grep(elements, function(elem, i) {
        return !!qualifier.call(elem, i, elem) !== not;
      });
    }
    if (qualifier.nodeType) {
      return jQuery.grep(elements, function(elem) {
        return (elem === qualifier) !== not;
      });
    }
    if (typeof qualifier === "string") {
      if (risSimple.test(qualifier)) {
        return jQuery.filter(qualifier, elements, not);
      }
      qualifier = jQuery.filter(qualifier, elements);
    }
    return jQuery.grep(elements, function(elem) {
      return (indexOf.call(qualifier, elem) >= 0) !== not;
    });
  }
  jQuery.filter = function(expr, elems, not) {
    var elem = elems[0];
    if (not) {
      expr = ":not(" + expr + ")";
    }
    return elems.length === 1 && elem.nodeType === 1 ? jQuery.find.matchesSelector(elem, expr) ? [elem] : [] : jQuery.find.matches(expr, jQuery.grep(elems, function(elem) {
      return elem.nodeType === 1;
    }));
  };
  jQuery.fn.extend({
    find: function(selector) {
      var i,
          len = this.length,
          ret = [],
          self = this;
      if (typeof selector !== "string") {
        return this.pushStack(jQuery(selector).filter(function() {
          for (i = 0; i < len; i++) {
            if (jQuery.contains(self[i], this)) {
              return true;
            }
          }
        }));
      }
      for (i = 0; i < len; i++) {
        jQuery.find(selector, self[i], ret);
      }
      ret = this.pushStack(len > 1 ? jQuery.unique(ret) : ret);
      ret.selector = this.selector ? this.selector + " " + selector : selector;
      return ret;
    },
    filter: function(selector) {
      return this.pushStack(winnow(this, selector || [], false));
    },
    not: function(selector) {
      return this.pushStack(winnow(this, selector || [], true));
    },
    is: function(selector) {
      return !!winnow(this, typeof selector === "string" && rneedsContext.test(selector) ? jQuery(selector) : selector || [], false).length;
    }
  });
  var rootjQuery,
      rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,
      init = jQuery.fn.init = function(selector, context) {
        var match,
            elem;
        if (!selector) {
          return this;
        }
        if (typeof selector === "string") {
          if (selector[0] === "<" && selector[selector.length - 1] === ">" && selector.length >= 3) {
            match = [null, selector, null];
          } else {
            match = rquickExpr.exec(selector);
          }
          if (match && (match[1] || !context)) {
            if (match[1]) {
              context = context instanceof jQuery ? context[0] : context;
              jQuery.merge(this, jQuery.parseHTML(match[1], context && context.nodeType ? context.ownerDocument || context : document, true));
              if (rsingleTag.test(match[1]) && jQuery.isPlainObject(context)) {
                for (match in context) {
                  if (jQuery.isFunction(this[match])) {
                    this[match](context[match]);
                  } else {
                    this.attr(match, context[match]);
                  }
                }
              }
              return this;
            } else {
              elem = document.getElementById(match[2]);
              if (elem && elem.parentNode) {
                this.length = 1;
                this[0] = elem;
              }
              this.context = document;
              this.selector = selector;
              return this;
            }
          } else if (!context || context.jquery) {
            return (context || rootjQuery).find(selector);
          } else {
            return this.constructor(context).find(selector);
          }
        } else if (selector.nodeType) {
          this.context = this[0] = selector;
          this.length = 1;
          return this;
        } else if (jQuery.isFunction(selector)) {
          return typeof rootjQuery.ready !== "undefined" ? rootjQuery.ready(selector) : selector(jQuery);
        }
        if (selector.selector !== undefined) {
          this.selector = selector.selector;
          this.context = selector.context;
        }
        return jQuery.makeArray(selector, this);
      };
  init.prototype = jQuery.fn;
  rootjQuery = jQuery(document);
  var rparentsprev = /^(?:parents|prev(?:Until|All))/,
      guaranteedUnique = {
        children: true,
        contents: true,
        next: true,
        prev: true
      };
  jQuery.extend({
    dir: function(elem, dir, until) {
      var matched = [],
          truncate = until !== undefined;
      while ((elem = elem[dir]) && elem.nodeType !== 9) {
        if (elem.nodeType === 1) {
          if (truncate && jQuery(elem).is(until)) {
            break;
          }
          matched.push(elem);
        }
      }
      return matched;
    },
    sibling: function(n, elem) {
      var matched = [];
      for (; n; n = n.nextSibling) {
        if (n.nodeType === 1 && n !== elem) {
          matched.push(n);
        }
      }
      return matched;
    }
  });
  jQuery.fn.extend({
    has: function(target) {
      var targets = jQuery(target, this),
          l = targets.length;
      return this.filter(function() {
        var i = 0;
        for (; i < l; i++) {
          if (jQuery.contains(this, targets[i])) {
            return true;
          }
        }
      });
    },
    closest: function(selectors, context) {
      var cur,
          i = 0,
          l = this.length,
          matched = [],
          pos = rneedsContext.test(selectors) || typeof selectors !== "string" ? jQuery(selectors, context || this.context) : 0;
      for (; i < l; i++) {
        for (cur = this[i]; cur && cur !== context; cur = cur.parentNode) {
          if (cur.nodeType < 11 && (pos ? pos.index(cur) > -1 : cur.nodeType === 1 && jQuery.find.matchesSelector(cur, selectors))) {
            matched.push(cur);
            break;
          }
        }
      }
      return this.pushStack(matched.length > 1 ? jQuery.unique(matched) : matched);
    },
    index: function(elem) {
      if (!elem) {
        return (this[0] && this[0].parentNode) ? this.first().prevAll().length : -1;
      }
      if (typeof elem === "string") {
        return indexOf.call(jQuery(elem), this[0]);
      }
      return indexOf.call(this, elem.jquery ? elem[0] : elem);
    },
    add: function(selector, context) {
      return this.pushStack(jQuery.unique(jQuery.merge(this.get(), jQuery(selector, context))));
    },
    addBack: function(selector) {
      return this.add(selector == null ? this.prevObject : this.prevObject.filter(selector));
    }
  });
  function sibling(cur, dir) {
    while ((cur = cur[dir]) && cur.nodeType !== 1) {}
    return cur;
  }
  jQuery.each({
    parent: function(elem) {
      var parent = elem.parentNode;
      return parent && parent.nodeType !== 11 ? parent : null;
    },
    parents: function(elem) {
      return jQuery.dir(elem, "parentNode");
    },
    parentsUntil: function(elem, i, until) {
      return jQuery.dir(elem, "parentNode", until);
    },
    next: function(elem) {
      return sibling(elem, "nextSibling");
    },
    prev: function(elem) {
      return sibling(elem, "previousSibling");
    },
    nextAll: function(elem) {
      return jQuery.dir(elem, "nextSibling");
    },
    prevAll: function(elem) {
      return jQuery.dir(elem, "previousSibling");
    },
    nextUntil: function(elem, i, until) {
      return jQuery.dir(elem, "nextSibling", until);
    },
    prevUntil: function(elem, i, until) {
      return jQuery.dir(elem, "previousSibling", until);
    },
    siblings: function(elem) {
      return jQuery.sibling((elem.parentNode || {}).firstChild, elem);
    },
    children: function(elem) {
      return jQuery.sibling(elem.firstChild);
    },
    contents: function(elem) {
      return elem.contentDocument || jQuery.merge([], elem.childNodes);
    }
  }, function(name, fn) {
    jQuery.fn[name] = function(until, selector) {
      var matched = jQuery.map(this, fn, until);
      if (name.slice(-5) !== "Until") {
        selector = until;
      }
      if (selector && typeof selector === "string") {
        matched = jQuery.filter(selector, matched);
      }
      if (this.length > 1) {
        if (!guaranteedUnique[name]) {
          jQuery.unique(matched);
        }
        if (rparentsprev.test(name)) {
          matched.reverse();
        }
      }
      return this.pushStack(matched);
    };
  });
  var rnotwhite = (/\S+/g);
  var optionsCache = {};
  function createOptions(options) {
    var object = optionsCache[options] = {};
    jQuery.each(options.match(rnotwhite) || [], function(_, flag) {
      object[flag] = true;
    });
    return object;
  }
  jQuery.Callbacks = function(options) {
    options = typeof options === "string" ? (optionsCache[options] || createOptions(options)) : jQuery.extend({}, options);
    var memory,
        fired,
        firing,
        firingStart,
        firingLength,
        firingIndex,
        list = [],
        stack = !options.once && [],
        fire = function(data) {
          memory = options.memory && data;
          fired = true;
          firingIndex = firingStart || 0;
          firingStart = 0;
          firingLength = list.length;
          firing = true;
          for (; list && firingIndex < firingLength; firingIndex++) {
            if (list[firingIndex].apply(data[0], data[1]) === false && options.stopOnFalse) {
              memory = false;
              break;
            }
          }
          firing = false;
          if (list) {
            if (stack) {
              if (stack.length) {
                fire(stack.shift());
              }
            } else if (memory) {
              list = [];
            } else {
              self.disable();
            }
          }
        },
        self = {
          add: function() {
            if (list) {
              var start = list.length;
              (function add(args) {
                jQuery.each(args, function(_, arg) {
                  var type = jQuery.type(arg);
                  if (type === "function") {
                    if (!options.unique || !self.has(arg)) {
                      list.push(arg);
                    }
                  } else if (arg && arg.length && type !== "string") {
                    add(arg);
                  }
                });
              })(arguments);
              if (firing) {
                firingLength = list.length;
              } else if (memory) {
                firingStart = start;
                fire(memory);
              }
            }
            return this;
          },
          remove: function() {
            if (list) {
              jQuery.each(arguments, function(_, arg) {
                var index;
                while ((index = jQuery.inArray(arg, list, index)) > -1) {
                  list.splice(index, 1);
                  if (firing) {
                    if (index <= firingLength) {
                      firingLength--;
                    }
                    if (index <= firingIndex) {
                      firingIndex--;
                    }
                  }
                }
              });
            }
            return this;
          },
          has: function(fn) {
            return fn ? jQuery.inArray(fn, list) > -1 : !!(list && list.length);
          },
          empty: function() {
            list = [];
            firingLength = 0;
            return this;
          },
          disable: function() {
            list = stack = memory = undefined;
            return this;
          },
          disabled: function() {
            return !list;
          },
          lock: function() {
            stack = undefined;
            if (!memory) {
              self.disable();
            }
            return this;
          },
          locked: function() {
            return !stack;
          },
          fireWith: function(context, args) {
            if (list && (!fired || stack)) {
              args = args || [];
              args = [context, args.slice ? args.slice() : args];
              if (firing) {
                stack.push(args);
              } else {
                fire(args);
              }
            }
            return this;
          },
          fire: function() {
            self.fireWith(this, arguments);
            return this;
          },
          fired: function() {
            return !!fired;
          }
        };
    return self;
  };
  jQuery.extend({
    Deferred: function(func) {
      var tuples = [["resolve", "done", jQuery.Callbacks("once memory"), "resolved"], ["reject", "fail", jQuery.Callbacks("once memory"), "rejected"], ["notify", "progress", jQuery.Callbacks("memory")]],
          state = "pending",
          promise = {
            state: function() {
              return state;
            },
            always: function() {
              deferred.done(arguments).fail(arguments);
              return this;
            },
            then: function() {
              var fns = arguments;
              return jQuery.Deferred(function(newDefer) {
                jQuery.each(tuples, function(i, tuple) {
                  var fn = jQuery.isFunction(fns[i]) && fns[i];
                  deferred[tuple[1]](function() {
                    var returned = fn && fn.apply(this, arguments);
                    if (returned && jQuery.isFunction(returned.promise)) {
                      returned.promise().done(newDefer.resolve).fail(newDefer.reject).progress(newDefer.notify);
                    } else {
                      newDefer[tuple[0] + "With"](this === promise ? newDefer.promise() : this, fn ? [returned] : arguments);
                    }
                  });
                });
                fns = null;
              }).promise();
            },
            promise: function(obj) {
              return obj != null ? jQuery.extend(obj, promise) : promise;
            }
          },
          deferred = {};
      promise.pipe = promise.then;
      jQuery.each(tuples, function(i, tuple) {
        var list = tuple[2],
            stateString = tuple[3];
        promise[tuple[1]] = list.add;
        if (stateString) {
          list.add(function() {
            state = stateString;
          }, tuples[i ^ 1][2].disable, tuples[2][2].lock);
        }
        deferred[tuple[0]] = function() {
          deferred[tuple[0] + "With"](this === deferred ? promise : this, arguments);
          return this;
        };
        deferred[tuple[0] + "With"] = list.fireWith;
      });
      promise.promise(deferred);
      if (func) {
        func.call(deferred, deferred);
      }
      return deferred;
    },
    when: function(subordinate) {
      var i = 0,
          resolveValues = slice.call(arguments),
          length = resolveValues.length,
          remaining = length !== 1 || (subordinate && jQuery.isFunction(subordinate.promise)) ? length : 0,
          deferred = remaining === 1 ? subordinate : jQuery.Deferred(),
          updateFunc = function(i, contexts, values) {
            return function(value) {
              contexts[i] = this;
              values[i] = arguments.length > 1 ? slice.call(arguments) : value;
              if (values === progressValues) {
                deferred.notifyWith(contexts, values);
              } else if (!(--remaining)) {
                deferred.resolveWith(contexts, values);
              }
            };
          },
          progressValues,
          progressContexts,
          resolveContexts;
      if (length > 1) {
        progressValues = new Array(length);
        progressContexts = new Array(length);
        resolveContexts = new Array(length);
        for (; i < length; i++) {
          if (resolveValues[i] && jQuery.isFunction(resolveValues[i].promise)) {
            resolveValues[i].promise().done(updateFunc(i, resolveContexts, resolveValues)).fail(deferred.reject).progress(updateFunc(i, progressContexts, progressValues));
          } else {
            --remaining;
          }
        }
      }
      if (!remaining) {
        deferred.resolveWith(resolveContexts, resolveValues);
      }
      return deferred.promise();
    }
  });
  var readyList;
  jQuery.fn.ready = function(fn) {
    jQuery.ready.promise().done(fn);
    return this;
  };
  jQuery.extend({
    isReady: false,
    readyWait: 1,
    holdReady: function(hold) {
      if (hold) {
        jQuery.readyWait++;
      } else {
        jQuery.ready(true);
      }
    },
    ready: function(wait) {
      if (wait === true ? --jQuery.readyWait : jQuery.isReady) {
        return;
      }
      jQuery.isReady = true;
      if (wait !== true && --jQuery.readyWait > 0) {
        return;
      }
      readyList.resolveWith(document, [jQuery]);
      if (jQuery.fn.triggerHandler) {
        jQuery(document).triggerHandler("ready");
        jQuery(document).off("ready");
      }
    }
  });
  function completed() {
    document.removeEventListener("DOMContentLoaded", completed, false);
    window.removeEventListener("load", completed, false);
    jQuery.ready();
  }
  jQuery.ready.promise = function(obj) {
    if (!readyList) {
      readyList = jQuery.Deferred();
      if (document.readyState === "complete") {
        setTimeout(jQuery.ready);
      } else {
        document.addEventListener("DOMContentLoaded", completed, false);
        window.addEventListener("load", completed, false);
      }
    }
    return readyList.promise(obj);
  };
  jQuery.ready.promise();
  var access = jQuery.access = function(elems, fn, key, value, chainable, emptyGet, raw) {
    var i = 0,
        len = elems.length,
        bulk = key == null;
    if (jQuery.type(key) === "object") {
      chainable = true;
      for (i in key) {
        jQuery.access(elems, fn, i, key[i], true, emptyGet, raw);
      }
    } else if (value !== undefined) {
      chainable = true;
      if (!jQuery.isFunction(value)) {
        raw = true;
      }
      if (bulk) {
        if (raw) {
          fn.call(elems, value);
          fn = null;
        } else {
          bulk = fn;
          fn = function(elem, key, value) {
            return bulk.call(jQuery(elem), value);
          };
        }
      }
      if (fn) {
        for (; i < len; i++) {
          fn(elems[i], key, raw ? value : value.call(elems[i], i, fn(elems[i], key)));
        }
      }
    }
    return chainable ? elems : bulk ? fn.call(elems) : len ? fn(elems[0], key) : emptyGet;
  };
  jQuery.acceptData = function(owner) {
    return owner.nodeType === 1 || owner.nodeType === 9 || !(+owner.nodeType);
  };
  function Data() {
    Object.defineProperty(this.cache = {}, 0, {get: function() {
        return {};
      }});
    this.expando = jQuery.expando + Data.uid++;
  }
  Data.uid = 1;
  Data.accepts = jQuery.acceptData;
  Data.prototype = {
    key: function(owner) {
      if (!Data.accepts(owner)) {
        return 0;
      }
      var descriptor = {},
          unlock = owner[this.expando];
      if (!unlock) {
        unlock = Data.uid++;
        try {
          descriptor[this.expando] = {value: unlock};
          Object.defineProperties(owner, descriptor);
        } catch (e) {
          descriptor[this.expando] = unlock;
          jQuery.extend(owner, descriptor);
        }
      }
      if (!this.cache[unlock]) {
        this.cache[unlock] = {};
      }
      return unlock;
    },
    set: function(owner, data, value) {
      var prop,
          unlock = this.key(owner),
          cache = this.cache[unlock];
      if (typeof data === "string") {
        cache[data] = value;
      } else {
        if (jQuery.isEmptyObject(cache)) {
          jQuery.extend(this.cache[unlock], data);
        } else {
          for (prop in data) {
            cache[prop] = data[prop];
          }
        }
      }
      return cache;
    },
    get: function(owner, key) {
      var cache = this.cache[this.key(owner)];
      return key === undefined ? cache : cache[key];
    },
    access: function(owner, key, value) {
      var stored;
      if (key === undefined || ((key && typeof key === "string") && value === undefined)) {
        stored = this.get(owner, key);
        return stored !== undefined ? stored : this.get(owner, jQuery.camelCase(key));
      }
      this.set(owner, key, value);
      return value !== undefined ? value : key;
    },
    remove: function(owner, key) {
      var i,
          name,
          camel,
          unlock = this.key(owner),
          cache = this.cache[unlock];
      if (key === undefined) {
        this.cache[unlock] = {};
      } else {
        if (jQuery.isArray(key)) {
          name = key.concat(key.map(jQuery.camelCase));
        } else {
          camel = jQuery.camelCase(key);
          if (key in cache) {
            name = [key, camel];
          } else {
            name = camel;
            name = name in cache ? [name] : (name.match(rnotwhite) || []);
          }
        }
        i = name.length;
        while (i--) {
          delete cache[name[i]];
        }
      }
    },
    hasData: function(owner) {
      return !jQuery.isEmptyObject(this.cache[owner[this.expando]] || {});
    },
    discard: function(owner) {
      if (owner[this.expando]) {
        delete this.cache[owner[this.expando]];
      }
    }
  };
  var data_priv = new Data();
  var data_user = new Data();
  var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
      rmultiDash = /([A-Z])/g;
  function dataAttr(elem, key, data) {
    var name;
    if (data === undefined && elem.nodeType === 1) {
      name = "data-" + key.replace(rmultiDash, "-$1").toLowerCase();
      data = elem.getAttribute(name);
      if (typeof data === "string") {
        try {
          data = data === "true" ? true : data === "false" ? false : data === "null" ? null : +data + "" === data ? +data : rbrace.test(data) ? jQuery.parseJSON(data) : data;
        } catch (e) {}
        data_user.set(elem, key, data);
      } else {
        data = undefined;
      }
    }
    return data;
  }
  jQuery.extend({
    hasData: function(elem) {
      return data_user.hasData(elem) || data_priv.hasData(elem);
    },
    data: function(elem, name, data) {
      return data_user.access(elem, name, data);
    },
    removeData: function(elem, name) {
      data_user.remove(elem, name);
    },
    _data: function(elem, name, data) {
      return data_priv.access(elem, name, data);
    },
    _removeData: function(elem, name) {
      data_priv.remove(elem, name);
    }
  });
  jQuery.fn.extend({
    data: function(key, value) {
      var i,
          name,
          data,
          elem = this[0],
          attrs = elem && elem.attributes;
      if (key === undefined) {
        if (this.length) {
          data = data_user.get(elem);
          if (elem.nodeType === 1 && !data_priv.get(elem, "hasDataAttrs")) {
            i = attrs.length;
            while (i--) {
              if (attrs[i]) {
                name = attrs[i].name;
                if (name.indexOf("data-") === 0) {
                  name = jQuery.camelCase(name.slice(5));
                  dataAttr(elem, name, data[name]);
                }
              }
            }
            data_priv.set(elem, "hasDataAttrs", true);
          }
        }
        return data;
      }
      if (typeof key === "object") {
        return this.each(function() {
          data_user.set(this, key);
        });
      }
      return access(this, function(value) {
        var data,
            camelKey = jQuery.camelCase(key);
        if (elem && value === undefined) {
          data = data_user.get(elem, key);
          if (data !== undefined) {
            return data;
          }
          data = data_user.get(elem, camelKey);
          if (data !== undefined) {
            return data;
          }
          data = dataAttr(elem, camelKey, undefined);
          if (data !== undefined) {
            return data;
          }
          return;
        }
        this.each(function() {
          var data = data_user.get(this, camelKey);
          data_user.set(this, camelKey, value);
          if (key.indexOf("-") !== -1 && data !== undefined) {
            data_user.set(this, key, value);
          }
        });
      }, null, value, arguments.length > 1, null, true);
    },
    removeData: function(key) {
      return this.each(function() {
        data_user.remove(this, key);
      });
    }
  });
  jQuery.extend({
    queue: function(elem, type, data) {
      var queue;
      if (elem) {
        type = (type || "fx") + "queue";
        queue = data_priv.get(elem, type);
        if (data) {
          if (!queue || jQuery.isArray(data)) {
            queue = data_priv.access(elem, type, jQuery.makeArray(data));
          } else {
            queue.push(data);
          }
        }
        return queue || [];
      }
    },
    dequeue: function(elem, type) {
      type = type || "fx";
      var queue = jQuery.queue(elem, type),
          startLength = queue.length,
          fn = queue.shift(),
          hooks = jQuery._queueHooks(elem, type),
          next = function() {
            jQuery.dequeue(elem, type);
          };
      if (fn === "inprogress") {
        fn = queue.shift();
        startLength--;
      }
      if (fn) {
        if (type === "fx") {
          queue.unshift("inprogress");
        }
        delete hooks.stop;
        fn.call(elem, next, hooks);
      }
      if (!startLength && hooks) {
        hooks.empty.fire();
      }
    },
    _queueHooks: function(elem, type) {
      var key = type + "queueHooks";
      return data_priv.get(elem, key) || data_priv.access(elem, key, {empty: jQuery.Callbacks("once memory").add(function() {
          data_priv.remove(elem, [type + "queue", key]);
        })});
    }
  });
  jQuery.fn.extend({
    queue: function(type, data) {
      var setter = 2;
      if (typeof type !== "string") {
        data = type;
        type = "fx";
        setter--;
      }
      if (arguments.length < setter) {
        return jQuery.queue(this[0], type);
      }
      return data === undefined ? this : this.each(function() {
        var queue = jQuery.queue(this, type, data);
        jQuery._queueHooks(this, type);
        if (type === "fx" && queue[0] !== "inprogress") {
          jQuery.dequeue(this, type);
        }
      });
    },
    dequeue: function(type) {
      return this.each(function() {
        jQuery.dequeue(this, type);
      });
    },
    clearQueue: function(type) {
      return this.queue(type || "fx", []);
    },
    promise: function(type, obj) {
      var tmp,
          count = 1,
          defer = jQuery.Deferred(),
          elements = this,
          i = this.length,
          resolve = function() {
            if (!(--count)) {
              defer.resolveWith(elements, [elements]);
            }
          };
      if (typeof type !== "string") {
        obj = type;
        type = undefined;
      }
      type = type || "fx";
      while (i--) {
        tmp = data_priv.get(elements[i], type + "queueHooks");
        if (tmp && tmp.empty) {
          count++;
          tmp.empty.add(resolve);
        }
      }
      resolve();
      return defer.promise(obj);
    }
  });
  var pnum = (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source;
  var cssExpand = ["Top", "Right", "Bottom", "Left"];
  var isHidden = function(elem, el) {
    elem = el || elem;
    return jQuery.css(elem, "display") === "none" || !jQuery.contains(elem.ownerDocument, elem);
  };
  var rcheckableType = (/^(?:checkbox|radio)$/i);
  (function() {
    var fragment = document.createDocumentFragment(),
        div = fragment.appendChild(document.createElement("div")),
        input = document.createElement("input");
    input.setAttribute("type", "radio");
    input.setAttribute("checked", "checked");
    input.setAttribute("name", "t");
    div.appendChild(input);
    support.checkClone = div.cloneNode(true).cloneNode(true).lastChild.checked;
    div.innerHTML = "<textarea>x</textarea>";
    support.noCloneChecked = !!div.cloneNode(true).lastChild.defaultValue;
  })();
  var strundefined = typeof undefined;
  support.focusinBubbles = "onfocusin" in window;
  var rkeyEvent = /^key/,
      rmouseEvent = /^(?:mouse|pointer|contextmenu)|click/,
      rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
      rtypenamespace = /^([^.]*)(?:\.(.+)|)$/;
  function returnTrue() {
    return true;
  }
  function returnFalse() {
    return false;
  }
  function safeActiveElement() {
    try {
      return document.activeElement;
    } catch (err) {}
  }
  jQuery.event = {
    global: {},
    add: function(elem, types, handler, data, selector) {
      var handleObjIn,
          eventHandle,
          tmp,
          events,
          t,
          handleObj,
          special,
          handlers,
          type,
          namespaces,
          origType,
          elemData = data_priv.get(elem);
      if (!elemData) {
        return;
      }
      if (handler.handler) {
        handleObjIn = handler;
        handler = handleObjIn.handler;
        selector = handleObjIn.selector;
      }
      if (!handler.guid) {
        handler.guid = jQuery.guid++;
      }
      if (!(events = elemData.events)) {
        events = elemData.events = {};
      }
      if (!(eventHandle = elemData.handle)) {
        eventHandle = elemData.handle = function(e) {
          return typeof jQuery !== strundefined && jQuery.event.triggered !== e.type ? jQuery.event.dispatch.apply(elem, arguments) : undefined;
        };
      }
      types = (types || "").match(rnotwhite) || [""];
      t = types.length;
      while (t--) {
        tmp = rtypenamespace.exec(types[t]) || [];
        type = origType = tmp[1];
        namespaces = (tmp[2] || "").split(".").sort();
        if (!type) {
          continue;
        }
        special = jQuery.event.special[type] || {};
        type = (selector ? special.delegateType : special.bindType) || type;
        special = jQuery.event.special[type] || {};
        handleObj = jQuery.extend({
          type: type,
          origType: origType,
          data: data,
          handler: handler,
          guid: handler.guid,
          selector: selector,
          needsContext: selector && jQuery.expr.match.needsContext.test(selector),
          namespace: namespaces.join(".")
        }, handleObjIn);
        if (!(handlers = events[type])) {
          handlers = events[type] = [];
          handlers.delegateCount = 0;
          if (!special.setup || special.setup.call(elem, data, namespaces, eventHandle) === false) {
            if (elem.addEventListener) {
              elem.addEventListener(type, eventHandle, false);
            }
          }
        }
        if (special.add) {
          special.add.call(elem, handleObj);
          if (!handleObj.handler.guid) {
            handleObj.handler.guid = handler.guid;
          }
        }
        if (selector) {
          handlers.splice(handlers.delegateCount++, 0, handleObj);
        } else {
          handlers.push(handleObj);
        }
        jQuery.event.global[type] = true;
      }
    },
    remove: function(elem, types, handler, selector, mappedTypes) {
      var j,
          origCount,
          tmp,
          events,
          t,
          handleObj,
          special,
          handlers,
          type,
          namespaces,
          origType,
          elemData = data_priv.hasData(elem) && data_priv.get(elem);
      if (!elemData || !(events = elemData.events)) {
        return;
      }
      types = (types || "").match(rnotwhite) || [""];
      t = types.length;
      while (t--) {
        tmp = rtypenamespace.exec(types[t]) || [];
        type = origType = tmp[1];
        namespaces = (tmp[2] || "").split(".").sort();
        if (!type) {
          for (type in events) {
            jQuery.event.remove(elem, type + types[t], handler, selector, true);
          }
          continue;
        }
        special = jQuery.event.special[type] || {};
        type = (selector ? special.delegateType : special.bindType) || type;
        handlers = events[type] || [];
        tmp = tmp[2] && new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)");
        origCount = j = handlers.length;
        while (j--) {
          handleObj = handlers[j];
          if ((mappedTypes || origType === handleObj.origType) && (!handler || handler.guid === handleObj.guid) && (!tmp || tmp.test(handleObj.namespace)) && (!selector || selector === handleObj.selector || selector === "**" && handleObj.selector)) {
            handlers.splice(j, 1);
            if (handleObj.selector) {
              handlers.delegateCount--;
            }
            if (special.remove) {
              special.remove.call(elem, handleObj);
            }
          }
        }
        if (origCount && !handlers.length) {
          if (!special.teardown || special.teardown.call(elem, namespaces, elemData.handle) === false) {
            jQuery.removeEvent(elem, type, elemData.handle);
          }
          delete events[type];
        }
      }
      if (jQuery.isEmptyObject(events)) {
        delete elemData.handle;
        data_priv.remove(elem, "events");
      }
    },
    trigger: function(event, data, elem, onlyHandlers) {
      var i,
          cur,
          tmp,
          bubbleType,
          ontype,
          handle,
          special,
          eventPath = [elem || document],
          type = hasOwn.call(event, "type") ? event.type : event,
          namespaces = hasOwn.call(event, "namespace") ? event.namespace.split(".") : [];
      cur = tmp = elem = elem || document;
      if (elem.nodeType === 3 || elem.nodeType === 8) {
        return;
      }
      if (rfocusMorph.test(type + jQuery.event.triggered)) {
        return;
      }
      if (type.indexOf(".") >= 0) {
        namespaces = type.split(".");
        type = namespaces.shift();
        namespaces.sort();
      }
      ontype = type.indexOf(":") < 0 && "on" + type;
      event = event[jQuery.expando] ? event : new jQuery.Event(type, typeof event === "object" && event);
      event.isTrigger = onlyHandlers ? 2 : 3;
      event.namespace = namespaces.join(".");
      event.namespace_re = event.namespace ? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)") : null;
      event.result = undefined;
      if (!event.target) {
        event.target = elem;
      }
      data = data == null ? [event] : jQuery.makeArray(data, [event]);
      special = jQuery.event.special[type] || {};
      if (!onlyHandlers && special.trigger && special.trigger.apply(elem, data) === false) {
        return;
      }
      if (!onlyHandlers && !special.noBubble && !jQuery.isWindow(elem)) {
        bubbleType = special.delegateType || type;
        if (!rfocusMorph.test(bubbleType + type)) {
          cur = cur.parentNode;
        }
        for (; cur; cur = cur.parentNode) {
          eventPath.push(cur);
          tmp = cur;
        }
        if (tmp === (elem.ownerDocument || document)) {
          eventPath.push(tmp.defaultView || tmp.parentWindow || window);
        }
      }
      i = 0;
      while ((cur = eventPath[i++]) && !event.isPropagationStopped()) {
        event.type = i > 1 ? bubbleType : special.bindType || type;
        handle = (data_priv.get(cur, "events") || {})[event.type] && data_priv.get(cur, "handle");
        if (handle) {
          handle.apply(cur, data);
        }
        handle = ontype && cur[ontype];
        if (handle && handle.apply && jQuery.acceptData(cur)) {
          event.result = handle.apply(cur, data);
          if (event.result === false) {
            event.preventDefault();
          }
        }
      }
      event.type = type;
      if (!onlyHandlers && !event.isDefaultPrevented()) {
        if ((!special._default || special._default.apply(eventPath.pop(), data) === false) && jQuery.acceptData(elem)) {
          if (ontype && jQuery.isFunction(elem[type]) && !jQuery.isWindow(elem)) {
            tmp = elem[ontype];
            if (tmp) {
              elem[ontype] = null;
            }
            jQuery.event.triggered = type;
            elem[type]();
            jQuery.event.triggered = undefined;
            if (tmp) {
              elem[ontype] = tmp;
            }
          }
        }
      }
      return event.result;
    },
    dispatch: function(event) {
      event = jQuery.event.fix(event);
      var i,
          j,
          ret,
          matched,
          handleObj,
          handlerQueue = [],
          args = slice.call(arguments),
          handlers = (data_priv.get(this, "events") || {})[event.type] || [],
          special = jQuery.event.special[event.type] || {};
      args[0] = event;
      event.delegateTarget = this;
      if (special.preDispatch && special.preDispatch.call(this, event) === false) {
        return;
      }
      handlerQueue = jQuery.event.handlers.call(this, event, handlers);
      i = 0;
      while ((matched = handlerQueue[i++]) && !event.isPropagationStopped()) {
        event.currentTarget = matched.elem;
        j = 0;
        while ((handleObj = matched.handlers[j++]) && !event.isImmediatePropagationStopped()) {
          if (!event.namespace_re || event.namespace_re.test(handleObj.namespace)) {
            event.handleObj = handleObj;
            event.data = handleObj.data;
            ret = ((jQuery.event.special[handleObj.origType] || {}).handle || handleObj.handler).apply(matched.elem, args);
            if (ret !== undefined) {
              if ((event.result = ret) === false) {
                event.preventDefault();
                event.stopPropagation();
              }
            }
          }
        }
      }
      if (special.postDispatch) {
        special.postDispatch.call(this, event);
      }
      return event.result;
    },
    handlers: function(event, handlers) {
      var i,
          matches,
          sel,
          handleObj,
          handlerQueue = [],
          delegateCount = handlers.delegateCount,
          cur = event.target;
      if (delegateCount && cur.nodeType && (!event.button || event.type !== "click")) {
        for (; cur !== this; cur = cur.parentNode || this) {
          if (cur.disabled !== true || event.type !== "click") {
            matches = [];
            for (i = 0; i < delegateCount; i++) {
              handleObj = handlers[i];
              sel = handleObj.selector + " ";
              if (matches[sel] === undefined) {
                matches[sel] = handleObj.needsContext ? jQuery(sel, this).index(cur) >= 0 : jQuery.find(sel, this, null, [cur]).length;
              }
              if (matches[sel]) {
                matches.push(handleObj);
              }
            }
            if (matches.length) {
              handlerQueue.push({
                elem: cur,
                handlers: matches
              });
            }
          }
        }
      }
      if (delegateCount < handlers.length) {
        handlerQueue.push({
          elem: this,
          handlers: handlers.slice(delegateCount)
        });
      }
      return handlerQueue;
    },
    props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),
    fixHooks: {},
    keyHooks: {
      props: "char charCode key keyCode".split(" "),
      filter: function(event, original) {
        if (event.which == null) {
          event.which = original.charCode != null ? original.charCode : original.keyCode;
        }
        return event;
      }
    },
    mouseHooks: {
      props: "button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
      filter: function(event, original) {
        var eventDoc,
            doc,
            body,
            button = original.button;
        if (event.pageX == null && original.clientX != null) {
          eventDoc = event.target.ownerDocument || document;
          doc = eventDoc.documentElement;
          body = eventDoc.body;
          event.pageX = original.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
          event.pageY = original.clientY + (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc && doc.clientTop || body && body.clientTop || 0);
        }
        if (!event.which && button !== undefined) {
          event.which = (button & 1 ? 1 : (button & 2 ? 3 : (button & 4 ? 2 : 0)));
        }
        return event;
      }
    },
    fix: function(event) {
      if (event[jQuery.expando]) {
        return event;
      }
      var i,
          prop,
          copy,
          type = event.type,
          originalEvent = event,
          fixHook = this.fixHooks[type];
      if (!fixHook) {
        this.fixHooks[type] = fixHook = rmouseEvent.test(type) ? this.mouseHooks : rkeyEvent.test(type) ? this.keyHooks : {};
      }
      copy = fixHook.props ? this.props.concat(fixHook.props) : this.props;
      event = new jQuery.Event(originalEvent);
      i = copy.length;
      while (i--) {
        prop = copy[i];
        event[prop] = originalEvent[prop];
      }
      if (!event.target) {
        event.target = document;
      }
      if (event.target.nodeType === 3) {
        event.target = event.target.parentNode;
      }
      return fixHook.filter ? fixHook.filter(event, originalEvent) : event;
    },
    special: {
      load: {noBubble: true},
      focus: {
        trigger: function() {
          if (this !== safeActiveElement() && this.focus) {
            this.focus();
            return false;
          }
        },
        delegateType: "focusin"
      },
      blur: {
        trigger: function() {
          if (this === safeActiveElement() && this.blur) {
            this.blur();
            return false;
          }
        },
        delegateType: "focusout"
      },
      click: {
        trigger: function() {
          if (this.type === "checkbox" && this.click && jQuery.nodeName(this, "input")) {
            this.click();
            return false;
          }
        },
        _default: function(event) {
          return jQuery.nodeName(event.target, "a");
        }
      },
      beforeunload: {postDispatch: function(event) {
          if (event.result !== undefined && event.originalEvent) {
            event.originalEvent.returnValue = event.result;
          }
        }}
    },
    simulate: function(type, elem, event, bubble) {
      var e = jQuery.extend(new jQuery.Event(), event, {
        type: type,
        isSimulated: true,
        originalEvent: {}
      });
      if (bubble) {
        jQuery.event.trigger(e, null, elem);
      } else {
        jQuery.event.dispatch.call(elem, e);
      }
      if (e.isDefaultPrevented()) {
        event.preventDefault();
      }
    }
  };
  jQuery.removeEvent = function(elem, type, handle) {
    if (elem.removeEventListener) {
      elem.removeEventListener(type, handle, false);
    }
  };
  jQuery.Event = function(src, props) {
    if (!(this instanceof jQuery.Event)) {
      return new jQuery.Event(src, props);
    }
    if (src && src.type) {
      this.originalEvent = src;
      this.type = src.type;
      this.isDefaultPrevented = src.defaultPrevented || src.defaultPrevented === undefined && src.returnValue === false ? returnTrue : returnFalse;
    } else {
      this.type = src;
    }
    if (props) {
      jQuery.extend(this, props);
    }
    this.timeStamp = src && src.timeStamp || jQuery.now();
    this[jQuery.expando] = true;
  };
  jQuery.Event.prototype = {
    isDefaultPrevented: returnFalse,
    isPropagationStopped: returnFalse,
    isImmediatePropagationStopped: returnFalse,
    preventDefault: function() {
      var e = this.originalEvent;
      this.isDefaultPrevented = returnTrue;
      if (e && e.preventDefault) {
        e.preventDefault();
      }
    },
    stopPropagation: function() {
      var e = this.originalEvent;
      this.isPropagationStopped = returnTrue;
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
    },
    stopImmediatePropagation: function() {
      var e = this.originalEvent;
      this.isImmediatePropagationStopped = returnTrue;
      if (e && e.stopImmediatePropagation) {
        e.stopImmediatePropagation();
      }
      this.stopPropagation();
    }
  };
  jQuery.each({
    mouseenter: "mouseover",
    mouseleave: "mouseout",
    pointerenter: "pointerover",
    pointerleave: "pointerout"
  }, function(orig, fix) {
    jQuery.event.special[orig] = {
      delegateType: fix,
      bindType: fix,
      handle: function(event) {
        var ret,
            target = this,
            related = event.relatedTarget,
            handleObj = event.handleObj;
        if (!related || (related !== target && !jQuery.contains(target, related))) {
          event.type = handleObj.origType;
          ret = handleObj.handler.apply(this, arguments);
          event.type = fix;
        }
        return ret;
      }
    };
  });
  if (!support.focusinBubbles) {
    jQuery.each({
      focus: "focusin",
      blur: "focusout"
    }, function(orig, fix) {
      var handler = function(event) {
        jQuery.event.simulate(fix, event.target, jQuery.event.fix(event), true);
      };
      jQuery.event.special[fix] = {
        setup: function() {
          var doc = this.ownerDocument || this,
              attaches = data_priv.access(doc, fix);
          if (!attaches) {
            doc.addEventListener(orig, handler, true);
          }
          data_priv.access(doc, fix, (attaches || 0) + 1);
        },
        teardown: function() {
          var doc = this.ownerDocument || this,
              attaches = data_priv.access(doc, fix) - 1;
          if (!attaches) {
            doc.removeEventListener(orig, handler, true);
            data_priv.remove(doc, fix);
          } else {
            data_priv.access(doc, fix, attaches);
          }
        }
      };
    });
  }
  jQuery.fn.extend({
    on: function(types, selector, data, fn, one) {
      var origFn,
          type;
      if (typeof types === "object") {
        if (typeof selector !== "string") {
          data = data || selector;
          selector = undefined;
        }
        for (type in types) {
          this.on(type, selector, data, types[type], one);
        }
        return this;
      }
      if (data == null && fn == null) {
        fn = selector;
        data = selector = undefined;
      } else if (fn == null) {
        if (typeof selector === "string") {
          fn = data;
          data = undefined;
        } else {
          fn = data;
          data = selector;
          selector = undefined;
        }
      }
      if (fn === false) {
        fn = returnFalse;
      } else if (!fn) {
        return this;
      }
      if (one === 1) {
        origFn = fn;
        fn = function(event) {
          jQuery().off(event);
          return origFn.apply(this, arguments);
        };
        fn.guid = origFn.guid || (origFn.guid = jQuery.guid++);
      }
      return this.each(function() {
        jQuery.event.add(this, types, fn, data, selector);
      });
    },
    one: function(types, selector, data, fn) {
      return this.on(types, selector, data, fn, 1);
    },
    off: function(types, selector, fn) {
      var handleObj,
          type;
      if (types && types.preventDefault && types.handleObj) {
        handleObj = types.handleObj;
        jQuery(types.delegateTarget).off(handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType, handleObj.selector, handleObj.handler);
        return this;
      }
      if (typeof types === "object") {
        for (type in types) {
          this.off(type, selector, types[type]);
        }
        return this;
      }
      if (selector === false || typeof selector === "function") {
        fn = selector;
        selector = undefined;
      }
      if (fn === false) {
        fn = returnFalse;
      }
      return this.each(function() {
        jQuery.event.remove(this, types, fn, selector);
      });
    },
    trigger: function(type, data) {
      return this.each(function() {
        jQuery.event.trigger(type, data, this);
      });
    },
    triggerHandler: function(type, data) {
      var elem = this[0];
      if (elem) {
        return jQuery.event.trigger(type, data, elem, true);
      }
    }
  });
  var rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
      rtagName = /<([\w:]+)/,
      rhtml = /<|&#?\w+;/,
      rnoInnerhtml = /<(?:script|style|link)/i,
      rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
      rscriptType = /^$|\/(?:java|ecma)script/i,
      rscriptTypeMasked = /^true\/(.*)/,
      rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,
      wrapMap = {
        option: [1, "<select multiple='multiple'>", "</select>"],
        thead: [1, "<table>", "</table>"],
        col: [2, "<table><colgroup>", "</colgroup></table>"],
        tr: [2, "<table><tbody>", "</tbody></table>"],
        td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],
        _default: [0, "", ""]
      };
  wrapMap.optgroup = wrapMap.option;
  wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
  wrapMap.th = wrapMap.td;
  function manipulationTarget(elem, content) {
    return jQuery.nodeName(elem, "table") && jQuery.nodeName(content.nodeType !== 11 ? content : content.firstChild, "tr") ? elem.getElementsByTagName("tbody")[0] || elem.appendChild(elem.ownerDocument.createElement("tbody")) : elem;
  }
  function disableScript(elem) {
    elem.type = (elem.getAttribute("type") !== null) + "/" + elem.type;
    return elem;
  }
  function restoreScript(elem) {
    var match = rscriptTypeMasked.exec(elem.type);
    if (match) {
      elem.type = match[1];
    } else {
      elem.removeAttribute("type");
    }
    return elem;
  }
  function setGlobalEval(elems, refElements) {
    var i = 0,
        l = elems.length;
    for (; i < l; i++) {
      data_priv.set(elems[i], "globalEval", !refElements || data_priv.get(refElements[i], "globalEval"));
    }
  }
  function cloneCopyEvent(src, dest) {
    var i,
        l,
        type,
        pdataOld,
        pdataCur,
        udataOld,
        udataCur,
        events;
    if (dest.nodeType !== 1) {
      return;
    }
    if (data_priv.hasData(src)) {
      pdataOld = data_priv.access(src);
      pdataCur = data_priv.set(dest, pdataOld);
      events = pdataOld.events;
      if (events) {
        delete pdataCur.handle;
        pdataCur.events = {};
        for (type in events) {
          for (i = 0, l = events[type].length; i < l; i++) {
            jQuery.event.add(dest, type, events[type][i]);
          }
        }
      }
    }
    if (data_user.hasData(src)) {
      udataOld = data_user.access(src);
      udataCur = jQuery.extend({}, udataOld);
      data_user.set(dest, udataCur);
    }
  }
  function getAll(context, tag) {
    var ret = context.getElementsByTagName ? context.getElementsByTagName(tag || "*") : context.querySelectorAll ? context.querySelectorAll(tag || "*") : [];
    return tag === undefined || tag && jQuery.nodeName(context, tag) ? jQuery.merge([context], ret) : ret;
  }
  function fixInput(src, dest) {
    var nodeName = dest.nodeName.toLowerCase();
    if (nodeName === "input" && rcheckableType.test(src.type)) {
      dest.checked = src.checked;
    } else if (nodeName === "input" || nodeName === "textarea") {
      dest.defaultValue = src.defaultValue;
    }
  }
  jQuery.extend({
    clone: function(elem, dataAndEvents, deepDataAndEvents) {
      var i,
          l,
          srcElements,
          destElements,
          clone = elem.cloneNode(true),
          inPage = jQuery.contains(elem.ownerDocument, elem);
      if (!support.noCloneChecked && (elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem)) {
        destElements = getAll(clone);
        srcElements = getAll(elem);
        for (i = 0, l = srcElements.length; i < l; i++) {
          fixInput(srcElements[i], destElements[i]);
        }
      }
      if (dataAndEvents) {
        if (deepDataAndEvents) {
          srcElements = srcElements || getAll(elem);
          destElements = destElements || getAll(clone);
          for (i = 0, l = srcElements.length; i < l; i++) {
            cloneCopyEvent(srcElements[i], destElements[i]);
          }
        } else {
          cloneCopyEvent(elem, clone);
        }
      }
      destElements = getAll(clone, "script");
      if (destElements.length > 0) {
        setGlobalEval(destElements, !inPage && getAll(elem, "script"));
      }
      return clone;
    },
    buildFragment: function(elems, context, scripts, selection) {
      var elem,
          tmp,
          tag,
          wrap,
          contains,
          j,
          fragment = context.createDocumentFragment(),
          nodes = [],
          i = 0,
          l = elems.length;
      for (; i < l; i++) {
        elem = elems[i];
        if (elem || elem === 0) {
          if (jQuery.type(elem) === "object") {
            jQuery.merge(nodes, elem.nodeType ? [elem] : elem);
          } else if (!rhtml.test(elem)) {
            nodes.push(context.createTextNode(elem));
          } else {
            tmp = tmp || fragment.appendChild(context.createElement("div"));
            tag = (rtagName.exec(elem) || ["", ""])[1].toLowerCase();
            wrap = wrapMap[tag] || wrapMap._default;
            tmp.innerHTML = wrap[1] + elem.replace(rxhtmlTag, "<$1></$2>") + wrap[2];
            j = wrap[0];
            while (j--) {
              tmp = tmp.lastChild;
            }
            jQuery.merge(nodes, tmp.childNodes);
            tmp = fragment.firstChild;
            tmp.textContent = "";
          }
        }
      }
      fragment.textContent = "";
      i = 0;
      while ((elem = nodes[i++])) {
        if (selection && jQuery.inArray(elem, selection) !== -1) {
          continue;
        }
        contains = jQuery.contains(elem.ownerDocument, elem);
        tmp = getAll(fragment.appendChild(elem), "script");
        if (contains) {
          setGlobalEval(tmp);
        }
        if (scripts) {
          j = 0;
          while ((elem = tmp[j++])) {
            if (rscriptType.test(elem.type || "")) {
              scripts.push(elem);
            }
          }
        }
      }
      return fragment;
    },
    cleanData: function(elems) {
      var data,
          elem,
          type,
          key,
          special = jQuery.event.special,
          i = 0;
      for (; (elem = elems[i]) !== undefined; i++) {
        if (jQuery.acceptData(elem)) {
          key = elem[data_priv.expando];
          if (key && (data = data_priv.cache[key])) {
            if (data.events) {
              for (type in data.events) {
                if (special[type]) {
                  jQuery.event.remove(elem, type);
                } else {
                  jQuery.removeEvent(elem, type, data.handle);
                }
              }
            }
            if (data_priv.cache[key]) {
              delete data_priv.cache[key];
            }
          }
        }
        delete data_user.cache[elem[data_user.expando]];
      }
    }
  });
  jQuery.fn.extend({
    text: function(value) {
      return access(this, function(value) {
        return value === undefined ? jQuery.text(this) : this.empty().each(function() {
          if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
            this.textContent = value;
          }
        });
      }, null, value, arguments.length);
    },
    append: function() {
      return this.domManip(arguments, function(elem) {
        if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
          var target = manipulationTarget(this, elem);
          target.appendChild(elem);
        }
      });
    },
    prepend: function() {
      return this.domManip(arguments, function(elem) {
        if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
          var target = manipulationTarget(this, elem);
          target.insertBefore(elem, target.firstChild);
        }
      });
    },
    before: function() {
      return this.domManip(arguments, function(elem) {
        if (this.parentNode) {
          this.parentNode.insertBefore(elem, this);
        }
      });
    },
    after: function() {
      return this.domManip(arguments, function(elem) {
        if (this.parentNode) {
          this.parentNode.insertBefore(elem, this.nextSibling);
        }
      });
    },
    remove: function(selector, keepData) {
      var elem,
          elems = selector ? jQuery.filter(selector, this) : this,
          i = 0;
      for (; (elem = elems[i]) != null; i++) {
        if (!keepData && elem.nodeType === 1) {
          jQuery.cleanData(getAll(elem));
        }
        if (elem.parentNode) {
          if (keepData && jQuery.contains(elem.ownerDocument, elem)) {
            setGlobalEval(getAll(elem, "script"));
          }
          elem.parentNode.removeChild(elem);
        }
      }
      return this;
    },
    empty: function() {
      var elem,
          i = 0;
      for (; (elem = this[i]) != null; i++) {
        if (elem.nodeType === 1) {
          jQuery.cleanData(getAll(elem, false));
          elem.textContent = "";
        }
      }
      return this;
    },
    clone: function(dataAndEvents, deepDataAndEvents) {
      dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
      deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;
      return this.map(function() {
        return jQuery.clone(this, dataAndEvents, deepDataAndEvents);
      });
    },
    html: function(value) {
      return access(this, function(value) {
        var elem = this[0] || {},
            i = 0,
            l = this.length;
        if (value === undefined && elem.nodeType === 1) {
          return elem.innerHTML;
        }
        if (typeof value === "string" && !rnoInnerhtml.test(value) && !wrapMap[(rtagName.exec(value) || ["", ""])[1].toLowerCase()]) {
          value = value.replace(rxhtmlTag, "<$1></$2>");
          try {
            for (; i < l; i++) {
              elem = this[i] || {};
              if (elem.nodeType === 1) {
                jQuery.cleanData(getAll(elem, false));
                elem.innerHTML = value;
              }
            }
            elem = 0;
          } catch (e) {}
        }
        if (elem) {
          this.empty().append(value);
        }
      }, null, value, arguments.length);
    },
    replaceWith: function() {
      var arg = arguments[0];
      this.domManip(arguments, function(elem) {
        arg = this.parentNode;
        jQuery.cleanData(getAll(this));
        if (arg) {
          arg.replaceChild(elem, this);
        }
      });
      return arg && (arg.length || arg.nodeType) ? this : this.remove();
    },
    detach: function(selector) {
      return this.remove(selector, true);
    },
    domManip: function(args, callback) {
      args = concat.apply([], args);
      var fragment,
          first,
          scripts,
          hasScripts,
          node,
          doc,
          i = 0,
          l = this.length,
          set = this,
          iNoClone = l - 1,
          value = args[0],
          isFunction = jQuery.isFunction(value);
      if (isFunction || (l > 1 && typeof value === "string" && !support.checkClone && rchecked.test(value))) {
        return this.each(function(index) {
          var self = set.eq(index);
          if (isFunction) {
            args[0] = value.call(this, index, self.html());
          }
          self.domManip(args, callback);
        });
      }
      if (l) {
        fragment = jQuery.buildFragment(args, this[0].ownerDocument, false, this);
        first = fragment.firstChild;
        if (fragment.childNodes.length === 1) {
          fragment = first;
        }
        if (first) {
          scripts = jQuery.map(getAll(fragment, "script"), disableScript);
          hasScripts = scripts.length;
          for (; i < l; i++) {
            node = fragment;
            if (i !== iNoClone) {
              node = jQuery.clone(node, true, true);
              if (hasScripts) {
                jQuery.merge(scripts, getAll(node, "script"));
              }
            }
            callback.call(this[i], node, i);
          }
          if (hasScripts) {
            doc = scripts[scripts.length - 1].ownerDocument;
            jQuery.map(scripts, restoreScript);
            for (i = 0; i < hasScripts; i++) {
              node = scripts[i];
              if (rscriptType.test(node.type || "") && !data_priv.access(node, "globalEval") && jQuery.contains(doc, node)) {
                if (node.src) {
                  if (jQuery._evalUrl) {
                    jQuery._evalUrl(node.src);
                  }
                } else {
                  jQuery.globalEval(node.textContent.replace(rcleanScript, ""));
                }
              }
            }
          }
        }
      }
      return this;
    }
  });
  jQuery.each({
    appendTo: "append",
    prependTo: "prepend",
    insertBefore: "before",
    insertAfter: "after",
    replaceAll: "replaceWith"
  }, function(name, original) {
    jQuery.fn[name] = function(selector) {
      var elems,
          ret = [],
          insert = jQuery(selector),
          last = insert.length - 1,
          i = 0;
      for (; i <= last; i++) {
        elems = i === last ? this : this.clone(true);
        jQuery(insert[i])[original](elems);
        push.apply(ret, elems.get());
      }
      return this.pushStack(ret);
    };
  });
  var iframe,
      elemdisplay = {};
  function actualDisplay(name, doc) {
    var style,
        elem = jQuery(doc.createElement(name)).appendTo(doc.body),
        display = window.getDefaultComputedStyle && (style = window.getDefaultComputedStyle(elem[0])) ? style.display : jQuery.css(elem[0], "display");
    elem.detach();
    return display;
  }
  function defaultDisplay(nodeName) {
    var doc = document,
        display = elemdisplay[nodeName];
    if (!display) {
      display = actualDisplay(nodeName, doc);
      if (display === "none" || !display) {
        iframe = (iframe || jQuery("<iframe frameborder='0' width='0' height='0'/>")).appendTo(doc.documentElement);
        doc = iframe[0].contentDocument;
        doc.write();
        doc.close();
        display = actualDisplay(nodeName, doc);
        iframe.detach();
      }
      elemdisplay[nodeName] = display;
    }
    return display;
  }
  var rmargin = (/^margin/);
  var rnumnonpx = new RegExp("^(" + pnum + ")(?!px)[a-z%]+$", "i");
  var getStyles = function(elem) {
    if (elem.ownerDocument.defaultView.opener) {
      return elem.ownerDocument.defaultView.getComputedStyle(elem, null);
    }
    return window.getComputedStyle(elem, null);
  };
  function curCSS(elem, name, computed) {
    var width,
        minWidth,
        maxWidth,
        ret,
        style = elem.style;
    computed = computed || getStyles(elem);
    if (computed) {
      ret = computed.getPropertyValue(name) || computed[name];
    }
    if (computed) {
      if (ret === "" && !jQuery.contains(elem.ownerDocument, elem)) {
        ret = jQuery.style(elem, name);
      }
      if (rnumnonpx.test(ret) && rmargin.test(name)) {
        width = style.width;
        minWidth = style.minWidth;
        maxWidth = style.maxWidth;
        style.minWidth = style.maxWidth = style.width = ret;
        ret = computed.width;
        style.width = width;
        style.minWidth = minWidth;
        style.maxWidth = maxWidth;
      }
    }
    return ret !== undefined ? ret + "" : ret;
  }
  function addGetHookIf(conditionFn, hookFn) {
    return {get: function() {
        if (conditionFn()) {
          delete this.get;
          return;
        }
        return (this.get = hookFn).apply(this, arguments);
      }};
  }
  (function() {
    var pixelPositionVal,
        boxSizingReliableVal,
        docElem = document.documentElement,
        container = document.createElement("div"),
        div = document.createElement("div");
    if (!div.style) {
      return;
    }
    div.style.backgroundClip = "content-box";
    div.cloneNode(true).style.backgroundClip = "";
    support.clearCloneStyle = div.style.backgroundClip === "content-box";
    container.style.cssText = "border:0;width:0;height:0;top:0;left:-9999px;margin-top:1px;" + "position:absolute";
    container.appendChild(div);
    function computePixelPositionAndBoxSizingReliable() {
      div.style.cssText = "-webkit-box-sizing:border-box;-moz-box-sizing:border-box;" + "box-sizing:border-box;display:block;margin-top:1%;top:1%;" + "border:1px;padding:1px;width:4px;position:absolute";
      div.innerHTML = "";
      docElem.appendChild(container);
      var divStyle = window.getComputedStyle(div, null);
      pixelPositionVal = divStyle.top !== "1%";
      boxSizingReliableVal = divStyle.width === "4px";
      docElem.removeChild(container);
    }
    if (window.getComputedStyle) {
      jQuery.extend(support, {
        pixelPosition: function() {
          computePixelPositionAndBoxSizingReliable();
          return pixelPositionVal;
        },
        boxSizingReliable: function() {
          if (boxSizingReliableVal == null) {
            computePixelPositionAndBoxSizingReliable();
          }
          return boxSizingReliableVal;
        },
        reliableMarginRight: function() {
          var ret,
              marginDiv = div.appendChild(document.createElement("div"));
          marginDiv.style.cssText = div.style.cssText = "-webkit-box-sizing:content-box;-moz-box-sizing:content-box;" + "box-sizing:content-box;display:block;margin:0;border:0;padding:0";
          marginDiv.style.marginRight = marginDiv.style.width = "0";
          div.style.width = "1px";
          docElem.appendChild(container);
          ret = !parseFloat(window.getComputedStyle(marginDiv, null).marginRight);
          docElem.removeChild(container);
          div.removeChild(marginDiv);
          return ret;
        }
      });
    }
  })();
  jQuery.swap = function(elem, options, callback, args) {
    var ret,
        name,
        old = {};
    for (name in options) {
      old[name] = elem.style[name];
      elem.style[name] = options[name];
    }
    ret = callback.apply(elem, args || []);
    for (name in options) {
      elem.style[name] = old[name];
    }
    return ret;
  };
  var rdisplayswap = /^(none|table(?!-c[ea]).+)/,
      rnumsplit = new RegExp("^(" + pnum + ")(.*)$", "i"),
      rrelNum = new RegExp("^([+-])=(" + pnum + ")", "i"),
      cssShow = {
        position: "absolute",
        visibility: "hidden",
        display: "block"
      },
      cssNormalTransform = {
        letterSpacing: "0",
        fontWeight: "400"
      },
      cssPrefixes = ["Webkit", "O", "Moz", "ms"];
  function vendorPropName(style, name) {
    if (name in style) {
      return name;
    }
    var capName = name[0].toUpperCase() + name.slice(1),
        origName = name,
        i = cssPrefixes.length;
    while (i--) {
      name = cssPrefixes[i] + capName;
      if (name in style) {
        return name;
      }
    }
    return origName;
  }
  function setPositiveNumber(elem, value, subtract) {
    var matches = rnumsplit.exec(value);
    return matches ? Math.max(0, matches[1] - (subtract || 0)) + (matches[2] || "px") : value;
  }
  function augmentWidthOrHeight(elem, name, extra, isBorderBox, styles) {
    var i = extra === (isBorderBox ? "border" : "content") ? 4 : name === "width" ? 1 : 0,
        val = 0;
    for (; i < 4; i += 2) {
      if (extra === "margin") {
        val += jQuery.css(elem, extra + cssExpand[i], true, styles);
      }
      if (isBorderBox) {
        if (extra === "content") {
          val -= jQuery.css(elem, "padding" + cssExpand[i], true, styles);
        }
        if (extra !== "margin") {
          val -= jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
        }
      } else {
        val += jQuery.css(elem, "padding" + cssExpand[i], true, styles);
        if (extra !== "padding") {
          val += jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
        }
      }
    }
    return val;
  }
  function getWidthOrHeight(elem, name, extra) {
    var valueIsBorderBox = true,
        val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
        styles = getStyles(elem),
        isBorderBox = jQuery.css(elem, "boxSizing", false, styles) === "border-box";
    if (val <= 0 || val == null) {
      val = curCSS(elem, name, styles);
      if (val < 0 || val == null) {
        val = elem.style[name];
      }
      if (rnumnonpx.test(val)) {
        return val;
      }
      valueIsBorderBox = isBorderBox && (support.boxSizingReliable() || val === elem.style[name]);
      val = parseFloat(val) || 0;
    }
    return (val + augmentWidthOrHeight(elem, name, extra || (isBorderBox ? "border" : "content"), valueIsBorderBox, styles)) + "px";
  }
  function showHide(elements, show) {
    var display,
        elem,
        hidden,
        values = [],
        index = 0,
        length = elements.length;
    for (; index < length; index++) {
      elem = elements[index];
      if (!elem.style) {
        continue;
      }
      values[index] = data_priv.get(elem, "olddisplay");
      display = elem.style.display;
      if (show) {
        if (!values[index] && display === "none") {
          elem.style.display = "";
        }
        if (elem.style.display === "" && isHidden(elem)) {
          values[index] = data_priv.access(elem, "olddisplay", defaultDisplay(elem.nodeName));
        }
      } else {
        hidden = isHidden(elem);
        if (display !== "none" || !hidden) {
          data_priv.set(elem, "olddisplay", hidden ? display : jQuery.css(elem, "display"));
        }
      }
    }
    for (index = 0; index < length; index++) {
      elem = elements[index];
      if (!elem.style) {
        continue;
      }
      if (!show || elem.style.display === "none" || elem.style.display === "") {
        elem.style.display = show ? values[index] || "" : "none";
      }
    }
    return elements;
  }
  jQuery.extend({
    cssHooks: {opacity: {get: function(elem, computed) {
          if (computed) {
            var ret = curCSS(elem, "opacity");
            return ret === "" ? "1" : ret;
          }
        }}},
    cssNumber: {
      "columnCount": true,
      "fillOpacity": true,
      "flexGrow": true,
      "flexShrink": true,
      "fontWeight": true,
      "lineHeight": true,
      "opacity": true,
      "order": true,
      "orphans": true,
      "widows": true,
      "zIndex": true,
      "zoom": true
    },
    cssProps: {"float": "cssFloat"},
    style: function(elem, name, value, extra) {
      if (!elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style) {
        return;
      }
      var ret,
          type,
          hooks,
          origName = jQuery.camelCase(name),
          style = elem.style;
      name = jQuery.cssProps[origName] || (jQuery.cssProps[origName] = vendorPropName(style, origName));
      hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];
      if (value !== undefined) {
        type = typeof value;
        if (type === "string" && (ret = rrelNum.exec(value))) {
          value = (ret[1] + 1) * ret[2] + parseFloat(jQuery.css(elem, name));
          type = "number";
        }
        if (value == null || value !== value) {
          return;
        }
        if (type === "number" && !jQuery.cssNumber[origName]) {
          value += "px";
        }
        if (!support.clearCloneStyle && value === "" && name.indexOf("background") === 0) {
          style[name] = "inherit";
        }
        if (!hooks || !("set" in hooks) || (value = hooks.set(elem, value, extra)) !== undefined) {
          style[name] = value;
        }
      } else {
        if (hooks && "get" in hooks && (ret = hooks.get(elem, false, extra)) !== undefined) {
          return ret;
        }
        return style[name];
      }
    },
    css: function(elem, name, extra, styles) {
      var val,
          num,
          hooks,
          origName = jQuery.camelCase(name);
      name = jQuery.cssProps[origName] || (jQuery.cssProps[origName] = vendorPropName(elem.style, origName));
      hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];
      if (hooks && "get" in hooks) {
        val = hooks.get(elem, true, extra);
      }
      if (val === undefined) {
        val = curCSS(elem, name, styles);
      }
      if (val === "normal" && name in cssNormalTransform) {
        val = cssNormalTransform[name];
      }
      if (extra === "" || extra) {
        num = parseFloat(val);
        return extra === true || jQuery.isNumeric(num) ? num || 0 : val;
      }
      return val;
    }
  });
  jQuery.each(["height", "width"], function(i, name) {
    jQuery.cssHooks[name] = {
      get: function(elem, computed, extra) {
        if (computed) {
          return rdisplayswap.test(jQuery.css(elem, "display")) && elem.offsetWidth === 0 ? jQuery.swap(elem, cssShow, function() {
            return getWidthOrHeight(elem, name, extra);
          }) : getWidthOrHeight(elem, name, extra);
        }
      },
      set: function(elem, value, extra) {
        var styles = extra && getStyles(elem);
        return setPositiveNumber(elem, value, extra ? augmentWidthOrHeight(elem, name, extra, jQuery.css(elem, "boxSizing", false, styles) === "border-box", styles) : 0);
      }
    };
  });
  jQuery.cssHooks.marginRight = addGetHookIf(support.reliableMarginRight, function(elem, computed) {
    if (computed) {
      return jQuery.swap(elem, {"display": "inline-block"}, curCSS, [elem, "marginRight"]);
    }
  });
  jQuery.each({
    margin: "",
    padding: "",
    border: "Width"
  }, function(prefix, suffix) {
    jQuery.cssHooks[prefix + suffix] = {expand: function(value) {
        var i = 0,
            expanded = {},
            parts = typeof value === "string" ? value.split(" ") : [value];
        for (; i < 4; i++) {
          expanded[prefix + cssExpand[i] + suffix] = parts[i] || parts[i - 2] || parts[0];
        }
        return expanded;
      }};
    if (!rmargin.test(prefix)) {
      jQuery.cssHooks[prefix + suffix].set = setPositiveNumber;
    }
  });
  jQuery.fn.extend({
    css: function(name, value) {
      return access(this, function(elem, name, value) {
        var styles,
            len,
            map = {},
            i = 0;
        if (jQuery.isArray(name)) {
          styles = getStyles(elem);
          len = name.length;
          for (; i < len; i++) {
            map[name[i]] = jQuery.css(elem, name[i], false, styles);
          }
          return map;
        }
        return value !== undefined ? jQuery.style(elem, name, value) : jQuery.css(elem, name);
      }, name, value, arguments.length > 1);
    },
    show: function() {
      return showHide(this, true);
    },
    hide: function() {
      return showHide(this);
    },
    toggle: function(state) {
      if (typeof state === "boolean") {
        return state ? this.show() : this.hide();
      }
      return this.each(function() {
        if (isHidden(this)) {
          jQuery(this).show();
        } else {
          jQuery(this).hide();
        }
      });
    }
  });
  function Tween(elem, options, prop, end, easing) {
    return new Tween.prototype.init(elem, options, prop, end, easing);
  }
  jQuery.Tween = Tween;
  Tween.prototype = {
    constructor: Tween,
    init: function(elem, options, prop, end, easing, unit) {
      this.elem = elem;
      this.prop = prop;
      this.easing = easing || "swing";
      this.options = options;
      this.start = this.now = this.cur();
      this.end = end;
      this.unit = unit || (jQuery.cssNumber[prop] ? "" : "px");
    },
    cur: function() {
      var hooks = Tween.propHooks[this.prop];
      return hooks && hooks.get ? hooks.get(this) : Tween.propHooks._default.get(this);
    },
    run: function(percent) {
      var eased,
          hooks = Tween.propHooks[this.prop];
      if (this.options.duration) {
        this.pos = eased = jQuery.easing[this.easing](percent, this.options.duration * percent, 0, 1, this.options.duration);
      } else {
        this.pos = eased = percent;
      }
      this.now = (this.end - this.start) * eased + this.start;
      if (this.options.step) {
        this.options.step.call(this.elem, this.now, this);
      }
      if (hooks && hooks.set) {
        hooks.set(this);
      } else {
        Tween.propHooks._default.set(this);
      }
      return this;
    }
  };
  Tween.prototype.init.prototype = Tween.prototype;
  Tween.propHooks = {_default: {
      get: function(tween) {
        var result;
        if (tween.elem[tween.prop] != null && (!tween.elem.style || tween.elem.style[tween.prop] == null)) {
          return tween.elem[tween.prop];
        }
        result = jQuery.css(tween.elem, tween.prop, "");
        return !result || result === "auto" ? 0 : result;
      },
      set: function(tween) {
        if (jQuery.fx.step[tween.prop]) {
          jQuery.fx.step[tween.prop](tween);
        } else if (tween.elem.style && (tween.elem.style[jQuery.cssProps[tween.prop]] != null || jQuery.cssHooks[tween.prop])) {
          jQuery.style(tween.elem, tween.prop, tween.now + tween.unit);
        } else {
          tween.elem[tween.prop] = tween.now;
        }
      }
    }};
  Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {set: function(tween) {
      if (tween.elem.nodeType && tween.elem.parentNode) {
        tween.elem[tween.prop] = tween.now;
      }
    }};
  jQuery.easing = {
    linear: function(p) {
      return p;
    },
    swing: function(p) {
      return 0.5 - Math.cos(p * Math.PI) / 2;
    }
  };
  jQuery.fx = Tween.prototype.init;
  jQuery.fx.step = {};
  var fxNow,
      timerId,
      rfxtypes = /^(?:toggle|show|hide)$/,
      rfxnum = new RegExp("^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i"),
      rrun = /queueHooks$/,
      animationPrefilters = [defaultPrefilter],
      tweeners = {"*": [function(prop, value) {
          var tween = this.createTween(prop, value),
              target = tween.cur(),
              parts = rfxnum.exec(value),
              unit = parts && parts[3] || (jQuery.cssNumber[prop] ? "" : "px"),
              start = (jQuery.cssNumber[prop] || unit !== "px" && +target) && rfxnum.exec(jQuery.css(tween.elem, prop)),
              scale = 1,
              maxIterations = 20;
          if (start && start[3] !== unit) {
            unit = unit || start[3];
            parts = parts || [];
            start = +target || 1;
            do {
              scale = scale || ".5";
              start = start / scale;
              jQuery.style(tween.elem, prop, start + unit);
            } while (scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations);
          }
          if (parts) {
            start = tween.start = +start || +target || 0;
            tween.unit = unit;
            tween.end = parts[1] ? start + (parts[1] + 1) * parts[2] : +parts[2];
          }
          return tween;
        }]};
  function createFxNow() {
    setTimeout(function() {
      fxNow = undefined;
    });
    return (fxNow = jQuery.now());
  }
  function genFx(type, includeWidth) {
    var which,
        i = 0,
        attrs = {height: type};
    includeWidth = includeWidth ? 1 : 0;
    for (; i < 4; i += 2 - includeWidth) {
      which = cssExpand[i];
      attrs["margin" + which] = attrs["padding" + which] = type;
    }
    if (includeWidth) {
      attrs.opacity = attrs.width = type;
    }
    return attrs;
  }
  function createTween(value, prop, animation) {
    var tween,
        collection = (tweeners[prop] || []).concat(tweeners["*"]),
        index = 0,
        length = collection.length;
    for (; index < length; index++) {
      if ((tween = collection[index].call(animation, prop, value))) {
        return tween;
      }
    }
  }
  function defaultPrefilter(elem, props, opts) {
    var prop,
        value,
        toggle,
        tween,
        hooks,
        oldfire,
        display,
        checkDisplay,
        anim = this,
        orig = {},
        style = elem.style,
        hidden = elem.nodeType && isHidden(elem),
        dataShow = data_priv.get(elem, "fxshow");
    if (!opts.queue) {
      hooks = jQuery._queueHooks(elem, "fx");
      if (hooks.unqueued == null) {
        hooks.unqueued = 0;
        oldfire = hooks.empty.fire;
        hooks.empty.fire = function() {
          if (!hooks.unqueued) {
            oldfire();
          }
        };
      }
      hooks.unqueued++;
      anim.always(function() {
        anim.always(function() {
          hooks.unqueued--;
          if (!jQuery.queue(elem, "fx").length) {
            hooks.empty.fire();
          }
        });
      });
    }
    if (elem.nodeType === 1 && ("height" in props || "width" in props)) {
      opts.overflow = [style.overflow, style.overflowX, style.overflowY];
      display = jQuery.css(elem, "display");
      checkDisplay = display === "none" ? data_priv.get(elem, "olddisplay") || defaultDisplay(elem.nodeName) : display;
      if (checkDisplay === "inline" && jQuery.css(elem, "float") === "none") {
        style.display = "inline-block";
      }
    }
    if (opts.overflow) {
      style.overflow = "hidden";
      anim.always(function() {
        style.overflow = opts.overflow[0];
        style.overflowX = opts.overflow[1];
        style.overflowY = opts.overflow[2];
      });
    }
    for (prop in props) {
      value = props[prop];
      if (rfxtypes.exec(value)) {
        delete props[prop];
        toggle = toggle || value === "toggle";
        if (value === (hidden ? "hide" : "show")) {
          if (value === "show" && dataShow && dataShow[prop] !== undefined) {
            hidden = true;
          } else {
            continue;
          }
        }
        orig[prop] = dataShow && dataShow[prop] || jQuery.style(elem, prop);
      } else {
        display = undefined;
      }
    }
    if (!jQuery.isEmptyObject(orig)) {
      if (dataShow) {
        if ("hidden" in dataShow) {
          hidden = dataShow.hidden;
        }
      } else {
        dataShow = data_priv.access(elem, "fxshow", {});
      }
      if (toggle) {
        dataShow.hidden = !hidden;
      }
      if (hidden) {
        jQuery(elem).show();
      } else {
        anim.done(function() {
          jQuery(elem).hide();
        });
      }
      anim.done(function() {
        var prop;
        data_priv.remove(elem, "fxshow");
        for (prop in orig) {
          jQuery.style(elem, prop, orig[prop]);
        }
      });
      for (prop in orig) {
        tween = createTween(hidden ? dataShow[prop] : 0, prop, anim);
        if (!(prop in dataShow)) {
          dataShow[prop] = tween.start;
          if (hidden) {
            tween.end = tween.start;
            tween.start = prop === "width" || prop === "height" ? 1 : 0;
          }
        }
      }
    } else if ((display === "none" ? defaultDisplay(elem.nodeName) : display) === "inline") {
      style.display = display;
    }
  }
  function propFilter(props, specialEasing) {
    var index,
        name,
        easing,
        value,
        hooks;
    for (index in props) {
      name = jQuery.camelCase(index);
      easing = specialEasing[name];
      value = props[index];
      if (jQuery.isArray(value)) {
        easing = value[1];
        value = props[index] = value[0];
      }
      if (index !== name) {
        props[name] = value;
        delete props[index];
      }
      hooks = jQuery.cssHooks[name];
      if (hooks && "expand" in hooks) {
        value = hooks.expand(value);
        delete props[name];
        for (index in value) {
          if (!(index in props)) {
            props[index] = value[index];
            specialEasing[index] = easing;
          }
        }
      } else {
        specialEasing[name] = easing;
      }
    }
  }
  function Animation(elem, properties, options) {
    var result,
        stopped,
        index = 0,
        length = animationPrefilters.length,
        deferred = jQuery.Deferred().always(function() {
          delete tick.elem;
        }),
        tick = function() {
          if (stopped) {
            return false;
          }
          var currentTime = fxNow || createFxNow(),
              remaining = Math.max(0, animation.startTime + animation.duration - currentTime),
              temp = remaining / animation.duration || 0,
              percent = 1 - temp,
              index = 0,
              length = animation.tweens.length;
          for (; index < length; index++) {
            animation.tweens[index].run(percent);
          }
          deferred.notifyWith(elem, [animation, percent, remaining]);
          if (percent < 1 && length) {
            return remaining;
          } else {
            deferred.resolveWith(elem, [animation]);
            return false;
          }
        },
        animation = deferred.promise({
          elem: elem,
          props: jQuery.extend({}, properties),
          opts: jQuery.extend(true, {specialEasing: {}}, options),
          originalProperties: properties,
          originalOptions: options,
          startTime: fxNow || createFxNow(),
          duration: options.duration,
          tweens: [],
          createTween: function(prop, end) {
            var tween = jQuery.Tween(elem, animation.opts, prop, end, animation.opts.specialEasing[prop] || animation.opts.easing);
            animation.tweens.push(tween);
            return tween;
          },
          stop: function(gotoEnd) {
            var index = 0,
                length = gotoEnd ? animation.tweens.length : 0;
            if (stopped) {
              return this;
            }
            stopped = true;
            for (; index < length; index++) {
              animation.tweens[index].run(1);
            }
            if (gotoEnd) {
              deferred.resolveWith(elem, [animation, gotoEnd]);
            } else {
              deferred.rejectWith(elem, [animation, gotoEnd]);
            }
            return this;
          }
        }),
        props = animation.props;
    propFilter(props, animation.opts.specialEasing);
    for (; index < length; index++) {
      result = animationPrefilters[index].call(animation, elem, props, animation.opts);
      if (result) {
        return result;
      }
    }
    jQuery.map(props, createTween, animation);
    if (jQuery.isFunction(animation.opts.start)) {
      animation.opts.start.call(elem, animation);
    }
    jQuery.fx.timer(jQuery.extend(tick, {
      elem: elem,
      anim: animation,
      queue: animation.opts.queue
    }));
    return animation.progress(animation.opts.progress).done(animation.opts.done, animation.opts.complete).fail(animation.opts.fail).always(animation.opts.always);
  }
  jQuery.Animation = jQuery.extend(Animation, {
    tweener: function(props, callback) {
      if (jQuery.isFunction(props)) {
        callback = props;
        props = ["*"];
      } else {
        props = props.split(" ");
      }
      var prop,
          index = 0,
          length = props.length;
      for (; index < length; index++) {
        prop = props[index];
        tweeners[prop] = tweeners[prop] || [];
        tweeners[prop].unshift(callback);
      }
    },
    prefilter: function(callback, prepend) {
      if (prepend) {
        animationPrefilters.unshift(callback);
      } else {
        animationPrefilters.push(callback);
      }
    }
  });
  jQuery.speed = function(speed, easing, fn) {
    var opt = speed && typeof speed === "object" ? jQuery.extend({}, speed) : {
      complete: fn || !fn && easing || jQuery.isFunction(speed) && speed,
      duration: speed,
      easing: fn && easing || easing && !jQuery.isFunction(easing) && easing
    };
    opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration : opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[opt.duration] : jQuery.fx.speeds._default;
    if (opt.queue == null || opt.queue === true) {
      opt.queue = "fx";
    }
    opt.old = opt.complete;
    opt.complete = function() {
      if (jQuery.isFunction(opt.old)) {
        opt.old.call(this);
      }
      if (opt.queue) {
        jQuery.dequeue(this, opt.queue);
      }
    };
    return opt;
  };
  jQuery.fn.extend({
    fadeTo: function(speed, to, easing, callback) {
      return this.filter(isHidden).css("opacity", 0).show().end().animate({opacity: to}, speed, easing, callback);
    },
    animate: function(prop, speed, easing, callback) {
      var empty = jQuery.isEmptyObject(prop),
          optall = jQuery.speed(speed, easing, callback),
          doAnimation = function() {
            var anim = Animation(this, jQuery.extend({}, prop), optall);
            if (empty || data_priv.get(this, "finish")) {
              anim.stop(true);
            }
          };
      doAnimation.finish = doAnimation;
      return empty || optall.queue === false ? this.each(doAnimation) : this.queue(optall.queue, doAnimation);
    },
    stop: function(type, clearQueue, gotoEnd) {
      var stopQueue = function(hooks) {
        var stop = hooks.stop;
        delete hooks.stop;
        stop(gotoEnd);
      };
      if (typeof type !== "string") {
        gotoEnd = clearQueue;
        clearQueue = type;
        type = undefined;
      }
      if (clearQueue && type !== false) {
        this.queue(type || "fx", []);
      }
      return this.each(function() {
        var dequeue = true,
            index = type != null && type + "queueHooks",
            timers = jQuery.timers,
            data = data_priv.get(this);
        if (index) {
          if (data[index] && data[index].stop) {
            stopQueue(data[index]);
          }
        } else {
          for (index in data) {
            if (data[index] && data[index].stop && rrun.test(index)) {
              stopQueue(data[index]);
            }
          }
        }
        for (index = timers.length; index--; ) {
          if (timers[index].elem === this && (type == null || timers[index].queue === type)) {
            timers[index].anim.stop(gotoEnd);
            dequeue = false;
            timers.splice(index, 1);
          }
        }
        if (dequeue || !gotoEnd) {
          jQuery.dequeue(this, type);
        }
      });
    },
    finish: function(type) {
      if (type !== false) {
        type = type || "fx";
      }
      return this.each(function() {
        var index,
            data = data_priv.get(this),
            queue = data[type + "queue"],
            hooks = data[type + "queueHooks"],
            timers = jQuery.timers,
            length = queue ? queue.length : 0;
        data.finish = true;
        jQuery.queue(this, type, []);
        if (hooks && hooks.stop) {
          hooks.stop.call(this, true);
        }
        for (index = timers.length; index--; ) {
          if (timers[index].elem === this && timers[index].queue === type) {
            timers[index].anim.stop(true);
            timers.splice(index, 1);
          }
        }
        for (index = 0; index < length; index++) {
          if (queue[index] && queue[index].finish) {
            queue[index].finish.call(this);
          }
        }
        delete data.finish;
      });
    }
  });
  jQuery.each(["toggle", "show", "hide"], function(i, name) {
    var cssFn = jQuery.fn[name];
    jQuery.fn[name] = function(speed, easing, callback) {
      return speed == null || typeof speed === "boolean" ? cssFn.apply(this, arguments) : this.animate(genFx(name, true), speed, easing, callback);
    };
  });
  jQuery.each({
    slideDown: genFx("show"),
    slideUp: genFx("hide"),
    slideToggle: genFx("toggle"),
    fadeIn: {opacity: "show"},
    fadeOut: {opacity: "hide"},
    fadeToggle: {opacity: "toggle"}
  }, function(name, props) {
    jQuery.fn[name] = function(speed, easing, callback) {
      return this.animate(props, speed, easing, callback);
    };
  });
  jQuery.timers = [];
  jQuery.fx.tick = function() {
    var timer,
        i = 0,
        timers = jQuery.timers;
    fxNow = jQuery.now();
    for (; i < timers.length; i++) {
      timer = timers[i];
      if (!timer() && timers[i] === timer) {
        timers.splice(i--, 1);
      }
    }
    if (!timers.length) {
      jQuery.fx.stop();
    }
    fxNow = undefined;
  };
  jQuery.fx.timer = function(timer) {
    jQuery.timers.push(timer);
    if (timer()) {
      jQuery.fx.start();
    } else {
      jQuery.timers.pop();
    }
  };
  jQuery.fx.interval = 13;
  jQuery.fx.start = function() {
    if (!timerId) {
      timerId = setInterval(jQuery.fx.tick, jQuery.fx.interval);
    }
  };
  jQuery.fx.stop = function() {
    clearInterval(timerId);
    timerId = null;
  };
  jQuery.fx.speeds = {
    slow: 600,
    fast: 200,
    _default: 400
  };
  jQuery.fn.delay = function(time, type) {
    time = jQuery.fx ? jQuery.fx.speeds[time] || time : time;
    type = type || "fx";
    return this.queue(type, function(next, hooks) {
      var timeout = setTimeout(next, time);
      hooks.stop = function() {
        clearTimeout(timeout);
      };
    });
  };
  (function() {
    var input = document.createElement("input"),
        select = document.createElement("select"),
        opt = select.appendChild(document.createElement("option"));
    input.type = "checkbox";
    support.checkOn = input.value !== "";
    support.optSelected = opt.selected;
    select.disabled = true;
    support.optDisabled = !opt.disabled;
    input = document.createElement("input");
    input.value = "t";
    input.type = "radio";
    support.radioValue = input.value === "t";
  })();
  var nodeHook,
      boolHook,
      attrHandle = jQuery.expr.attrHandle;
  jQuery.fn.extend({
    attr: function(name, value) {
      return access(this, jQuery.attr, name, value, arguments.length > 1);
    },
    removeAttr: function(name) {
      return this.each(function() {
        jQuery.removeAttr(this, name);
      });
    }
  });
  jQuery.extend({
    attr: function(elem, name, value) {
      var hooks,
          ret,
          nType = elem.nodeType;
      if (!elem || nType === 3 || nType === 8 || nType === 2) {
        return;
      }
      if (typeof elem.getAttribute === strundefined) {
        return jQuery.prop(elem, name, value);
      }
      if (nType !== 1 || !jQuery.isXMLDoc(elem)) {
        name = name.toLowerCase();
        hooks = jQuery.attrHooks[name] || (jQuery.expr.match.bool.test(name) ? boolHook : nodeHook);
      }
      if (value !== undefined) {
        if (value === null) {
          jQuery.removeAttr(elem, name);
        } else if (hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined) {
          return ret;
        } else {
          elem.setAttribute(name, value + "");
          return value;
        }
      } else if (hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null) {
        return ret;
      } else {
        ret = jQuery.find.attr(elem, name);
        return ret == null ? undefined : ret;
      }
    },
    removeAttr: function(elem, value) {
      var name,
          propName,
          i = 0,
          attrNames = value && value.match(rnotwhite);
      if (attrNames && elem.nodeType === 1) {
        while ((name = attrNames[i++])) {
          propName = jQuery.propFix[name] || name;
          if (jQuery.expr.match.bool.test(name)) {
            elem[propName] = false;
          }
          elem.removeAttribute(name);
        }
      }
    },
    attrHooks: {type: {set: function(elem, value) {
          if (!support.radioValue && value === "radio" && jQuery.nodeName(elem, "input")) {
            var val = elem.value;
            elem.setAttribute("type", value);
            if (val) {
              elem.value = val;
            }
            return value;
          }
        }}}
  });
  boolHook = {set: function(elem, value, name) {
      if (value === false) {
        jQuery.removeAttr(elem, name);
      } else {
        elem.setAttribute(name, name);
      }
      return name;
    }};
  jQuery.each(jQuery.expr.match.bool.source.match(/\w+/g), function(i, name) {
    var getter = attrHandle[name] || jQuery.find.attr;
    attrHandle[name] = function(elem, name, isXML) {
      var ret,
          handle;
      if (!isXML) {
        handle = attrHandle[name];
        attrHandle[name] = ret;
        ret = getter(elem, name, isXML) != null ? name.toLowerCase() : null;
        attrHandle[name] = handle;
      }
      return ret;
    };
  });
  var rfocusable = /^(?:input|select|textarea|button)$/i;
  jQuery.fn.extend({
    prop: function(name, value) {
      return access(this, jQuery.prop, name, value, arguments.length > 1);
    },
    removeProp: function(name) {
      return this.each(function() {
        delete this[jQuery.propFix[name] || name];
      });
    }
  });
  jQuery.extend({
    propFix: {
      "for": "htmlFor",
      "class": "className"
    },
    prop: function(elem, name, value) {
      var ret,
          hooks,
          notxml,
          nType = elem.nodeType;
      if (!elem || nType === 3 || nType === 8 || nType === 2) {
        return;
      }
      notxml = nType !== 1 || !jQuery.isXMLDoc(elem);
      if (notxml) {
        name = jQuery.propFix[name] || name;
        hooks = jQuery.propHooks[name];
      }
      if (value !== undefined) {
        return hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined ? ret : (elem[name] = value);
      } else {
        return hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null ? ret : elem[name];
      }
    },
    propHooks: {tabIndex: {get: function(elem) {
          return elem.hasAttribute("tabindex") || rfocusable.test(elem.nodeName) || elem.href ? elem.tabIndex : -1;
        }}}
  });
  if (!support.optSelected) {
    jQuery.propHooks.selected = {get: function(elem) {
        var parent = elem.parentNode;
        if (parent && parent.parentNode) {
          parent.parentNode.selectedIndex;
        }
        return null;
      }};
  }
  jQuery.each(["tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable"], function() {
    jQuery.propFix[this.toLowerCase()] = this;
  });
  var rclass = /[\t\r\n\f]/g;
  jQuery.fn.extend({
    addClass: function(value) {
      var classes,
          elem,
          cur,
          clazz,
          j,
          finalValue,
          proceed = typeof value === "string" && value,
          i = 0,
          len = this.length;
      if (jQuery.isFunction(value)) {
        return this.each(function(j) {
          jQuery(this).addClass(value.call(this, j, this.className));
        });
      }
      if (proceed) {
        classes = (value || "").match(rnotwhite) || [];
        for (; i < len; i++) {
          elem = this[i];
          cur = elem.nodeType === 1 && (elem.className ? (" " + elem.className + " ").replace(rclass, " ") : " ");
          if (cur) {
            j = 0;
            while ((clazz = classes[j++])) {
              if (cur.indexOf(" " + clazz + " ") < 0) {
                cur += clazz + " ";
              }
            }
            finalValue = jQuery.trim(cur);
            if (elem.className !== finalValue) {
              elem.className = finalValue;
            }
          }
        }
      }
      return this;
    },
    removeClass: function(value) {
      var classes,
          elem,
          cur,
          clazz,
          j,
          finalValue,
          proceed = arguments.length === 0 || typeof value === "string" && value,
          i = 0,
          len = this.length;
      if (jQuery.isFunction(value)) {
        return this.each(function(j) {
          jQuery(this).removeClass(value.call(this, j, this.className));
        });
      }
      if (proceed) {
        classes = (value || "").match(rnotwhite) || [];
        for (; i < len; i++) {
          elem = this[i];
          cur = elem.nodeType === 1 && (elem.className ? (" " + elem.className + " ").replace(rclass, " ") : "");
          if (cur) {
            j = 0;
            while ((clazz = classes[j++])) {
              while (cur.indexOf(" " + clazz + " ") >= 0) {
                cur = cur.replace(" " + clazz + " ", " ");
              }
            }
            finalValue = value ? jQuery.trim(cur) : "";
            if (elem.className !== finalValue) {
              elem.className = finalValue;
            }
          }
        }
      }
      return this;
    },
    toggleClass: function(value, stateVal) {
      var type = typeof value;
      if (typeof stateVal === "boolean" && type === "string") {
        return stateVal ? this.addClass(value) : this.removeClass(value);
      }
      if (jQuery.isFunction(value)) {
        return this.each(function(i) {
          jQuery(this).toggleClass(value.call(this, i, this.className, stateVal), stateVal);
        });
      }
      return this.each(function() {
        if (type === "string") {
          var className,
              i = 0,
              self = jQuery(this),
              classNames = value.match(rnotwhite) || [];
          while ((className = classNames[i++])) {
            if (self.hasClass(className)) {
              self.removeClass(className);
            } else {
              self.addClass(className);
            }
          }
        } else if (type === strundefined || type === "boolean") {
          if (this.className) {
            data_priv.set(this, "__className__", this.className);
          }
          this.className = this.className || value === false ? "" : data_priv.get(this, "__className__") || "";
        }
      });
    },
    hasClass: function(selector) {
      var className = " " + selector + " ",
          i = 0,
          l = this.length;
      for (; i < l; i++) {
        if (this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf(className) >= 0) {
          return true;
        }
      }
      return false;
    }
  });
  var rreturn = /\r/g;
  jQuery.fn.extend({val: function(value) {
      var hooks,
          ret,
          isFunction,
          elem = this[0];
      if (!arguments.length) {
        if (elem) {
          hooks = jQuery.valHooks[elem.type] || jQuery.valHooks[elem.nodeName.toLowerCase()];
          if (hooks && "get" in hooks && (ret = hooks.get(elem, "value")) !== undefined) {
            return ret;
          }
          ret = elem.value;
          return typeof ret === "string" ? ret.replace(rreturn, "") : ret == null ? "" : ret;
        }
        return;
      }
      isFunction = jQuery.isFunction(value);
      return this.each(function(i) {
        var val;
        if (this.nodeType !== 1) {
          return;
        }
        if (isFunction) {
          val = value.call(this, i, jQuery(this).val());
        } else {
          val = value;
        }
        if (val == null) {
          val = "";
        } else if (typeof val === "number") {
          val += "";
        } else if (jQuery.isArray(val)) {
          val = jQuery.map(val, function(value) {
            return value == null ? "" : value + "";
          });
        }
        hooks = jQuery.valHooks[this.type] || jQuery.valHooks[this.nodeName.toLowerCase()];
        if (!hooks || !("set" in hooks) || hooks.set(this, val, "value") === undefined) {
          this.value = val;
        }
      });
    }});
  jQuery.extend({valHooks: {
      option: {get: function(elem) {
          var val = jQuery.find.attr(elem, "value");
          return val != null ? val : jQuery.trim(jQuery.text(elem));
        }},
      select: {
        get: function(elem) {
          var value,
              option,
              options = elem.options,
              index = elem.selectedIndex,
              one = elem.type === "select-one" || index < 0,
              values = one ? null : [],
              max = one ? index + 1 : options.length,
              i = index < 0 ? max : one ? index : 0;
          for (; i < max; i++) {
            option = options[i];
            if ((option.selected || i === index) && (support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null) && (!option.parentNode.disabled || !jQuery.nodeName(option.parentNode, "optgroup"))) {
              value = jQuery(option).val();
              if (one) {
                return value;
              }
              values.push(value);
            }
          }
          return values;
        },
        set: function(elem, value) {
          var optionSet,
              option,
              options = elem.options,
              values = jQuery.makeArray(value),
              i = options.length;
          while (i--) {
            option = options[i];
            if ((option.selected = jQuery.inArray(option.value, values) >= 0)) {
              optionSet = true;
            }
          }
          if (!optionSet) {
            elem.selectedIndex = -1;
          }
          return values;
        }
      }
    }});
  jQuery.each(["radio", "checkbox"], function() {
    jQuery.valHooks[this] = {set: function(elem, value) {
        if (jQuery.isArray(value)) {
          return (elem.checked = jQuery.inArray(jQuery(elem).val(), value) >= 0);
        }
      }};
    if (!support.checkOn) {
      jQuery.valHooks[this].get = function(elem) {
        return elem.getAttribute("value") === null ? "on" : elem.value;
      };
    }
  });
  jQuery.each(("blur focus focusin focusout load resize scroll unload click dblclick " + "mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " + "change select submit keydown keypress keyup error contextmenu").split(" "), function(i, name) {
    jQuery.fn[name] = function(data, fn) {
      return arguments.length > 0 ? this.on(name, null, data, fn) : this.trigger(name);
    };
  });
  jQuery.fn.extend({
    hover: function(fnOver, fnOut) {
      return this.mouseenter(fnOver).mouseleave(fnOut || fnOver);
    },
    bind: function(types, data, fn) {
      return this.on(types, null, data, fn);
    },
    unbind: function(types, fn) {
      return this.off(types, null, fn);
    },
    delegate: function(selector, types, data, fn) {
      return this.on(types, selector, data, fn);
    },
    undelegate: function(selector, types, fn) {
      return arguments.length === 1 ? this.off(selector, "**") : this.off(types, selector || "**", fn);
    }
  });
  var nonce = jQuery.now();
  var rquery = (/\?/);
  jQuery.parseJSON = function(data) {
    return JSON.parse(data + "");
  };
  jQuery.parseXML = function(data) {
    var xml,
        tmp;
    if (!data || typeof data !== "string") {
      return null;
    }
    try {
      tmp = new DOMParser();
      xml = tmp.parseFromString(data, "text/xml");
    } catch (e) {
      xml = undefined;
    }
    if (!xml || xml.getElementsByTagName("parsererror").length) {
      jQuery.error("Invalid XML: " + data);
    }
    return xml;
  };
  var rhash = /#.*$/,
      rts = /([?&])_=[^&]*/,
      rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,
      rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
      rnoContent = /^(?:GET|HEAD)$/,
      rprotocol = /^\/\//,
      rurl = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,
      prefilters = {},
      transports = {},
      allTypes = "*/".concat("*"),
      ajaxLocation = window.location.href,
      ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || [];
  function addToPrefiltersOrTransports(structure) {
    return function(dataTypeExpression, func) {
      if (typeof dataTypeExpression !== "string") {
        func = dataTypeExpression;
        dataTypeExpression = "*";
      }
      var dataType,
          i = 0,
          dataTypes = dataTypeExpression.toLowerCase().match(rnotwhite) || [];
      if (jQuery.isFunction(func)) {
        while ((dataType = dataTypes[i++])) {
          if (dataType[0] === "+") {
            dataType = dataType.slice(1) || "*";
            (structure[dataType] = structure[dataType] || []).unshift(func);
          } else {
            (structure[dataType] = structure[dataType] || []).push(func);
          }
        }
      }
    };
  }
  function inspectPrefiltersOrTransports(structure, options, originalOptions, jqXHR) {
    var inspected = {},
        seekingTransport = (structure === transports);
    function inspect(dataType) {
      var selected;
      inspected[dataType] = true;
      jQuery.each(structure[dataType] || [], function(_, prefilterOrFactory) {
        var dataTypeOrTransport = prefilterOrFactory(options, originalOptions, jqXHR);
        if (typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[dataTypeOrTransport]) {
          options.dataTypes.unshift(dataTypeOrTransport);
          inspect(dataTypeOrTransport);
          return false;
        } else if (seekingTransport) {
          return !(selected = dataTypeOrTransport);
        }
      });
      return selected;
    }
    return inspect(options.dataTypes[0]) || !inspected["*"] && inspect("*");
  }
  function ajaxExtend(target, src) {
    var key,
        deep,
        flatOptions = jQuery.ajaxSettings.flatOptions || {};
    for (key in src) {
      if (src[key] !== undefined) {
        (flatOptions[key] ? target : (deep || (deep = {})))[key] = src[key];
      }
    }
    if (deep) {
      jQuery.extend(true, target, deep);
    }
    return target;
  }
  function ajaxHandleResponses(s, jqXHR, responses) {
    var ct,
        type,
        finalDataType,
        firstDataType,
        contents = s.contents,
        dataTypes = s.dataTypes;
    while (dataTypes[0] === "*") {
      dataTypes.shift();
      if (ct === undefined) {
        ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
      }
    }
    if (ct) {
      for (type in contents) {
        if (contents[type] && contents[type].test(ct)) {
          dataTypes.unshift(type);
          break;
        }
      }
    }
    if (dataTypes[0] in responses) {
      finalDataType = dataTypes[0];
    } else {
      for (type in responses) {
        if (!dataTypes[0] || s.converters[type + " " + dataTypes[0]]) {
          finalDataType = type;
          break;
        }
        if (!firstDataType) {
          firstDataType = type;
        }
      }
      finalDataType = finalDataType || firstDataType;
    }
    if (finalDataType) {
      if (finalDataType !== dataTypes[0]) {
        dataTypes.unshift(finalDataType);
      }
      return responses[finalDataType];
    }
  }
  function ajaxConvert(s, response, jqXHR, isSuccess) {
    var conv2,
        current,
        conv,
        tmp,
        prev,
        converters = {},
        dataTypes = s.dataTypes.slice();
    if (dataTypes[1]) {
      for (conv in s.converters) {
        converters[conv.toLowerCase()] = s.converters[conv];
      }
    }
    current = dataTypes.shift();
    while (current) {
      if (s.responseFields[current]) {
        jqXHR[s.responseFields[current]] = response;
      }
      if (!prev && isSuccess && s.dataFilter) {
        response = s.dataFilter(response, s.dataType);
      }
      prev = current;
      current = dataTypes.shift();
      if (current) {
        if (current === "*") {
          current = prev;
        } else if (prev !== "*" && prev !== current) {
          conv = converters[prev + " " + current] || converters["* " + current];
          if (!conv) {
            for (conv2 in converters) {
              tmp = conv2.split(" ");
              if (tmp[1] === current) {
                conv = converters[prev + " " + tmp[0]] || converters["* " + tmp[0]];
                if (conv) {
                  if (conv === true) {
                    conv = converters[conv2];
                  } else if (converters[conv2] !== true) {
                    current = tmp[0];
                    dataTypes.unshift(tmp[1]);
                  }
                  break;
                }
              }
            }
          }
          if (conv !== true) {
            if (conv && s["throws"]) {
              response = conv(response);
            } else {
              try {
                response = conv(response);
              } catch (e) {
                return {
                  state: "parsererror",
                  error: conv ? e : "No conversion from " + prev + " to " + current
                };
              }
            }
          }
        }
      }
    }
    return {
      state: "success",
      data: response
    };
  }
  jQuery.extend({
    active: 0,
    lastModified: {},
    etag: {},
    ajaxSettings: {
      url: ajaxLocation,
      type: "GET",
      isLocal: rlocalProtocol.test(ajaxLocParts[1]),
      global: true,
      processData: true,
      async: true,
      contentType: "application/x-www-form-urlencoded; charset=UTF-8",
      accepts: {
        "*": allTypes,
        text: "text/plain",
        html: "text/html",
        xml: "application/xml, text/xml",
        json: "application/json, text/javascript"
      },
      contents: {
        xml: /xml/,
        html: /html/,
        json: /json/
      },
      responseFields: {
        xml: "responseXML",
        text: "responseText",
        json: "responseJSON"
      },
      converters: {
        "* text": String,
        "text html": true,
        "text json": jQuery.parseJSON,
        "text xml": jQuery.parseXML
      },
      flatOptions: {
        url: true,
        context: true
      }
    },
    ajaxSetup: function(target, settings) {
      return settings ? ajaxExtend(ajaxExtend(target, jQuery.ajaxSettings), settings) : ajaxExtend(jQuery.ajaxSettings, target);
    },
    ajaxPrefilter: addToPrefiltersOrTransports(prefilters),
    ajaxTransport: addToPrefiltersOrTransports(transports),
    ajax: function(url, options) {
      if (typeof url === "object") {
        options = url;
        url = undefined;
      }
      options = options || {};
      var transport,
          cacheURL,
          responseHeadersString,
          responseHeaders,
          timeoutTimer,
          parts,
          fireGlobals,
          i,
          s = jQuery.ajaxSetup({}, options),
          callbackContext = s.context || s,
          globalEventContext = s.context && (callbackContext.nodeType || callbackContext.jquery) ? jQuery(callbackContext) : jQuery.event,
          deferred = jQuery.Deferred(),
          completeDeferred = jQuery.Callbacks("once memory"),
          statusCode = s.statusCode || {},
          requestHeaders = {},
          requestHeadersNames = {},
          state = 0,
          strAbort = "canceled",
          jqXHR = {
            readyState: 0,
            getResponseHeader: function(key) {
              var match;
              if (state === 2) {
                if (!responseHeaders) {
                  responseHeaders = {};
                  while ((match = rheaders.exec(responseHeadersString))) {
                    responseHeaders[match[1].toLowerCase()] = match[2];
                  }
                }
                match = responseHeaders[key.toLowerCase()];
              }
              return match == null ? null : match;
            },
            getAllResponseHeaders: function() {
              return state === 2 ? responseHeadersString : null;
            },
            setRequestHeader: function(name, value) {
              var lname = name.toLowerCase();
              if (!state) {
                name = requestHeadersNames[lname] = requestHeadersNames[lname] || name;
                requestHeaders[name] = value;
              }
              return this;
            },
            overrideMimeType: function(type) {
              if (!state) {
                s.mimeType = type;
              }
              return this;
            },
            statusCode: function(map) {
              var code;
              if (map) {
                if (state < 2) {
                  for (code in map) {
                    statusCode[code] = [statusCode[code], map[code]];
                  }
                } else {
                  jqXHR.always(map[jqXHR.status]);
                }
              }
              return this;
            },
            abort: function(statusText) {
              var finalText = statusText || strAbort;
              if (transport) {
                transport.abort(finalText);
              }
              done(0, finalText);
              return this;
            }
          };
      deferred.promise(jqXHR).complete = completeDeferred.add;
      jqXHR.success = jqXHR.done;
      jqXHR.error = jqXHR.fail;
      s.url = ((url || s.url || ajaxLocation) + "").replace(rhash, "").replace(rprotocol, ajaxLocParts[1] + "//");
      s.type = options.method || options.type || s.method || s.type;
      s.dataTypes = jQuery.trim(s.dataType || "*").toLowerCase().match(rnotwhite) || [""];
      if (s.crossDomain == null) {
        parts = rurl.exec(s.url.toLowerCase());
        s.crossDomain = !!(parts && (parts[1] !== ajaxLocParts[1] || parts[2] !== ajaxLocParts[2] || (parts[3] || (parts[1] === "http:" ? "80" : "443")) !== (ajaxLocParts[3] || (ajaxLocParts[1] === "http:" ? "80" : "443"))));
      }
      if (s.data && s.processData && typeof s.data !== "string") {
        s.data = jQuery.param(s.data, s.traditional);
      }
      inspectPrefiltersOrTransports(prefilters, s, options, jqXHR);
      if (state === 2) {
        return jqXHR;
      }
      fireGlobals = jQuery.event && s.global;
      if (fireGlobals && jQuery.active++ === 0) {
        jQuery.event.trigger("ajaxStart");
      }
      s.type = s.type.toUpperCase();
      s.hasContent = !rnoContent.test(s.type);
      cacheURL = s.url;
      if (!s.hasContent) {
        if (s.data) {
          cacheURL = (s.url += (rquery.test(cacheURL) ? "&" : "?") + s.data);
          delete s.data;
        }
        if (s.cache === false) {
          s.url = rts.test(cacheURL) ? cacheURL.replace(rts, "$1_=" + nonce++) : cacheURL + (rquery.test(cacheURL) ? "&" : "?") + "_=" + nonce++;
        }
      }
      if (s.ifModified) {
        if (jQuery.lastModified[cacheURL]) {
          jqXHR.setRequestHeader("If-Modified-Since", jQuery.lastModified[cacheURL]);
        }
        if (jQuery.etag[cacheURL]) {
          jqXHR.setRequestHeader("If-None-Match", jQuery.etag[cacheURL]);
        }
      }
      if (s.data && s.hasContent && s.contentType !== false || options.contentType) {
        jqXHR.setRequestHeader("Content-Type", s.contentType);
      }
      jqXHR.setRequestHeader("Accept", s.dataTypes[0] && s.accepts[s.dataTypes[0]] ? s.accepts[s.dataTypes[0]] + (s.dataTypes[0] !== "*" ? ", " + allTypes + "; q=0.01" : "") : s.accepts["*"]);
      for (i in s.headers) {
        jqXHR.setRequestHeader(i, s.headers[i]);
      }
      if (s.beforeSend && (s.beforeSend.call(callbackContext, jqXHR, s) === false || state === 2)) {
        return jqXHR.abort();
      }
      strAbort = "abort";
      for (i in {
        success: 1,
        error: 1,
        complete: 1
      }) {
        jqXHR[i](s[i]);
      }
      transport = inspectPrefiltersOrTransports(transports, s, options, jqXHR);
      if (!transport) {
        done(-1, "No Transport");
      } else {
        jqXHR.readyState = 1;
        if (fireGlobals) {
          globalEventContext.trigger("ajaxSend", [jqXHR, s]);
        }
        if (s.async && s.timeout > 0) {
          timeoutTimer = setTimeout(function() {
            jqXHR.abort("timeout");
          }, s.timeout);
        }
        try {
          state = 1;
          transport.send(requestHeaders, done);
        } catch (e) {
          if (state < 2) {
            done(-1, e);
          } else {
            throw e;
          }
        }
      }
      function done(status, nativeStatusText, responses, headers) {
        var isSuccess,
            success,
            error,
            response,
            modified,
            statusText = nativeStatusText;
        if (state === 2) {
          return;
        }
        state = 2;
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
        }
        transport = undefined;
        responseHeadersString = headers || "";
        jqXHR.readyState = status > 0 ? 4 : 0;
        isSuccess = status >= 200 && status < 300 || status === 304;
        if (responses) {
          response = ajaxHandleResponses(s, jqXHR, responses);
        }
        response = ajaxConvert(s, response, jqXHR, isSuccess);
        if (isSuccess) {
          if (s.ifModified) {
            modified = jqXHR.getResponseHeader("Last-Modified");
            if (modified) {
              jQuery.lastModified[cacheURL] = modified;
            }
            modified = jqXHR.getResponseHeader("etag");
            if (modified) {
              jQuery.etag[cacheURL] = modified;
            }
          }
          if (status === 204 || s.type === "HEAD") {
            statusText = "nocontent";
          } else if (status === 304) {
            statusText = "notmodified";
          } else {
            statusText = response.state;
            success = response.data;
            error = response.error;
            isSuccess = !error;
          }
        } else {
          error = statusText;
          if (status || !statusText) {
            statusText = "error";
            if (status < 0) {
              status = 0;
            }
          }
        }
        jqXHR.status = status;
        jqXHR.statusText = (nativeStatusText || statusText) + "";
        if (isSuccess) {
          deferred.resolveWith(callbackContext, [success, statusText, jqXHR]);
        } else {
          deferred.rejectWith(callbackContext, [jqXHR, statusText, error]);
        }
        jqXHR.statusCode(statusCode);
        statusCode = undefined;
        if (fireGlobals) {
          globalEventContext.trigger(isSuccess ? "ajaxSuccess" : "ajaxError", [jqXHR, s, isSuccess ? success : error]);
        }
        completeDeferred.fireWith(callbackContext, [jqXHR, statusText]);
        if (fireGlobals) {
          globalEventContext.trigger("ajaxComplete", [jqXHR, s]);
          if (!(--jQuery.active)) {
            jQuery.event.trigger("ajaxStop");
          }
        }
      }
      return jqXHR;
    },
    getJSON: function(url, data, callback) {
      return jQuery.get(url, data, callback, "json");
    },
    getScript: function(url, callback) {
      return jQuery.get(url, undefined, callback, "script");
    }
  });
  jQuery.each(["get", "post"], function(i, method) {
    jQuery[method] = function(url, data, callback, type) {
      if (jQuery.isFunction(data)) {
        type = type || callback;
        callback = data;
        data = undefined;
      }
      return jQuery.ajax({
        url: url,
        type: method,
        dataType: type,
        data: data,
        success: callback
      });
    };
  });
  jQuery._evalUrl = function(url) {
    return jQuery.ajax({
      url: url,
      type: "GET",
      dataType: "script",
      async: false,
      global: false,
      "throws": true
    });
  };
  jQuery.fn.extend({
    wrapAll: function(html) {
      var wrap;
      if (jQuery.isFunction(html)) {
        return this.each(function(i) {
          jQuery(this).wrapAll(html.call(this, i));
        });
      }
      if (this[0]) {
        wrap = jQuery(html, this[0].ownerDocument).eq(0).clone(true);
        if (this[0].parentNode) {
          wrap.insertBefore(this[0]);
        }
        wrap.map(function() {
          var elem = this;
          while (elem.firstElementChild) {
            elem = elem.firstElementChild;
          }
          return elem;
        }).append(this);
      }
      return this;
    },
    wrapInner: function(html) {
      if (jQuery.isFunction(html)) {
        return this.each(function(i) {
          jQuery(this).wrapInner(html.call(this, i));
        });
      }
      return this.each(function() {
        var self = jQuery(this),
            contents = self.contents();
        if (contents.length) {
          contents.wrapAll(html);
        } else {
          self.append(html);
        }
      });
    },
    wrap: function(html) {
      var isFunction = jQuery.isFunction(html);
      return this.each(function(i) {
        jQuery(this).wrapAll(isFunction ? html.call(this, i) : html);
      });
    },
    unwrap: function() {
      return this.parent().each(function() {
        if (!jQuery.nodeName(this, "body")) {
          jQuery(this).replaceWith(this.childNodes);
        }
      }).end();
    }
  });
  jQuery.expr.filters.hidden = function(elem) {
    return elem.offsetWidth <= 0 && elem.offsetHeight <= 0;
  };
  jQuery.expr.filters.visible = function(elem) {
    return !jQuery.expr.filters.hidden(elem);
  };
  var r20 = /%20/g,
      rbracket = /\[\]$/,
      rCRLF = /\r?\n/g,
      rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
      rsubmittable = /^(?:input|select|textarea|keygen)/i;
  function buildParams(prefix, obj, traditional, add) {
    var name;
    if (jQuery.isArray(obj)) {
      jQuery.each(obj, function(i, v) {
        if (traditional || rbracket.test(prefix)) {
          add(prefix, v);
        } else {
          buildParams(prefix + "[" + (typeof v === "object" ? i : "") + "]", v, traditional, add);
        }
      });
    } else if (!traditional && jQuery.type(obj) === "object") {
      for (name in obj) {
        buildParams(prefix + "[" + name + "]", obj[name], traditional, add);
      }
    } else {
      add(prefix, obj);
    }
  }
  jQuery.param = function(a, traditional) {
    var prefix,
        s = [],
        add = function(key, value) {
          value = jQuery.isFunction(value) ? value() : (value == null ? "" : value);
          s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value);
        };
    if (traditional === undefined) {
      traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
    }
    if (jQuery.isArray(a) || (a.jquery && !jQuery.isPlainObject(a))) {
      jQuery.each(a, function() {
        add(this.name, this.value);
      });
    } else {
      for (prefix in a) {
        buildParams(prefix, a[prefix], traditional, add);
      }
    }
    return s.join("&").replace(r20, "+");
  };
  jQuery.fn.extend({
    serialize: function() {
      return jQuery.param(this.serializeArray());
    },
    serializeArray: function() {
      return this.map(function() {
        var elements = jQuery.prop(this, "elements");
        return elements ? jQuery.makeArray(elements) : this;
      }).filter(function() {
        var type = this.type;
        return this.name && !jQuery(this).is(":disabled") && rsubmittable.test(this.nodeName) && !rsubmitterTypes.test(type) && (this.checked || !rcheckableType.test(type));
      }).map(function(i, elem) {
        var val = jQuery(this).val();
        return val == null ? null : jQuery.isArray(val) ? jQuery.map(val, function(val) {
          return {
            name: elem.name,
            value: val.replace(rCRLF, "\r\n")
          };
        }) : {
          name: elem.name,
          value: val.replace(rCRLF, "\r\n")
        };
      }).get();
    }
  });
  jQuery.ajaxSettings.xhr = function() {
    try {
      return new XMLHttpRequest();
    } catch (e) {}
  };
  var xhrId = 0,
      xhrCallbacks = {},
      xhrSuccessStatus = {
        0: 200,
        1223: 204
      },
      xhrSupported = jQuery.ajaxSettings.xhr();
  if (window.attachEvent) {
    window.attachEvent("onunload", function() {
      for (var key in xhrCallbacks) {
        xhrCallbacks[key]();
      }
    });
  }
  support.cors = !!xhrSupported && ("withCredentials" in xhrSupported);
  support.ajax = xhrSupported = !!xhrSupported;
  jQuery.ajaxTransport(function(options) {
    var callback;
    if (support.cors || xhrSupported && !options.crossDomain) {
      return {
        send: function(headers, complete) {
          var i,
              xhr = options.xhr(),
              id = ++xhrId;
          xhr.open(options.type, options.url, options.async, options.username, options.password);
          if (options.xhrFields) {
            for (i in options.xhrFields) {
              xhr[i] = options.xhrFields[i];
            }
          }
          if (options.mimeType && xhr.overrideMimeType) {
            xhr.overrideMimeType(options.mimeType);
          }
          if (!options.crossDomain && !headers["X-Requested-With"]) {
            headers["X-Requested-With"] = "XMLHttpRequest";
          }
          for (i in headers) {
            xhr.setRequestHeader(i, headers[i]);
          }
          callback = function(type) {
            return function() {
              if (callback) {
                delete xhrCallbacks[id];
                callback = xhr.onload = xhr.onerror = null;
                if (type === "abort") {
                  xhr.abort();
                } else if (type === "error") {
                  complete(xhr.status, xhr.statusText);
                } else {
                  complete(xhrSuccessStatus[xhr.status] || xhr.status, xhr.statusText, typeof xhr.responseText === "string" ? {text: xhr.responseText} : undefined, xhr.getAllResponseHeaders());
                }
              }
            };
          };
          xhr.onload = callback();
          xhr.onerror = callback("error");
          callback = xhrCallbacks[id] = callback("abort");
          try {
            xhr.send(options.hasContent && options.data || null);
          } catch (e) {
            if (callback) {
              throw e;
            }
          }
        },
        abort: function() {
          if (callback) {
            callback();
          }
        }
      };
    }
  });
  jQuery.ajaxSetup({
    accepts: {script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},
    contents: {script: /(?:java|ecma)script/},
    converters: {"text script": function(text) {
        jQuery.globalEval(text);
        return text;
      }}
  });
  jQuery.ajaxPrefilter("script", function(s) {
    if (s.cache === undefined) {
      s.cache = false;
    }
    if (s.crossDomain) {
      s.type = "GET";
    }
  });
  jQuery.ajaxTransport("script", function(s) {
    if (s.crossDomain) {
      var script,
          callback;
      return {
        send: function(_, complete) {
          script = jQuery("<script>").prop({
            async: true,
            charset: s.scriptCharset,
            src: s.url
          }).on("load error", callback = function(evt) {
            script.remove();
            callback = null;
            if (evt) {
              complete(evt.type === "error" ? 404 : 200, evt.type);
            }
          });
          document.head.appendChild(script[0]);
        },
        abort: function() {
          if (callback) {
            callback();
          }
        }
      };
    }
  });
  var oldCallbacks = [],
      rjsonp = /(=)\?(?=&|$)|\?\?/;
  jQuery.ajaxSetup({
    jsonp: "callback",
    jsonpCallback: function() {
      var callback = oldCallbacks.pop() || (jQuery.expando + "_" + (nonce++));
      this[callback] = true;
      return callback;
    }
  });
  jQuery.ajaxPrefilter("json jsonp", function(s, originalSettings, jqXHR) {
    var callbackName,
        overwritten,
        responseContainer,
        jsonProp = s.jsonp !== false && (rjsonp.test(s.url) ? "url" : typeof s.data === "string" && !(s.contentType || "").indexOf("application/x-www-form-urlencoded") && rjsonp.test(s.data) && "data");
    if (jsonProp || s.dataTypes[0] === "jsonp") {
      callbackName = s.jsonpCallback = jQuery.isFunction(s.jsonpCallback) ? s.jsonpCallback() : s.jsonpCallback;
      if (jsonProp) {
        s[jsonProp] = s[jsonProp].replace(rjsonp, "$1" + callbackName);
      } else if (s.jsonp !== false) {
        s.url += (rquery.test(s.url) ? "&" : "?") + s.jsonp + "=" + callbackName;
      }
      s.converters["script json"] = function() {
        if (!responseContainer) {
          jQuery.error(callbackName + " was not called");
        }
        return responseContainer[0];
      };
      s.dataTypes[0] = "json";
      overwritten = window[callbackName];
      window[callbackName] = function() {
        responseContainer = arguments;
      };
      jqXHR.always(function() {
        window[callbackName] = overwritten;
        if (s[callbackName]) {
          s.jsonpCallback = originalSettings.jsonpCallback;
          oldCallbacks.push(callbackName);
        }
        if (responseContainer && jQuery.isFunction(overwritten)) {
          overwritten(responseContainer[0]);
        }
        responseContainer = overwritten = undefined;
      });
      return "script";
    }
  });
  jQuery.parseHTML = function(data, context, keepScripts) {
    if (!data || typeof data !== "string") {
      return null;
    }
    if (typeof context === "boolean") {
      keepScripts = context;
      context = false;
    }
    context = context || document;
    var parsed = rsingleTag.exec(data),
        scripts = !keepScripts && [];
    if (parsed) {
      return [context.createElement(parsed[1])];
    }
    parsed = jQuery.buildFragment([data], context, scripts);
    if (scripts && scripts.length) {
      jQuery(scripts).remove();
    }
    return jQuery.merge([], parsed.childNodes);
  };
  var _load = jQuery.fn.load;
  jQuery.fn.load = function(url, params, callback) {
    if (typeof url !== "string" && _load) {
      return _load.apply(this, arguments);
    }
    var selector,
        type,
        response,
        self = this,
        off = url.indexOf(" ");
    if (off >= 0) {
      selector = jQuery.trim(url.slice(off));
      url = url.slice(0, off);
    }
    if (jQuery.isFunction(params)) {
      callback = params;
      params = undefined;
    } else if (params && typeof params === "object") {
      type = "POST";
    }
    if (self.length > 0) {
      jQuery.ajax({
        url: url,
        type: type,
        dataType: "html",
        data: params
      }).done(function(responseText) {
        response = arguments;
        self.html(selector ? jQuery("<div>").append(jQuery.parseHTML(responseText)).find(selector) : responseText);
      }).complete(callback && function(jqXHR, status) {
        self.each(callback, response || [jqXHR.responseText, status, jqXHR]);
      });
    }
    return this;
  };
  jQuery.each(["ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend"], function(i, type) {
    jQuery.fn[type] = function(fn) {
      return this.on(type, fn);
    };
  });
  jQuery.expr.filters.animated = function(elem) {
    return jQuery.grep(jQuery.timers, function(fn) {
      return elem === fn.elem;
    }).length;
  };
  var docElem = window.document.documentElement;
  function getWindow(elem) {
    return jQuery.isWindow(elem) ? elem : elem.nodeType === 9 && elem.defaultView;
  }
  jQuery.offset = {setOffset: function(elem, options, i) {
      var curPosition,
          curLeft,
          curCSSTop,
          curTop,
          curOffset,
          curCSSLeft,
          calculatePosition,
          position = jQuery.css(elem, "position"),
          curElem = jQuery(elem),
          props = {};
      if (position === "static") {
        elem.style.position = "relative";
      }
      curOffset = curElem.offset();
      curCSSTop = jQuery.css(elem, "top");
      curCSSLeft = jQuery.css(elem, "left");
      calculatePosition = (position === "absolute" || position === "fixed") && (curCSSTop + curCSSLeft).indexOf("auto") > -1;
      if (calculatePosition) {
        curPosition = curElem.position();
        curTop = curPosition.top;
        curLeft = curPosition.left;
      } else {
        curTop = parseFloat(curCSSTop) || 0;
        curLeft = parseFloat(curCSSLeft) || 0;
      }
      if (jQuery.isFunction(options)) {
        options = options.call(elem, i, curOffset);
      }
      if (options.top != null) {
        props.top = (options.top - curOffset.top) + curTop;
      }
      if (options.left != null) {
        props.left = (options.left - curOffset.left) + curLeft;
      }
      if ("using" in options) {
        options.using.call(elem, props);
      } else {
        curElem.css(props);
      }
    }};
  jQuery.fn.extend({
    offset: function(options) {
      if (arguments.length) {
        return options === undefined ? this : this.each(function(i) {
          jQuery.offset.setOffset(this, options, i);
        });
      }
      var docElem,
          win,
          elem = this[0],
          box = {
            top: 0,
            left: 0
          },
          doc = elem && elem.ownerDocument;
      if (!doc) {
        return;
      }
      docElem = doc.documentElement;
      if (!jQuery.contains(docElem, elem)) {
        return box;
      }
      if (typeof elem.getBoundingClientRect !== strundefined) {
        box = elem.getBoundingClientRect();
      }
      win = getWindow(doc);
      return {
        top: box.top + win.pageYOffset - docElem.clientTop,
        left: box.left + win.pageXOffset - docElem.clientLeft
      };
    },
    position: function() {
      if (!this[0]) {
        return;
      }
      var offsetParent,
          offset,
          elem = this[0],
          parentOffset = {
            top: 0,
            left: 0
          };
      if (jQuery.css(elem, "position") === "fixed") {
        offset = elem.getBoundingClientRect();
      } else {
        offsetParent = this.offsetParent();
        offset = this.offset();
        if (!jQuery.nodeName(offsetParent[0], "html")) {
          parentOffset = offsetParent.offset();
        }
        parentOffset.top += jQuery.css(offsetParent[0], "borderTopWidth", true);
        parentOffset.left += jQuery.css(offsetParent[0], "borderLeftWidth", true);
      }
      return {
        top: offset.top - parentOffset.top - jQuery.css(elem, "marginTop", true),
        left: offset.left - parentOffset.left - jQuery.css(elem, "marginLeft", true)
      };
    },
    offsetParent: function() {
      return this.map(function() {
        var offsetParent = this.offsetParent || docElem;
        while (offsetParent && (!jQuery.nodeName(offsetParent, "html") && jQuery.css(offsetParent, "position") === "static")) {
          offsetParent = offsetParent.offsetParent;
        }
        return offsetParent || docElem;
      });
    }
  });
  jQuery.each({
    scrollLeft: "pageXOffset",
    scrollTop: "pageYOffset"
  }, function(method, prop) {
    var top = "pageYOffset" === prop;
    jQuery.fn[method] = function(val) {
      return access(this, function(elem, method, val) {
        var win = getWindow(elem);
        if (val === undefined) {
          return win ? win[prop] : elem[method];
        }
        if (win) {
          win.scrollTo(!top ? val : window.pageXOffset, top ? val : window.pageYOffset);
        } else {
          elem[method] = val;
        }
      }, method, val, arguments.length, null);
    };
  });
  jQuery.each(["top", "left"], function(i, prop) {
    jQuery.cssHooks[prop] = addGetHookIf(support.pixelPosition, function(elem, computed) {
      if (computed) {
        computed = curCSS(elem, prop);
        return rnumnonpx.test(computed) ? jQuery(elem).position()[prop] + "px" : computed;
      }
    });
  });
  jQuery.each({
    Height: "height",
    Width: "width"
  }, function(name, type) {
    jQuery.each({
      padding: "inner" + name,
      content: type,
      "": "outer" + name
    }, function(defaultExtra, funcName) {
      jQuery.fn[funcName] = function(margin, value) {
        var chainable = arguments.length && (defaultExtra || typeof margin !== "boolean"),
            extra = defaultExtra || (margin === true || value === true ? "margin" : "border");
        return access(this, function(elem, type, value) {
          var doc;
          if (jQuery.isWindow(elem)) {
            return elem.document.documentElement["client" + name];
          }
          if (elem.nodeType === 9) {
            doc = elem.documentElement;
            return Math.max(elem.body["scroll" + name], doc["scroll" + name], elem.body["offset" + name], doc["offset" + name], doc["client" + name]);
          }
          return value === undefined ? jQuery.css(elem, type, extra) : jQuery.style(elem, type, value, extra);
        }, type, chainable ? margin : undefined, chainable, null);
      };
    });
  });
  jQuery.fn.size = function() {
    return this.length;
  };
  jQuery.fn.andSelf = jQuery.fn.addBack;
  if (typeof define === "function" && define.amd) {
    define("14", [], function() {
      return jQuery;
    });
  }
  var _jQuery = window.jQuery,
      _$ = window.$;
  jQuery.noConflict = function(deep) {
    if (window.$ === jQuery) {
      window.$ = _$;
    }
    if (deep && window.jQuery === jQuery) {
      window.jQuery = _jQuery;
    }
    return jQuery;
  };
  if (typeof noGlobal === strundefined) {
    window.jQuery = window.$ = jQuery;
  }
  return jQuery;
}));

_removeDefine();
})();
(function() {
var _removeDefine = $__System.get("@@amd-helpers").createDefine();
define("15", ["14"], function(main) {
  return main;
});

_removeDefine();
})();
$__System.register('1', ['13', '15'], function (_export) {
    'use strict';

    var Rx, $, dragJ, dragTarget, mouseups, mousemoves, mousedowns, transform;
    return {
        setters: [function (_) {
            Rx = _.Rx;
        }, function (_2) {
            $ = _2['default'];
        }],
        execute: function () {
            dragJ = $("#todrag");
            dragTarget = dragJ[0];
            mouseups = Rx.Observable.fromEvent(dragTarget, 'mouseup');
            mousemoves = Rx.Observable.fromEvent(document, 'mousemove');
            mousedowns = Rx.Observable.fromEvent(dragTarget, 'mousedown');
            transform = mousedowns.flatMap(function (mousedown) {
                var startX = mousedown.offsetX,
                    startY = mousedown.offsetY;
                return mousemoves.map(function (mm) {
                    mm.preventDefault();
                    return { left: mm.clientX - startX, top: mm.clientY - startY };
                }).takeUntil(mouseups);
            });

            transform.filter(function (offs) {
                return offs.left > 0 && offs.left < window.innerWidth && offs.top > 0 && offs.top < window.innerHeight;
            }).forEach(function (offsets) {
                dragJ.css("left", offsets.left);
                dragJ.css("top", offsets.top);
            });
        }
    };
});
})
(function(factory) {
  factory();
});
//# sourceMappingURL=app.js.map