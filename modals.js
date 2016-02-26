console.log('script loading');
  
  $(function() {
    
    $("#modal-1").on("change", function() {
    
      console.log('modal opened');
        
      if ($(this).is(":checked")) {
        $("body").addClass("modal-open");
      } else {
        $("body").removeClass("modal-open");
      }
    });
  
    $(".modal-fade-screen, .modal-close").on("click", function() {
      
      console.log('close clicked');
      $(".modal-state:checked").prop("checked", false).change();
    });
  
    $(".modal-inner").on("click", function(e) {
      e.stopPropagation();
    });
  });