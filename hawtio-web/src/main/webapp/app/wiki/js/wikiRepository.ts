/// <reference path='wikiPlugin.ts'/>
module Wiki {

  export interface WikiRepository {
    putPage(branch:string, path:string, contents:string, commitMessage:string, fn): void;

    removePage(branch:string, path:string, commitMessage:string, fn): void;
  }

  export class GitWikiRepository implements WikiRepository {
    public directoryPrefix = "";

    constructor(public factoryMethod:() => Git.GitRepository) {
    }

    public exists(branch:string, path:string, fn) {
      var fullPath = this.getPath(path);
      this.git().exists(branch, fullPath, fn);
    }

    public completePath(branch:string, completionText:string, directoriesOnly:boolean, fn) {
      return this.git().completePath(branch, completionText, directoriesOnly, fn);
    }

    public getPage(branch:string, path:string, objectId:string, fn) {
      var git = this.git();
      path = path || "/";
      if (git) {
        if (objectId) {
          var blobPath = this.getLogPath(path);
          // TODO deal with versioned directories?
          git.getContent(objectId, blobPath, (content) => {
            var details = {
              text: content,
              directory: false
            };
            fn(details);
          });
        } else {
          var fullPath = this.getPath(path);
          git.read(branch, fullPath, (details) => {

            // lets fix up any paths to be relative to the wiki
            var children = details.children;
            angular.forEach(children, (child) => {
              var path = child.path;
              if (path) {
                var directoryPrefix = "/" + this.directoryPrefix;
                if (path.startsWith(directoryPrefix)) {
                  path = "/" + path.substring(directoryPrefix.length);
                  child.path = path;
                }
              }
            });
            fn(details);
          });
        }
      }
      return git;
    }

    /**
     * Performs a diff on the versions
     */
    public diff(objectId:string, baseObjectId:string, path:string, fn) {
      var fullPath = this.getLogPath(path);
      var git = this.git();
      if (git) {
        git.diff(objectId, baseObjectId, fullPath, (content) => {
          var details = {
            text: content,
            format: "diff",
            directory: false
          };
          fn(details);
        });
      }
      return git;
    }

    public putPage(branch:string, path:string, contents:string, commitMessage:string, fn) {
      var fullPath = this.getPath(path);
      this.git().write(branch, fullPath, commitMessage, contents, fn);
    }

    public createDirectory(branch:string, path:string, commitMessage:string, fn) {
      var fullPath = this.getPath(path);
      this.git().createDirectory(branch, fullPath, commitMessage, fn);
    }

    public revertTo(objectId:string, blobPath:string, commitMessage:string, fn) {
      var fullPath = this.getLogPath(blobPath);
      this.git().revertTo(objectId, fullPath, commitMessage, fn);
    }

    public rename(branch:string, oldPath:string,  newPath:string, commitMessage:string, fn) {
      var fullOldPath = this.getPath(oldPath);
      var fullNewPath = this.getPath(newPath);
      if (!commitMessage) {
        commitMessage = "Renaming page " + oldPath + " to " + newPath;
      }
      this.git().rename(branch, fullOldPath, fullNewPath, commitMessage, fn);
    }

    public removePage(branch:string, path:string, commitMessage:string, fn) {
      var fullPath = this.getPath(path);
      if (!commitMessage) {
        commitMessage = "Removing page " + path;
      }
      this.git().remove(branch, fullPath, commitMessage, fn);
    }

    /**
     * Returns the full path to use in the git repo
     */
    public getPath(path:string) {
      var directoryPrefix = this.directoryPrefix;
      return (directoryPrefix) ? directoryPrefix + path : path;
    }

    public getLogPath(path:string) {
      return Core.trimLeading(this.getPath(path), "/");
    }

    /**
     * Return the history of the repository or a specific directory or file path
     */
    public history(branch:string, objectId:string, path:string, limit:number, fn) {
      var fullPath = this.getLogPath(path);
      var git = this.git();
      if (git) {
          git.history(branch, objectId, fullPath, limit, fn);
      }
      return git;
    }

    /**
     * Get the contents of a blobPath for a given commit objectId
     */
    public getContent(objectId:string, blobPath:string, fn) {
      var fullPath = this.getLogPath(blobPath);
      var git = this.git();
      if (git) {
        git.getContent(objectId, fullPath, fn);
      }
      return git;
    }

    /**
     * Get the list of branches
     */
    public branches(fn) {
      var git = this.git();
      if (git) {
        git.branches(fn);
      }
      return git;
    }


    /**
     * Get the JSON contents of the path with optional name wildcard and search
     */
    public jsonChildContents(path:string, nameWildcard:string, search:string, fn) {
      var fullPath = this.getLogPath(path);
      var git = this.git();
      if (git) {
        git.readJsonChildContent(fullPath, nameWildcard, search, fn);
      }
      return git;
    }


    public git() {
      var repository = this.factoryMethod();
      if (!repository) {
        console.log("No repository yet! TODO we should use a local impl!");
      }
      return repository;
    }
  }
}
