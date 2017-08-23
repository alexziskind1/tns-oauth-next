import { Common } from './oauth.common';
import {
  ITnsAuthHelper,
  ITnsOAuthOptionsOffice365,
  ITnsOAuthOptionsFacebook,
  ITnsOAuthOptionsGoogle,
  ITnsOAuthOptionsUaa,
  ITnsOAuthOptionsLinkedIn
} from './interfaces';
export * from './interfaces';

export declare class Oauth extends Common {
  // define your typings manually
  // or..
  // take the ios or android .d.ts files and copy/paste them here
}

export declare var instance: ITnsAuthHelper;
export declare function initOffice365(options: ITnsOAuthOptionsOffice365): Promise<any>;
export declare function initFacebook(options: ITnsOAuthOptionsFacebook): Promise<any>;
export declare function initGoogle(options: ITnsOAuthOptionsGoogle): Promise<any>;
export declare function initUaa(options: ITnsOAuthOptionsUaa): Promise<any>;
export declare function initLinkedIn(options: ITnsOAuthOptionsLinkedIn): Promise<any>;

export declare function accessToken(): string;
export declare function login(successPage?: string): Promise<string>;
export declare function logout(successPage?: string): Promise<void>;
export declare function accessTokenExpired(): boolean;
export declare function ensureValidToken(): Promise<string>;