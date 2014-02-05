
var inputs = new Array(2)
var current_input = 1; 

var keyfile = null;

// see http://stackoverflow.com/questions/8079674/jquery-ui-alert-dialog-as-a-replacement-for-alert
function bp_alert(message) {
    $("div.bp_alert").remove();
    $("<div></div>").html(message).dialog({
        title: "BrowsePass",
        modal: true,
        dialogClass: "bp_alert",
        buttons: {
            "OK": function() { $(this).dialog("close"); }
        }
    });
}

function clear_password() {
    $("#password").val("");
}


function show_entries(entries) {
    $("#entries").empty();
    for (var i in entries) {
        var entry = entries[i];
        var captionText = entry["Title"] + " -- " + entry["URL"];
        captionText = document.createTextNode(captionText);
        var caption = document.createElement("div");
        caption.appendChild(captionText);
        $("#entries").append(caption);

        var table = document.createElement("table");
        $(table).css("width", "100%");
        $("#entries").append(table);
        $(table).append("<thead><tr><th>Key</th><th>Value</th></tr></thead>");

        var tbody = document.createElement("tbody");
        table.appendChild(tbody);

        for (var key in entry) {
            var row = document.createElement("tr");
            tbody.appendChild(row);
            var value = entry[key];
            var keyCell = document.createElement("td");
            keyCell.appendChild(document.createTextNode(key));
            var valueCell = document.createElement("td");
            valueCell.appendChild(document.createTextNode(value));
            
            row.appendChild(keyCell);
            row.appendChild(valueCell);
        }
    }
    $("#entries").accordion( {
        collapsible: true,
        animate: false,
        active: false,
        heightStyle: "content"
    } );
}

function load_keepass() {
    var data = inputs[1];
    data = new jDataView(data, 0, data.length, true)

    var pass = $("#password").val();

    var passes = new Array();
    if (pass.length > 0) {
        pass = readPassword(pass);
        passes.push(pass);
    }
    try {
        var entries = readKeePassFile(data, passes);
        clear_password();
        show_entries(entries);
        var options = {
            label: "Unload",
            icons: {
                primary: "ui-icon-locked"
            }
        };
        $("#open").button(options);
    } catch (e) {
        bp_alert("Cannot open KeePass Database: " + e);
    }
    $("#open").removeAttr("disabled");
}

/*
function load_url(url) {
    var oReq = new XMLHttpRequest();
    oReq.open("GET", url, true);
    oReq.responseType = "arraybuffer";
    oReq.onload = function (oEvent) {
        var arrayBuffer = oReq.response; // Note: not oReq.responseText
        if (arrayBuffer) {
            inputs[INPUT_REMOTE_URL] = arrayBuffer;
            load_keepass();
        }
    };
    oReq.onerror = function(e) {
        bp_alert("Cannot load URL " + url);
        $("#load_unload").removeAttr("disabled");
    };
    oReq.send(null);
}
*/

// see http://stackoverflow.com/questions/1043957/clearing-input-type-file-using-jquery
// function reset_form_element(element_id) {
//     var e = $(element_id);
//     e.wrap("<form>").closest("form").get(0).reset();
//     e.unwrap();
// }

function handle_kdbx_file() {
    var storage = navigator.getDeviceStorage("sdcard");
    var nameFile = $('#file_select').text()
    var request = storage.get(nameFile); //File de sdcard

    request.onsuccess = function(){
        var filetemp = this.result;
        var request2 = filetemp.getFile();

        request2.onsuccess = function(){
            var file = this.result;

            var reader = new FileReader();

            reader.onload = function(e) {
                inputs[1] = e.target.result;
            };

            reader.onerror = function(e) {
                bp_alert("Cannot load local file " + file.name);
            };
            reader.readAsArrayBuffer(file);

        }
        request2.onsuccess = function(){
            alert("No ha podido cargar archivo");
        }
        
    }

    request.onerror = function(){
        alert("No ha podido cargar de SD");
    }


}


$(document).ready(function() {

    

    $("#open").button( {
        label: "Load",
        icons: {
            primary: "ui-icon-unlocked"
        }
    } ).click(function() {
        $(this).attr("disabled", true);  
        
        handle_kdbx_file(); //Cargar el archivo

        load_keepass();

            /*
            clear_password();
            $("#entries").empty();
            $("#entries").accordion("destroy");
            var options = {
                label: "Load",
                icons: {
                    primary: "ui-icon-unlocked"
                }
            };
            $(this).button(options);
            */
    } );

});
