/// <reference path='uiPlugin.ts'/>
module UI {

  // expand the element to accomodate a group of elements to prevent them from wrapping
  export var AutoDropDown = {
    restrict: 'A',
    link: ($scope, $element, $attrs) => {


      function locateElements (event) {
        var el = $element.get(0);
        if (event && event.relatedNode !== el && event.type) {
          if (event && event.type !== 'resize') {
            return;
          }
        }

        var overflowEl = $($element.find('.overflow'));
        var overflowMenu = $(overflowEl.find('ul.dropdown-menu'));
        /*
        Logger.info("element inner width: ", $element.innerWidth());
        Logger.info("element position: ", $element.position());
        Logger.info("element offset: ", $element.offset());
        Logger.info("overflowEl offset: ", overflowEl.offset());
        Logger.info("overflowEl position: ", overflowEl.position());
        */
        var margin = overflowEl.outerWidth() - overflowEl.innerWidth();
        var availableWidth = overflowEl.position().left - $element.position().left - 50;

        $element.children('li:not(.overflow):not(.pull-right):not(:hidden)').each(function() {
          var self = $(this);
          availableWidth = availableWidth - self.outerWidth(true);
          if (availableWidth < 0) {
            self.detach();
            self.prependTo(overflowMenu);
          }
        });

        if (overflowMenu.children().length > 0) {
          overflowEl.css({visibility: "visible"});
        }

        if (availableWidth > 130) {

          var noSpace = false;

          overflowMenu.children('li:not(.overflow):not(.pull-right)').filter(function() {
            return $(this).css('display') !== 'none';
          }).each(function() {
            if (noSpace) {
              return;
            }
            var self = $(this);

            if (availableWidth > self.outerWidth()) {
              availableWidth = availableWidth - self.outerWidth();
              self.detach();
              self.insertBefore(overflowEl);
            } else {
              noSpace = true;
            }
          });
        }

        if (overflowMenu.children().length === 0) {
          overflowEl.css({visibility: "hidden"});
        }

      }


      $(window).resize(locateElements);
      $element.get(0).addEventListener("DOMNodeInserted", locateElements);
      $scope.$watch(setTimeout(locateElements, 500));

    }
  };

}
