berry
-----

Berry extends the [appool](https://github.com/tequnix/appool) service 
with the ability to run any installed
package. For every running app a resource is created that streams the
standard output of the corresponding process. The service additionally
can return a list of all running apps. Every running app can be killed
with a DELETE request. The corresponding resource will then get deleted.

Berry can be installed with npm:

    git clone https://github.com/tequnix/berry
    cd berry
    npm install

The following table shows the REST Interface for berry:

HTTP Method | Path | Return type | Action
------------|------|-------------|--------
POST        | /apps/:name/run | JSON | Runs the specified app and re- turns the path of the newly created resource.
GET         | /running/:pid   | text | Streams the standard output of the running process with the specified process id.
DELETE      | /running/:pid   | 204, no content | Deletes the resource and kills the corresponding process.
GET         | /running        | JSON    | Returns an array containing all running processes with process id and app name.
