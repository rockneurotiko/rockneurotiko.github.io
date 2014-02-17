importScripts("networkJobHeader.js");

var queryableFunctions = {
    requestConnectionInfoT : function(authToken, region, mccmnc){
        try{
            var httpClient = TalkClientFactory.getInstance().createConnectionInfoClient(authToken, region, mccmnc);
            var xreq = httpClient.getXHRObj();

            xreq.onreadystatechange = function(xhr) {
                // state change callback
                if (xreq.readyState == 4) {
                    if (xreq.status == 200 || xhr.status === 0 || xreq.status == 302) {
                        reply("requestConnectionInfoT", xhr.target.response);
                    } else {
                        reply("requestConnectionInfoT", "");
                    }
                }
            };

            xreq.send();
        }catch(ex){
            CommonException.getInstance().process(ex, "requestConnectionInfoT");
        }
    }
};

function defaultQuery (vMsg) {};

onmessage = function (oEvent) {
    if (oEvent.data instanceof Object && oEvent.data.hasOwnProperty("method") && oEvent.data.hasOwnProperty("arguments")) {
        var args = Array.prototype.slice.call(oEvent.data.arguments);
        args.unshift(oEvent.data.authToken);
        queryableFunctions[oEvent.data.method].apply(self, args);
    } else {
        defaultQuery(oEvent.data);
    }
};

function reply () {
    if (arguments.length < 1) {
        throw new TypeError("reply - not enough arguments");
    }

    postMessage({ "method": arguments[0], "arguments": Array.prototype.slice.call(arguments, 1) });
};