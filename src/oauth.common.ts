import * as app from 'tns-core-modules/application';
import * as dialogs from 'tns-core-modules/ui/dialogs';
import * as frameModule from 'tns-core-modules/ui/frame';
import * as platform from 'tns-core-modules/platform';
import * as utils from './oauth-utils';

import * as querystring from 'querystring';
import URL = require('url');

import { Page } from 'tns-core-modules/ui/page';
import { GridLayout } from 'tns-core-modules/ui/layouts/grid-layout';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout';
import { WebView } from 'tns-core-modules/ui/web-view';
import { TnsOAuthWebViewHelper } from "./oauth-webview-helper";

import { ITnsOAuthCredentials, ITnsOAuthTokenResult, OauthParams } from "./interfaces";
import { TnsOAuthTokenCache } from "./oauth-token-cache";
import { TnsOAuth } from "./tns-oauth";


export class Common {
  public credentials: ITnsOAuthCredentials;
  public tokenResult: ITnsOAuthTokenResult;

  constructor() {
    this.tokenResult = this.getTokenFromCache();
  }

  private getAuthHeaderFromCredentials(credentials: ITnsOAuthCredentials) {
    let customAuthHeader: any;
    if (credentials['basicAuthHeader']) {
      customAuthHeader = { 'Authorization': credentials['basicAuthHeader'] };
    }

    return customAuthHeader;
  }


  /**
   * Gets a token for a given resource.
   */
  private getTokenFromCode(credentials: ITnsOAuthCredentials, code: string): Promise<ITnsOAuthTokenResult> {

    let customAuthHeader: any = this.getAuthHeaderFromCredentials(credentials);

    let oauth2 = new TnsOAuth(
      credentials.clientId,
      credentials.clientSecret,
      credentials.authority,
      credentials.tokenEndpointBase,
      credentials.authorizeEndpoint,
      credentials.tokenEndpoint,
      customAuthHeader
    );

    let oauthParams = {
      grant_type: 'authorization_code',
      redirect_uri: credentials.redirectUri,
      response_mode: 'form_post',
      nonce: utils.newUUID(),
      state: 'abcd'
    };

    return oauth2.getOAuthAccessToken(code, oauthParams);
  }

  /**
   * Gets a new access token via a previously issued refresh token.
   */
  private getTokenFromRefreshToken(credentials: ITnsOAuthCredentials, refreshToken: string): Promise<ITnsOAuthTokenResult> {

    let customAuthHeader: any = this.getAuthHeaderFromCredentials(credentials);

    var oauth2 = new TnsOAuth(
      credentials.clientId,
      credentials.clientSecret,
      credentials.authority,
      credentials.tokenEndpointBase,
      credentials.authorizeEndpoint,
      credentials.tokenEndpoint,
      customAuthHeader
    );

    let oauthParams = {
      grant_type: 'refresh_token',
      redirect_uri: credentials.redirectUri,
      response_mode: 'form_post',
      nonce: utils.newUUID(),
      state: 'abcd'
    };

    return oauth2.getOAuthAccessToken(refreshToken, oauthParams);
  }

  /**
   * Generate a fully formed uri to use for authentication based on the supplied resource argument
   * @return {string} a fully formed uri with which authentication can be completed
   */
  private getAuthUrl(credentials: ITnsOAuthCredentials): string {
    return credentials.authority + credentials.authorizeEndpoint +
      '?client_id=' + credentials.clientId +
      '&response_type=code' +
      '&redirect_uri=' + credentials.redirectUri +
      '&scope=' + credentials.scope +
      '&response_mode=query' +
      '&nonce=' + utils.newUUID() +
      '&state=abcd';
  }

  private getTokenFromCache() {
    return TnsOAuthTokenCache.getToken();
  }

  private loginViaAuthorizationCodeFlow(credentials: ITnsOAuthCredentials, successPage?: string): Promise<ITnsOAuthTokenResult> {
    return new Promise((resolve, reject) => {
      var navCount = 0;

      let checkCodeIntercept = (webView, error, url): boolean => {
        var retStr = '';
        try {
          if (error && error.userInfo && error.userInfo.allValues && error.userInfo.allValues.count > 0) {
            let val0 = error.userInfo.allValues[0];
            if (val0.absoluteString) {
              retStr = error.userInfo.allValues[0].absoluteString;
            } else if (val0.userInfo && val0.userInfo.allValues && val0.userInfo.allValues.count > 0) {
              retStr = val0.userInfo.allValues[0];
            } else {
              retStr = val0;
            }
          } else if (webView.request && webView.request.URL && webView.request.URL.absoluteString) {
            retStr = webView.request.URL.absoluteString;
          } else if (url) {
            retStr = url;
          }
        }
        catch (ex) {
          reject('Failed to resolve return URL');
        }

        if (retStr != '') {
          let parsedRetStr = URL.parse(retStr);
          if (parsedRetStr.query) {
            let qsObj = querystring.parse(parsedRetStr.query);
            let codeStr = qsObj['code'] ? qsObj['code'] : qsObj['xsrfsign'];
            let errSubCode = qsObj['error_subcode'];
            if (codeStr) {
              try {
                this.getTokenFromCode(credentials, codeStr)
                  .then((response: ITnsOAuthTokenResult) => {
                    TnsOAuthTokenCache.setToken(response);
                    if (successPage && navCount === 0) {
                      let navEntry: frameModule.NavigationEntry = {
                        moduleName: successPage,
                        clearHistory: true
                      };
                      frameModule.topmost().navigate(navEntry);
                    } else {
                      frameModule.topmost().goBack();
                    }
                    navCount++;
                    resolve(response);
                  })
                  .catch((er) => {
                    reject(er);
                  });

              } catch (er) {
                console.error('getOAuthAccessToken error occurred...');
                console.dir(er);
                reject(er);
              }
              return true;
            } else {
              if (errSubCode) {
                if (errSubCode == 'cancel') {
                  frameModule.topmost().goBack();
                }
              }
            }
          }
        }
        return false;
      };

      frameModule.topmost().navigate(() => { return this.loginPageFunc(checkCodeIntercept, this.getAuthUrl(credentials)) });
    });
  }

  private refreshToken(credentials: ITnsOAuthCredentials): Promise<ITnsOAuthTokenResult> {
    return new Promise((resolve, reject) => {
      try {
        let oldTokenResult = TnsOAuthTokenCache.getToken();

        this.getTokenFromRefreshToken(credentials, oldTokenResult.refreshToken)
          .then((response: ITnsOAuthTokenResult) => {
            TnsOAuthTokenCache.setToken(response);
            resolve(response);
          })
          .catch((er) => {
            reject(er);
          });
      } catch (er) {
        console.error('refreshToken error occurred...');
        console.dir(er);
        reject(er);
      }
    });
  }

  private logout(cookieDomains: string[], successPage?: string) {
    if (platform.isIOS) {
      let cookieArr = utils.nsArrayToJSArray(NSHTTPCookieStorage.sharedHTTPCookieStorage.cookies);
      for (var i = 0; i < cookieArr.length; i++) {
        var cookie: NSHTTPCookie = <NSHTTPCookie>cookieArr[i];
        for (var j = 0; j < cookieDomains.length; j++) {
          if (utils.endsWith(cookie.domain, cookieDomains[j])) {
            NSHTTPCookieStorage.sharedHTTPCookieStorage.deleteCookie(cookie);
          }
        }
      }
    } else if (platform.isAndroid) {
      let cookieManager = android.webkit.CookieManager.getInstance();
      if ((<any>cookieManager).removeAllCookies) {
        let cm23 = <any>cookieManager;
        cm23.removeAllCookies(null);
        cm23.flush();
      } else if (cookieManager.removeAllCookie) {
        cookieManager.removeAllCookie();
        cookieManager.removeSessionCookie();
      }
    }


    TnsOAuthTokenCache.removeToken();

    if (successPage) {
      let navEntry: frameModule.NavigationEntry = {
        moduleName: successPage,
        clearHistory: true
      };
      frameModule.topmost().navigate(navEntry);
    }
  }

  private loginPageFunc(checkCodeIntercept, authUrl) {
    let wv = new WebView();

    TnsOAuthWebViewHelper.initWithWebViewAndIntercept(wv, checkCodeIntercept);

    let grid = new GridLayout();
    grid.addChild(wv);

    let stack = new StackLayout();
    stack.addChild(grid);

    let page = new Page();
    page.content = stack;

    wv.src = authUrl;

    return page;
  };
}
