import { Page } from 'tns-core-modules/ui/page';
import { GridLayout } from 'tns-core-modules/ui/layouts/grid-layout';
import { StackLayout } from 'tns-core-modules/ui/layouts/stack-layout';
import { WebView } from 'tns-core-modules/ui/web-view';
//import { TnsOAuthWebViewDelegateImpl } from './tns-oauth-webview';
import { TnsOAuthWebViewHelper } from './tns-oauth-webview-helper';


export class TnsOAuthPageProvider {
    private _checkCodeIntercept: (WebView, error?, url?) => boolean;
    private _authUrl: string;

    constructor(checkCodeIntercept, authUrl) {
        this._checkCodeIntercept = checkCodeIntercept;
        this._authUrl = authUrl;
    }

    public loginPageFunc() {
        let wv = new WebView();

        TnsOAuthWebViewHelper.initWithWebViewAndIntercept(wv, this._checkCodeIntercept);

        let grid = new GridLayout();
        grid.addChild(wv);

        let stack = new StackLayout();
        stack.addChild(grid);

        let page = new Page();
        page.content = stack;

        wv.src = this._authUrl;

        return page;
    };
}
