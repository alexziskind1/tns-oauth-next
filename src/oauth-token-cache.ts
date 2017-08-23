import * as applicationSettingsModule from "tns-core-modules/application-settings";
import { ITnsOAuthTokenResult } from "./interfaces";

const TNS_OAUTH_KEY = "TNS_OAUTH_KEY";

export class TnsOAuthTokenCache {

    public static hasToken(): boolean {
        return applicationSettingsModule.hasKey(TNS_OAUTH_KEY);
    }

    public static getToken(): ITnsOAuthTokenResult {
        if (applicationSettingsModule.hasKey(TNS_OAUTH_KEY)) {
            let trStr = applicationSettingsModule.getString(TNS_OAUTH_KEY);
            let tr = <ITnsOAuthTokenResult>JSON.parse(trStr);

            if (tr.accessTokenExpiration) {
                tr.accessTokenExpiration = new Date(tr.accessTokenExpiration.toString());
            }

            if (tr.refreshTokenExpiration) {
                tr.refreshTokenExpiration = new Date(tr.refreshTokenExpiration.toString());
            }

            return tr;
        }
        else return null;
    }

    public static setToken(token: ITnsOAuthTokenResult) {
        applicationSettingsModule.setString(TNS_OAUTH_KEY, JSON.stringify(token));
    }

    public static removeToken() {
        applicationSettingsModule.remove(TNS_OAUTH_KEY);
    }

}
