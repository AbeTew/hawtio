/// <reference path='uiPlugin.ts'/>
module UI {

  export class TablePager {
    public restrict = 'A';
    public scope = true;

    public templateUrl = UI.templatePath + 'tablePager.html';

    public link:(scope, element, attrs) => any;

    public $scope = null;
    public element = null;
    public attrs = null;
    public tableName:string = null;
    public setRowIndexName:string = null;
    public rowIndexName:string = null;

    constructor() {
      // necessary to ensure 'this' is this object <sigh>
      this.link = (scope, element, attrs) => {
        return this.doLink(scope, element, attrs);
      }
    }

    private doLink(scope, element, attrs) {
      this.$scope = scope;
      this.element = element;
      this.attrs = attrs;
      this.tableName = attrs["hawtioPager"] || attrs["array"] || "data";
      this.setRowIndexName = attrs["onIndexChange"] || "onIndexChange";
      this.rowIndexName = attrs["rowIndex"] || "rowIndex";

      scope.first = () => {
        this.goToIndex(0);
      };

      scope.last = () => {
        this.goToIndex(scope.tableLength() - 1);
      };

      scope.previous = () => {
        this.goToIndex(scope.rowIndex() - 1);
      };

      scope.next = () => {
        this.goToIndex(scope.rowIndex() + 1);
      };

      scope.isEmptyOrFirst = () => {
        var idx = scope.rowIndex();
        var length = scope.tableLength();
        return length <= 0 || idx <= 0;
      };

      scope.isEmptyOrLast = () => {
        var idx = scope.rowIndex();
        var length = scope.tableLength();
        return length < 1 || idx + 1 >= length;
      };

      scope.rowIndex = () => {
        return scope.$parent[this.rowIndexName];
      };

      scope.tableLength = () => {
        var data = this.tableData();
        return data ? data.length : 0;
      };
    }


    public tableData() {
      return this.$scope.$parent[this.tableName] || [];
    }

    public goToIndex(idx:number) {
      var name = this.setRowIndexName;
      var fn = this.$scope[name];
      if (angular.isFunction(fn)) {
        fn(idx);
      } else {
        console.log("No function defined in scope for " + name + " but was " + fn);
        this.$scope[this.rowIndexName] = idx;
      }
    }
  }
}
