"use strict";
/*---------------------------------------------------------------------------------------------
*  Copyright (c) Alessandro Fragnani. All rights reserved.
*  Licensed under the MIT License. See License.md in the project root for license information.
*--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsNewManager = void 0;
const path = require("path");
const semver = require("semver");
const vscode = require("vscode");
const PageBuilder_1 = require("./PageBuilder");
class WhatsNewManager {
    constructor(context) {
        this.context = context;
    }
    isRunningOnCodespaces() {
        var _a;
        return ((_a = vscode.env.remoteName) === null || _a === void 0 ? void 0 : _a.toLocaleLowerCase()) === 'codespaces';
    }
    registerContentProvider(publisher, extensionName, contentProvider) {
        this.publisher = publisher;
        this.extensionName = extensionName;
        this.contentProvider = contentProvider;
        this.versionKey = `${this.extensionName}.version`;
        this.context.globalState.setKeysForSync([this.versionKey]);
        return this;
    }
    registerSocialMediaProvider(socialMediaProvider) {
        this.socialMediaProvider = socialMediaProvider;
        return this;
    }
    registerSponsorProvider(sponsorProvider) {
        this.sponsorProvider = sponsorProvider;
        return this;
    }
    showPageInActivation() {
        // load data from extension manifest
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.extension = vscode.extensions.getExtension(`${this.publisher}.${this.extensionName}`);
        const previousExtensionVersion = this.context.globalState.get(this.versionKey);
        this.showPageIfVersionDiffers(this.extension.packageJSON.version, previousExtensionVersion);
    }
    showPage() {
        // Create and show panel
        const panel = vscode.window.createWebviewPanel(`${this.extensionName}.whatsNew`, `What's New in ${this.extension.packageJSON.displayName}`, vscode.ViewColumn.One, { enableScripts: true });
        // Get path to resource on disk
        const onDiskPath = vscode.Uri.file(path.join(this.context.extensionPath, "vscode-whats-new", "ui", "whats-new.html"));
        const pageUri = onDiskPath.with({ scheme: "vscode-resource" });
        // Local path to main script run in the webview
        const cssPathOnDisk = vscode.Uri.file(path.join(this.context.extensionPath, "vscode-whats-new", "ui", "main.css"));
        const cssUri = cssPathOnDisk.with({ scheme: "vscode-resource" });
        // Local path to main script run in the webview
        const logoPathOnDisk = vscode.Uri.file(path.join(this.context.extensionPath, "images", `vscode-${this.extensionName.toLowerCase()}-logo-readme.png`));
        const logoUri = logoPathOnDisk.with({ scheme: "vscode-resource" });
        panel.webview.html = this.getWebviewContentLocal(pageUri.fsPath, cssUri.toString(), logoUri.toString());
    }
    showPageIfVersionDiffers(currentVersion, previousVersion) {
        if (previousVersion) {
            const differs = semver.diff(currentVersion, previousVersion);
            // only "patch" should be suppressed
            //if (!differs || differs === "patch") {
            //    return;
            //}
        }
        // "major", "minor"
        this.context.globalState.update(this.versionKey, currentVersion);
        //
        if (this.isRunningOnCodespaces()) {
            return;
        }
        this.showPage();
    }
    getWebviewContentLocal(htmlFile, cssUrl, logoUrl) {
        var _a, _b;
        return PageBuilder_1.WhatsNewPageBuilder.newBuilder(htmlFile)
            .updateExtensionPublisher(this.publisher)
            .updateExtensionDisplayName(this.extension.packageJSON.displayName)
            .updateExtensionName(this.extensionName)
            .updateExtensionVersion(this.extension.packageJSON.version)
            .updateRepositoryUrl(this.extension.packageJSON.repository.url.slice(0, this.extension.packageJSON.repository.url.length - 4))
            .updateRepositoryIssues(this.extension.packageJSON.bugs.url)
            .updateRepositoryHomepage(this.extension.packageJSON.homepage)
            .updateCSS(cssUrl)
            .updateHeader(this.contentProvider.provideHeader(logoUrl))
            .updateChangeLog(this.contentProvider.provideChangeLog())
            .updateSponsors((_a = this.sponsorProvider) === null || _a === void 0 ? void 0 : _a.provideSponsors())
            .updateSupportChannels(this.contentProvider.provideSupportChannels())
            .updateSocialMedias((_b = this.socialMediaProvider) === null || _b === void 0 ? void 0 : _b.provideSocialMedias())
            .build();
    }
}
exports.WhatsNewManager = WhatsNewManager;
//# sourceMappingURL=Manager.js.map