import * as applicationModule from 'tns-core-modules/application';
import * as utils from 'tns-core-modules/utils/utils';

import { AuthHelperOffice365 } from './auth-helper-office365';
import { AuthHelperFacebook } from './auth-helper-facebook';
import { AuthHelperGoogle } from './auth-helper-google';
import { AuthHelperUaa } from './auth-helper-uaa';
import { AuthHelperLinkedIn } from './auth-helper-linkedin';

import * as TnsOAuth from './tns-oauth-interfaces';

export let instance: TnsOAuth.ITnsAuthHelper = null;

export function initOffice365(options: TnsOAuth.ITnsOAuthOptionsOffice365): Promise<any> {
    return new Promise(function (resolve, reject) {
        try {
            if (instance !== null) {
                reject("You already ran init");
                return;
            }

            instance = new AuthHelperOffice365(options.clientId, options.scope);
            resolve(instance);
        } catch (ex) {
            console.log("Error in AuthHelperOffice365.init: " + ex);
            reject(ex);
        }
    });
}

export function initFacebook(options: TnsOAuth.ITnsOAuthOptionsFacebook): Promise<any> {
    return new Promise(function (resolve, reject) {
        try {
            if (instance !== null) {
                reject("You already ran init");
                return;
            }

            instance = new AuthHelperFacebook(options.clientId, options.clientSecret, options.scope);
            resolve(instance);
        } catch (ex) {
            console.log("Error in AuthHelperFacebook.init: " + ex);
            reject(ex);
        }
    });
}

export function initGoogle(options: TnsOAuth.ITnsOAuthOptionsGoogle): Promise<any> {
    return new Promise(function (resolve, reject) {
        try {
            if (instance !== null) {
                reject("You already ran init");
                return;
            }

            instance = new AuthHelperGoogle(options.clientId, options.scope);
            resolve(instance);
        } catch (ex) {
            console.log("Error in AuthHelperFacebook.init: " + ex);
            reject(ex);
        }
    });
}


export function initUaa(options: TnsOAuth.ITnsOAuthOptionsUaa): Promise<any> {
    return new Promise(function (resolve, reject) {
        try {
            if (instance !== null) {
                reject("You already ran init");
                return;
            }

            instance = new AuthHelperUaa(options.authority, options.redirectUri, options.clientId, options.clientSecret, options.scope, options.cookieDomains, options.basicAuthHeader);
            resolve(instance);
        } catch (ex) {
            console.log("Error in AuthHelperUaa.init: " + ex);
            reject(ex);
        }
    });
}


export function initLinkedIn(options: TnsOAuth.ITnsOAuthOptionsLinkedIn): Promise<any> {
    return new Promise(function (resolve, reject) {
        try {
            if (instance !== null) {
                reject("You already ran init");
                return;
            }

            instance = new AuthHelperLinkedIn(options.clientId, options.clientSecret, options.redirectUri, options.scope);
            resolve(instance);
        } catch (ex) {
            console.log("Error in AuthHelperLinkedIn.init: " + ex);
            reject(ex);
        }
    });
}


export function accessToken(): string {
    return instance.tokenResult.accessToken;
}

export function login(successPage?: string): Promise<string> {
    return instance.login(successPage);
}
export function logout(successPage?: string): Promise<void> {
    return instance.logout(successPage);
}
export function accessTokenExpired(): boolean {
    return instance.accessTokenExpired();
}

export function ensureValidToken(): Promise<string> {
    return new Promise((resolve, reject) => {
        if (instance.accessTokenExpired()) {
            if (instance.refreshTokenExpired()) {
                login()
                    .then((response: string) => {
                        resolve(response);
                    })
                    .catch((er) => {
                        reject(er);
                    });
            } else {
                instance.refreshToken()
                    .then((result: string) => {
                        resolve(result);
                    })
                    .catch((er) => {
                        reject(ErrorEvent);
                    });
            }
        } else {
            resolve(accessToken());
        }
    });

}


