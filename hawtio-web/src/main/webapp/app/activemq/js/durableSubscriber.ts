/// <reference path='../../definitions/DefinitelyTyped/angularjs/angular.d.ts'/>
/// <reference path='../../definitions/DefinitelyTyped/jquery/jquery.d.ts'/>
/// <reference path='../../definitions/jolokia-1.0.d.ts'/>
/// <reference path='../../definitions/logger.d.ts'/>
/// <reference path='../../definitions/sugar-1.3.d.ts'/>
/// <reference path='../../core/js/workspace.ts'/>
/// <reference path='../../core/js/coreHelpers.ts'/>
/// <reference path='helpers.ts'/>

module ActiveMQ {
  export function DurableSubscriberController($scope, workspace:Workspace, jolokia) {

      $scope.refresh = loadTable;

      $scope.durableSubscribers = [];

      $scope.tempData = [];

      $scope.gridOptions = {
        selectedItems: [],
        data: 'durableSubscribers',
        displayFooter: false,
        showFilter: false,
        showColumnMenu: true,
        enableColumnResize: true,
        enableColumnReordering: true,
        filterOptions: {
          filterText: ''
        },
        selectWithCheckboxOnly: true,
        showSelectionCheckbox: true,
        maintainColumnRatios: false,
        columnDefs: [
          {
            field: 'clientId',
            displayName: 'Client ID',
            width: '45%'
          },
          {
            field: 'consumerId',
            displayName: 'Consumer ID',
            width: '45%'
          },
          {
            field: 'status',
            displayName: 'Status',
            width: '10%'
          }
        ]
      };

      $scope.$watch('workspace.selection', function () {
        if (workspace.moveIfViewInvalid()) return;

        // lets defer execution as we may not have the selection just yet
        setTimeout(loadTable, 50);
      });

      function loadTable() {
        var mbean = getBrokerMBean(jolokia);
        if (mbean) {
            $scope.durableSubscribers = []
            jolokia.request({type: "read", mbean: mbean, attribute: ["DurableTopicSubscribers"]}, onSuccess( (response) => populateTable(response, "DurableTopicSubscribers", "Active")));
            jolokia.request({type: "read", mbean: mbean, attribute: ["InactiveDurableTopicSubscribers"]}, onSuccess( (response) => populateTable(response, "InactiveDurableTopicSubscribers", "Offline")));
        }
      }

      function populateTable(response, attr, status) {
          var data = response.value;
          $scope.durableSubscribers.push.apply($scope.durableSubscribers, data[attr].map(o => {
              var objectName = o["objectName"];
              var entries = Core.objectNameProperties(objectName);
              entries["_id"] = objectName;
              entries["status"] = status;
              return entries;
          }));

          Core.$apply($scope);
      }

      function getBrokerMBean(jolokia) {
        var mbean = null;
        var selection = workspace.selection;
        if (selection && isBroker(workspace) && selection.objectName) {
          return selection.objectName;
        }
        var folderNames = selection.folderNames;
        //if (selection && jolokia && folderNames && folderNames.length > 1) {
        var parent = selection ? selection.parent : null;
        if (selection && parent && jolokia && folderNames && folderNames.length > 1) {
          mbean = parent.objectName;

          // we might be a destination, so lets try one more parent
          if (!mbean && parent) {
            mbean = parent.parent.objectName;
          }
          if (!mbean) {
            mbean = "" + folderNames[0] + ":BrokerName=" + folderNames[1] + ",Type=Broker";
          }
        }
        return mbean;
      }

  }
}
