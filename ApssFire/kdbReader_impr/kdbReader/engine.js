	var inputs = new Array(2);

	function doAll() {

	one = true;
    SDCARD = "sdcard";

    storage = navigator.getDeviceStorage(SDCARD);

    refreshBtn = document.querySelector("#refreshBtn");
    refreshBtn.addEventListener ('click', function () {
      load();
    });

    load();

    function load(){

      $('#item-list li').remove();

      var all_files = storage.enumerate("");
      flagError = true;
      flagOk = true;
      all_files.onsuccess = function() {
        while (all_files.result) {
          var each_file = all_files.result;
          if (each_file.name.match(/.kdbx$/)) {
            ultimo = each_file.name.split("/").pop();
            pdf = ultimo.charAt(0).toUpperCase() + ultimo.slice(1);
            $("#item-list").append('<li id="'+each_file.name+'"><aside class="icon settings-icon simcardlock">kdb</aside><p>' + pdf + '</p></li>');
          }
          all_files.continue();
        }
        
        if($('li').size() == 0){
          if(flagError) {
            $("#item-list").append('<li id="Message"><p>Please, add a kdb file in your SDCARD.</p></li>');
            flagError = false;
          }
        } else {
          if(flagOk){
            flagOk = false;
            $("#Message").html('<p>Please choose a file to open.</p>');
          }
        }
        //headers
        $('#item-list li').click(function(){
          if ($(this).attr("id") != "Message"){
            var fileName = $(this).attr("id");
            
            //$('#index').hide();
            //$('#index').empty();
            $('#headers').removeClass('right');
            $('[data-position="current"]').removeClass('current');
            $('#headers').addClass('current');
            $('[data-position="current"]').addClass('left');


            $('#file_select').text(fileName);
            //$('#selectAll').show();

          }
        });
        
      };

      all_files.onerror = function(){
          console.log("error al leer archivos");
      };
    }
    return 0;
}


/*

8=======D

*/

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
    //alert(entries);
    $('#out').removeClass('right');
    $('#headers').removeClass('current');
    $('#out').addClass('current');
    $('#headers').addClass('left');



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
    alert("En load1");

    var data = inputs[1];
    //alert("En load2" + data);
    data = new jDataView(data, 0, data.length, true);
    //alert("En load3");
    var pass = $("#password").val();
    //alert("En load4 "+ pass);

    var passes = new Array();


    if (pass.length > 0) {
        //alert("Read pwd");
        pass = readPassword(pass);
        //alert(pass);
        passes.push(pass);
    }
    //alert("En load5");
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
        alert("Cannot open KeePass Database: " + e);
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
    //alert("Aqui1_1");
    var storage = navigator.getDeviceStorage("sdcard");
    //alert("YAY");
    var nameFile = $('#file_select').text();
    //alert(nameFile);
    var request = storage.get(nameFile); //File de sdcard
    //alert(request);

    request.onerror = function(){
        alert("No ha podido cargar de SD");
    };

    request.onsuccess = function(){
      //alert("Succes 1");
      var file = request.result;
      //alert(file);
      var reader = new FileReader();

      reader.onload = function(e) {
        //alert("Aqui22");
        inputs[1] = e.target.result;
        //alert("Aqui3 " + inputs[1]);
        load_keepass();
      };

      reader.onerror = function(e){
        alert("ERRORR");
      };

      
      reader.readAsArrayBuffer(file);

      }

}

/*
8======D
*/



//alert("POLLA");
//start();

/*
$(document).ready(function(){

});
*/


//window.addEventListener('load', function browserOnLoad(evt) {
    //window.removeEventListener('load', browserOnLoad);
navigator.mozL10n.ready(function browserOnLoad(){
    var res = doAll();
    

  $("#open").button( {
        label: "Load",
        icons: {
            primary: "ui-icon-unlocked"
        }
    } ).click(function() {
        alert("Aqui1");
        $(this).attr("disabled", true);  
        //alert("Aqui2");
        handle_kdbx_file(); //Cargar el archivo
        //alert("Aqui4");
        //setTimeout(function(){alert("Hello")},30000);
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


