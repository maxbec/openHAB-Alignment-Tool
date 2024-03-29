/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Alessandro Fragnani. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import path = require("path");
import * as semver from "semver";
import * as vscode from "vscode";
import { ContentProvider, SocialMediaProvider, SponsorProvider } from "./ContentProvider";
import { WhatsNewPageBuilder } from "./PageBuilder";

export class WhatsNewManager {
	private publisher!: string;
	private extensionName!: string;
	private context: vscode.ExtensionContext;
	private contentProvider!: ContentProvider;
	private socialMediaProvider!: SocialMediaProvider | undefined;
	private sponsorProvider: SponsorProvider | undefined;

	private extension!: vscode.Extension<any>;
	private versionKey!: string;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	private isRunningOnCodespaces(): boolean {
		return vscode.env.remoteName?.toLocaleLowerCase() === "codespaces";
	}

	public registerContentProvider(publisher: string, extensionName: string, contentProvider: ContentProvider): WhatsNewManager {
		this.publisher = publisher;
		this.extensionName = extensionName;
		this.contentProvider = contentProvider;
		this.versionKey = `${this.extensionName}.version`;

		this.context.globalState.setKeysForSync([this.versionKey]);

		return this;
	}

	public registerSocialMediaProvider(socialMediaProvider: SocialMediaProvider): WhatsNewManager {
		this.socialMediaProvider = socialMediaProvider;
		return this;
	}

	public registerSponsorProvider(sponsorProvider: SponsorProvider): WhatsNewManager {
		this.sponsorProvider = sponsorProvider;
		return this;
	}

	public showPageInActivation() {
		// load data from extension manifest
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		this.extension = vscode.extensions.getExtension(`${this.publisher}.${this.extensionName}`)!;

		const previousExtensionVersion = this.context.globalState.get<string>(this.versionKey);

		this.showPageIfVersionDiffers(this.extension.packageJSON.version, previousExtensionVersion);
	}

	public showPage() {
		// Create and show panel
		const panel = vscode.window.createWebviewPanel(`${this.extensionName}.whatsNew`, `What's New in ${this.extension.packageJSON.displayName}`, vscode.ViewColumn.One, { enableScripts: true });

		// Get path to resource on disk
		const onDiskPath = vscode.Uri.file(path.join(this.context.extensionPath, "/src/vscode-whats-new", "ui", "whats-new.html"));
		const pageUri = onDiskPath.with({ scheme: "vscode-resource" });

		// Local path to main script run in the webview
		const cssPathOnDisk = vscode.Uri.file(path.join(this.context.extensionPath, "/src/vscode-whats-new", "ui", "main.css"));
		const cssUri = cssPathOnDisk.with({ scheme: "vscode-resource" });

		// Local path to main script run in the webview
		const logoPathOnDisk = vscode.Uri.file(path.join(this.context.extensionPath, "/images", `vscode-${this.extensionName.toLowerCase()}-logo-readme.png`));
		const logoUri = logoPathOnDisk.with({ scheme: "vscode-resource" });

		panel.webview.html = this.getWebviewContentLocal(pageUri.fsPath, cssUri.toString(), logoUri.toString());
	}

	public showPageIfVersionDiffers(currentVersion: string, previousVersion: string | undefined) {
		if (previousVersion) {
			const differs: semver.ReleaseType | null = semver.diff(currentVersion, previousVersion);

			// only "patch" should be suppressed
			if (!differs || differs === "patch") {
				return;
			}
		}

		// "major", "minor"
		this.context.globalState.update(this.versionKey, currentVersion);

		//
		if (this.isRunningOnCodespaces()) {
			return;
		}

		this.showPage();
	}

	private getWebviewContentLocal(htmlFile: string, cssUrl: string, logoUrl: string): string {
		return WhatsNewPageBuilder.newBuilder(htmlFile)
			.updateExtensionPublisher(this.publisher)
			.updateExtensionDisplayName(this.extension.packageJSON.displayName)
			.updateExtensionName(this.extensionName)
			.updateExtensionVersion(this.extension.packageJSON.version)
			.updateRepositoryUrl(this.extension.packageJSON.repository.url)
			.updateRepositoryIssues(this.extension.packageJSON.bugs.url)
			.updateRepositoryHomepage(this.extension.packageJSON.homepage)
			.updateCSS(cssUrl)
			.updateHeader(this.contentProvider.provideHeader(logoUrl))
			.updateChangeLog(this.contentProvider.provideChangeLog())
			.updateSponsors(this.sponsorProvider?.provideSponsors())
			.updateSupportChannels(this.contentProvider.provideSupportChannels())
			.updateSocialMedias(this.socialMediaProvider?.provideSocialMedias())
			.build();
	}
}
