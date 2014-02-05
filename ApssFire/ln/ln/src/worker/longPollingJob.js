importScripts("networkJobHeader.js");


var queryableFunctions = {
    pushServerInfo: function(authToken, list) {
        var serverObject = JSON.parse(list);

        ServerInfo.serverList = serverObject;
    },

    pushDebugInfo: function(authToken, info) {
        ServerInfo.isDebugMode = info.isDebugMode;
        ServerInfo.DebugHost = info.DebugHost;
        ServerInfo.DebugPort = info.DebugPort;
    },

    requestOperationPolling : function (authToken, lastOperationId, fetchCount, timeout) {
        var client = TalkClientFactory.getInstance().createLongPollingClient(authToken, timeout);

        try{
            var opList = client.fetchOperations(lastOperationId, fetchCount);
            reply("requestOperationPolling", opList);
        }catch(err){
            //:: polling에서의 모든 오류는 OperationPoller에게 위임한다 (err.code가 존재하면 LineTalkException으로 위임) by blankus 2013-12-09
            if(err.code){
                CommonException.getInstance().process(TalkException(err));
            }else{
                reply("ErrorOperationPolling", err);
            }
        }
    },

    requestEnforceFetch : function(authToken, lastOperationId, fetchCount){
        var client = TalkClientFactory.getInstance().createAuthClient(authToken);
        try{
            var opList = client.fetchOperations(lastOperationId, fetchCount);
            reply("requestEnforceFetch", opList);
        }catch(err){
            //:: polling에서의 모든 오류는 OperationPoller에게 위임한다 (err.code가 존재하면 LineTalkException으로 위임) by blankus 2013-12-09
            if(err.code){
                CommonException.getInstance().process(TalkException(err));
            }else{
                reply("ErrorEnforceFetch", err);
            }
        }
    }
};

function defaultQuery (vMsg) {};

onmessage = function (oEvent) {
    if (oEvent.data instanceof Object && oEvent.data.hasOwnProperty("method") && oEvent.data.hasOwnProperty("arguments")) {
        //queryableFunctions[oEvent.data.method].apply(self, oEvent.data.arguments);
        var args = Array.prototype.slice.call(oEvent.data.arguments);
        args.unshift(oEvent.data.authToken);
        queryableFunctions[oEvent.data.method].apply(self, args);
    } else {
        defaultQuery(oEvent.data);
    }
};

function reply() {
    if (arguments.length < 1) {
        throw new TypeError("reply - not enough arguments");
    }

    console.log("[poller] :: "+ JSON.stringify(arguments));

    postMessage({ "method": arguments[0], "arguments": Array.prototype.slice.call(arguments, 1) });
};

