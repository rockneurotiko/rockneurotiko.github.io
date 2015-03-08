(function () {

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
          if (each_file.name.match(/.kdb$/)) {
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
            $('#index').hide();

            $('#keepassfile').text(fileName);
            $('#selectAll').show();

          }
        });
        
      };

      all_files.onerror = function(){
          console.log("error al leer archivos");
      }
    }
})();