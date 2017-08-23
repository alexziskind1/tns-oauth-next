import "./bundle-config";

import * as application from 'tns-core-modules/application';

import * as tnsOAuthModule from 'nativescript-oauth';

var facebookInitOptions: tnsOAuthModule.ITnsOAuthOptionsFacebook = {
    clientId: '691208554415645',
    clientSecret: 'd8725ac416fa1bb1917ccffd1670e3c6',
    scope: ['email']
};

tnsOAuthModule.initFacebook(facebookInitOptions);


application.start({ moduleName: "main-page" });
