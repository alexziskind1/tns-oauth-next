import * as querystring from 'querystring';
import URL = require('url');
import * as http from 'tns-core-modules/http';
//import * as trace from "tns-core-modules/trace";
//import * as frameModule from 'tns-core-modules/ui/frame';
//import * as platform from 'tns-core-modules/platform';
//import * as utils from './oauth-utils';
//import { TnsOAuthPageProvider } from './tns-oauth-page-provider';
//import { TnsOAuthTokenCache } from './oauth-token-cache';
import { ITnsOAuthCredentials, ITnsOAuthTokenResult } from "./interfaces";


//export var ACCESS_TOKEN_CACHE_KEY = 'ACCESS_TOKEN_CACHE_KEY';
//export var REFRESH_TOKEN_CACHE_KEY = 'REFRESH_TOKEN_CACHE_KEY';


export class TnsOAuth {
    private _clientId: string;
    private _clientSecret: string;
    private _baseSite: string;
    private _baseSiteToken: string;
    private _authorizeUrl: string;
    private _accessTokenUrl: string;
    private _accessTokenName: string;
    private _authMethod: string;
    private _customHeaders: any;
    private _useAuthorizationHeaderForGET: boolean;

    constructor(clientId: string,
        clientSecret: string,
        baseSite: string,
        baseSiteToken: string,
        authorizePath: string,
        accessTokenPath: string,
        customHeaders?: any) {
        this._clientId = clientId;
        this._clientSecret = clientSecret;
        this._baseSite = baseSite;
        this._baseSiteToken = baseSiteToken;
        this._authorizeUrl = authorizePath || "/oauth/authorize";
        this._accessTokenUrl = accessTokenPath || "/oauth/access_token";
        this._accessTokenName = "access_token";
        this._authMethod = "Bearer";
        this._customHeaders = customHeaders || {};
        this._useAuthorizationHeaderForGET = false;
    }

    get accessTokenUrl(): string {
        if (this._baseSiteToken && this._baseSiteToken != '') {
            return this._baseSiteToken + this._accessTokenUrl;
        } else {
            return this._baseSite + this._accessTokenUrl; /* + "?" + querystring.stringify(params); */
        }
    }

    // This 'hack' method is required for sites that don't use
    // 'access_token' as the name of the access token (for requests).
    // ( http://tools.ietf.org/html/draft-ietf-oauth-v2-16#section-7 )
    // it isn't clear what the correct value should be atm, so allowing
    // for specific (temporary?) override for now.
    public setAccessTokenName(name) {
        this._accessTokenName = name;
    }

    // Sets the authorization method for Authorization header.
    // e.g. Authorization: Bearer <token>  # "Bearer" is the authorization method.
    public setAuthMethod(authMethod) {
        this._authMethod = authMethod;
    };

    // If you use the OAuth2 exposed 'get' method (and don't construct your own _request call )
    // this will specify whether to use an 'Authorize' header instead of passing the access_token as a query parameter
    public useAuthorizationHeaderforGET(useIt) {
        this._useAuthorizationHeaderForGET = useIt;
    }

    // Build the authorization header. In particular, build the part after the colon.
    // e.g. Authorization: Bearer <token>  # Build "Bearer <token>"
    public buildAuthHeader(token) {
        return this._authMethod + ' ' + token;
    };

    public getAuthorizeUrl(params) {
        var params = params || {};
        params['client_id'] = this._clientId;
        return this._baseSite + this._authorizeUrl + "?" + querystring.stringify(params);
    }

    public getOAuthAccessToken(code, params): Promise<ITnsOAuthTokenResult> {
        var params = params || {};
        params['client_id'] = this._clientId;
        if (this._clientSecret && this._clientSecret != '') {
            params['client_secret'] = this._clientSecret;
        }

        var codeParam = (params.grant_type === 'refresh_token') ? 'refresh_token' : 'code';
        params[codeParam] = code;

        var post_data = querystring.stringify(params);
        var post_headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };

        return new Promise<ITnsOAuthTokenResult>((resolve, reject) => {
            this._request("POST", this.accessTokenUrl, post_headers, post_data, null)
                .then((response: http.HttpResponse) => {
                    var results;
                    try {
                        // As of http://tools.ietf.org/html/draft-ietf-oauth-v2-07
                        // responses should be in JSON
                        results = response.content.toJSON();
                    }
                    catch (e) {
                        // .... However both Facebook + Github currently use rev05 of the spec
                        // and neither seem to specify a content-type correctly in their response headers :(
                        // clients of these services will suffer a *minor* performance cost of the exception
                        // being thrown
                        results = querystring.parse(response.content.toString());
                    }
                    let access_token = results["access_token"];
                    let refresh_token = results["refresh_token"];
                    let expires_in = results["expires_in"];
                    delete results["refresh_token"];

                    let expSecs = Math.floor(parseFloat(expires_in));
                    let expDate = new Date();
                    expDate.setSeconds(expDate.getSeconds() + expSecs);

                    let tokenResult: ITnsOAuthTokenResult = {
                        accessToken: access_token,
                        refreshToken: refresh_token,
                        accessTokenExpiration: expDate,
                        refreshTokenExpiration: expDate
                    };

                    resolve(tokenResult);
                })
                .catch((er) => {
                    reject(er);
                });
        });
    }

    private _request(method, url, headers, post_body, access_token): Promise<http.HttpResponse> {
        if (!URL) throw 'URL not defined';
        var parsedUrl = URL.parse(url, true);

        var realHeaders = {};
        for (var key in this._customHeaders) {
            realHeaders[key] = this._customHeaders[key];
        }
        if (headers) {
            for (var key in headers) {
                realHeaders[key] = headers[key];
            }
        }
        realHeaders['Host'] = parsedUrl.host;

        if (access_token && !('Authorization' in realHeaders)) {
            if (!parsedUrl.query) {
                parsedUrl.query = {};
            }
            parsedUrl.query[this._accessTokenName] = access_token;
        }

        var queryStr = querystring.stringify(parsedUrl.query);
        if (queryStr) {
            queryStr = "?" + queryStr;
        }
        var options = {
            host: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + queryStr,
            method: method,
            headers: realHeaders
        };

        return this._executeRequest(options, url, post_body);
    }

    private _executeRequest(options, url, post_body): Promise<http.HttpResponse> {
        var promise = http.request({
            url: url,
            method: options.method,
            headers: options.headers,
            content: post_body
        });
        return promise;
    }
}