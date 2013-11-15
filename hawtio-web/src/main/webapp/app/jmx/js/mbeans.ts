/// <reference path='jmxPlugin.ts'/>
module Jmx {
  export function MBeansController($scope, $location: ng.ILocationService, workspace: Workspace) {

    $scope.$on("$routeChangeSuccess", function (event, current, previous) {
      // lets do this asynchronously to avoid Error: $digest already in progress
      setTimeout(updateSelectionFromURL, 50);

    });

    $scope.select = (node:DynaTreeNode) => {
      $scope.workspace.updateSelectionNode(node);
      Core.$apply($scope);
    };

    function updateSelectionFromURL() {
      updateTreeSelectionFromURL($location, $("#jmxtree"));
    }

    $scope.populateTree = () => {
      var treeElement = $("#jmxtree");
      $scope.tree = workspace.tree;
      enableTree($scope, $location, workspace, treeElement, $scope.tree.children, true);
      setTimeout(updateSelectionFromURL, 50);
    };

    $scope.$on('jmxTreeUpdated', $scope.populateTree);

    $scope.populateTree();
  }
}
