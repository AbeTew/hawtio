/// <reference path='dashboardPlugin.ts'/>

module Dashboard {

  export class RectangleLocation { // TODO implements ng.ILocationService {
    private _path: string;
    private _hash: string;
    private _search: any;

    constructor(public delegate:ng.ILocationService, path:string, search, hash:string) {
      this._path = path;
      this._search = search;
      this._hash = hash;
    }

    absUrl() {
      return this.protocol() + this.host() + ":" + this.port() + this.path() + this.search();
    }

    hash(newHash:string = null) {
      if (newHash) {
        return this.delegate.hash(newHash).search('tab', null);;
        //this._hash = newHash;
      }
      return this._hash;
    }

    host():string {
      return this.delegate.host();
    }

    path(newPath:string = null) {
      if (newPath) {
        return this.delegate.path(newPath).search('tab', null);
      }
      return this._path;
    }

    port():number {
      return this.delegate.port();
    }

    protocol() {
      return this.delegate.port();
    }

    replace() {
      // TODO
      return this;
    }

    search(parametersMap:any = null) {
      if (parametersMap) {
        return this.delegate.search(parametersMap);
      }
      return this._search;
    }

/*
    search(parameter:string, parameterValue:any):ng.ILocationService {
      // TODO
      return this;
    }
*/

    url(newValue: string = null) {
      if (newValue) {
        return this.delegate.url(newValue).search('tab', null);
      }
      return this.absUrl();
    }

  }
}
