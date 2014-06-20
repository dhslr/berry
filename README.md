berry
-----

Berry extends the [appool](https://github.com/tequnix/appool) service 
with the ability to run any installed
package. For every running app a resource is created that streams the
standard output of the corresponding process. The service additionally
can return a list of all running apps. Every running app can be killed
with a DELETE request. The corresponding resource will then get deleted.

Berry can be installed with npm:

    % git clone https://github.com/tequnix/berry
    % cd berry
    % npm install
