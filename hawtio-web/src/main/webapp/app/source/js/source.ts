/// <reference path='sourcePlugin.ts'/>

module Source {

  export function SourceController($scope, $location, $routeParams, workspace:Workspace, fileExtensionTypeRegistry, jolokia) {

    $scope.pageId = Wiki.pageId($routeParams, $location);
    $scope.format = Wiki.fileFormat($scope.pageId, fileExtensionTypeRegistry);
    var lineNumber = $location.search()["line"] || 1;
    var mavenCoords = $routeParams["mavenCoords"];
    var className = $routeParams["className"] || "";
    var fileName = $scope.pageId || "/";
    var classNamePath = className.replace(/\./g, '/');

    $scope.loadingMessage = "Loading source code for class <b>" + className + "</b> from artifacts <b>" + mavenCoords + "</b>";

    //console.log("Source format is " + $scope.format + " line " + lineNumber + " className " + className + " file " + fileName);

    $scope.breadcrumbs = [];

    var idx = fileName.lastIndexOf('/');
    var path = "/";
    var name = fileName;
    if (idx > 0) {
      path = fileName.substring(0, idx);
      name = fileName.substring(idx + 1);
    } else if (className && className.indexOf('.') > 0) {
      path = classNamePath;
      idx = path.lastIndexOf('/');
      if (idx > 0) {
        name = path.substring(idx + 1);
        path = path.substring(0, idx);
      }
    }
    $scope.breadcrumbs = Source.createBreadcrumbLinks(mavenCoords, path);
    $scope.breadcrumbs.push({href: $location.url(), name: name, active: true});

    $scope.javaDocLink = () => {
      var path = classNamePath;
      if (!path && fileName && fileName.endsWith(".java")) {
        path = fileName.substring(0, fileName.length - 5);
      }
      if (path) {
        return "javadoc/" + mavenCoords + "/" + path + ".html";
      }
      return null;
    };
    var options = {
      readOnly: true,
      mode: $scope.format,
      lineNumbers: true,

      // Quick hack to get the codeMirror instance.
      onChange: function(codeMirror) {
        if (codeMirror) {
          if (!$scope.codeMirror) {
            lineNumber -= 1;
            var lineText = codeMirror.getLine(lineNumber);
            var endChar = (lineText) ? lineText.length : 1000;
            var start = {line: lineNumber, ch: 0};
            var end = {line: lineNumber, ch: endChar};
            codeMirror.scrollIntoView(start);
            codeMirror.setCursor(start);
            codeMirror.setSelection(start, end);
            codeMirror.refresh();
            codeMirror.focus();
          }
          $scope.codeMirror = codeMirror;
        }
      }
    };
    $scope.codeMirrorOptions = CodeEditor.createEditorSettings(options);

    $scope.onChange = (codeMirror) => {
      log.debug("codeMirror: ", codeMirror);
      if (codeMirror) {
        lineNumber -= 1;
        var lineText = codeMirror.getLine(lineNumber);
        var endChar = (lineText) ? lineText.length : 1000;
        var start = {line: lineNumber, ch: 0};
        var end = {line: lineNumber, ch: endChar};
        codeMirror.scrollIntoView(start);
        codeMirror.setCursor(start);
        codeMirror.setSelection(start, end);
        codeMirror.refresh();
        codeMirror.focus();
      }
    };

    $scope.$watch('workspace.tree', function (oldValue, newValue) {
      if (newValue === oldValue) {
        return;
      }
      if (!$scope.git && Git.getGitMBean(workspace)) {
        // lets do this asynchronously to avoid Error: $digest already in progress
        //console.log("Reloading the view as we now seem to have a git mbean!");
        setTimeout(updateView, 50);
      }
    });

    $scope.$on("$routeChangeSuccess", function (event, current, previous) {
      // lets do this asynchronously to avoid Error: $digest already in progress
      setTimeout(updateView, 50);
    });

    function viewContents(response) {
      $scope.source = response;
      $scope.loadingMessage = null;
      Core.$apply($scope);
    }

    function updateView() {
      var mbean = Source.getInsightMBean(workspace);
      if (mbean) {
        jolokia.execute(mbean, "getSource", mavenCoords, className, fileName, {
          success: viewContents,
          error: (response) => {
            log.error("Failed to download the source code for the maven artifact: ", mavenCoords);
            log.info("Stack trace: ", response.stacktrace);
            $scope.loadingMessage = "Could not download file, please see console for details"
            Core.$apply($scope);
          }
        });
      }
    }
  }
}
