/// <reference path='wikiPlugin.ts'/>
module Wiki {

  export function HistoryController($scope, $location, $routeParams, workspace:Workspace, marked, fileExtensionTypeRegistry, wikiRepository:GitWikiRepository) {

    Wiki.initScope($scope, $routeParams, $location);
    $scope.selectedItems = [];

    // TODO we could configure this?
    $scope.dateFormat = 'EEE, MMM d, y : hh:mm:ss a';

    $scope.gridOptions = {
      data: 'logs',
      showFilter: false,
      selectedItems: $scope.selectedItems,
      filterOptions: {
        filterText: ''
      },
      columnDefs: [
        {
          field: 'commitHashText',
          displayName: 'Version',
          cellTemplate: '<div class="ngCellText"><a ng-href="#/wiki/version/{{pageId}}/{{row.getProperty(' + "'name'" + ')}}{{hash}}">{{row.getProperty(col.field)}}</a></div>',
          cellFilter: ""
        },
        {
          field: 'date',
          displayName: 'Modified',
          cellFilter: "date: dateFormat"
        },
        {
          field: 'author',
          displayName: 'Author',
          cellFilter: ""
        },
        {
          field: 'shortMessage',
          displayName: 'Message',
          cellFilter: ""
        }
      ]
    };

    $scope.$on("$routeChangeSuccess", function (event, current, previous) {
      // lets do this asynchronously to avoid Error: $digest already in progress
      setTimeout(updateView, 50);
    });

    $scope.$watch('workspace.tree', function () {
      if (!$scope.git && Git.getGitMBean(workspace)) {
        // lets do this asynchronously to avoid Error: $digest already in progress
        //console.log("Reloading the view as we now seem to have a git mbean!");
        setTimeout(updateView, 50);
      }
    });
    $scope.canRevert = () => {
      return $scope.selectedItems.length === 1 && $scope.selectedItems[0] !== $scope.logs[0];
    };

    $scope.revert = () => {
      if ($scope.selectedItems.length > 0) {
        var objectId = $scope.selectedItems[0].name;
        if (objectId) {
          var commitMessage = "Reverting file " + $scope.pageId + " to previous version " + objectId;
          wikiRepository.revertTo(objectId, $scope.pageId, commitMessage, (result) => {
            Wiki.onComplete(result);
            // now lets update the view
            updateView();
          });
        }
      }
    };

    $scope.diff = () => {
      var defaultValue = " ";
      var objectId = defaultValue;
      if ($scope.selectedItems.length > 0) {
        objectId = $scope.selectedItems[0].name || defaultValue;
      }
      var baseObjectId = defaultValue;
      if ($scope.selectedItems.length > 1) {
        baseObjectId = $scope.selectedItems[1].name ||defaultValue;
      }
      var path = "/wiki/diff/" + $scope.pageId + "/" + objectId + "/" + baseObjectId;
      $location.path(path);
    };

    updateView();

    function updateView() {
      var objectId = "";
      var limit = 0;

      $scope.git = wikiRepository.history($scope.branch, objectId, $scope.pageId, limit, (logArray) => {
        $scope.logs = logArray;
        Core.$apply($scope);
      });
    }
  }
}
