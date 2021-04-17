/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Alessandro Fragnani. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// tslint:disable-next-line:max-line-length
import { ChangeLogItem, ChangeLogKind, ContentProvider, Header, Image, Sponsor, IssueKind, SupportChannel, SocialMediaProvider, SponsorProvider } from "../vscode-whats-new/src/ContentProvider";

export class BookmarksContentProvider implements ContentProvider {
	public provideHeader(logoUrl: string): Header {
		return <Header>{
			logo: <Image>{ src: logoUrl, height: 50, width: 40 },
			message: `<b>openHAB Alignment Tool</b> This extension adds support for formatting and indenting <a href="http://www.openhab.org)">openHAB</a>
			files like <code>*.items</code>, <code>*.sitemap</code>, etc. At the moment only
			<code>*.items</code> and <code>*.sitemap</code> files are supported. They can be formatted in a column channel-column
			or multiline style. In the future the other file types and other format-types will be added.
			Feel free to add feature-requests on the github repository.`,
		};
	}

	public provideChangeLog(): ChangeLogItem[] {
		const changeLog: ChangeLogItem[] = [];

		changeLog.push({ kind: ChangeLogKind.VERSION, detail: { releaseNumber: "2.1.0", releaseDate: "April 2021" } });
		changeLog.push({
			kind: ChangeLogKind.FIXED,
			detail: {
				message: "Square brackets in bindingconfig ruin ChannelColumn style",
				id: 44,
				kind: IssueKind.Issue,
			},
		});
		changeLog.push({
			kind: ChangeLogKind.FIXED,
			detail: {
				message: "URL gets manipulated.",
				id: 51,
				kind: IssueKind.Issue,
			},
		});
		changeLog.push({
			kind: ChangeLogKind.FIXED,
			detail: {
				message: "Group state aggregation gets messed up by formatting",
				id: 53,
				kind: IssueKind.Issue,
			},
		});

		changeLog.push({ kind: ChangeLogKind.VERSION, detail: { releaseNumber: "2.0.8", releaseDate: "July 2020" } });
		changeLog.push({
			kind: ChangeLogKind.FIXED,
			detail: "Fixed a lot of bugs regarding special formatting features for the *.items files."
		});
		changeLog.push({
			kind: ChangeLogKind.CHANGED,
			detail: "Implemented the Visual-Studio-Code formatter API. The extension is now a proper formatting tool and can use all the formatting functions integrated in the standard vsc installation (Like format-on-save, etc.).",
		});

		return changeLog;
	}

	public provideSupportChannels(): SupportChannel[] {
		const supportChannels: SupportChannel[] = [];
		supportChannels.push({
			title: "Get me a coffee on Ko-Fi",
			link: "https://ko-fi.com/C0C01XTXB",
			message: "Buy me a coffe :)",
		});
		supportChannels.push({
			title: "Donate via PayPal",
			link: "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=58GE7PE2EAQAY&source=url",
			message: "Donate via PayPal",
		});
		return supportChannels;
	}
}

export class BookmarksSponsorProvider implements SponsorProvider {
	public provideSponsors(): Sponsor[] {
		const sponsors: Sponsor[] = [];
		// const sponsorCodeStream: Sponsor = <Sponsor>{
		// 	title: "Learn more about Codestream",
		// 	link: "https://sponsorlink.codestream.com/?utm_source=vscmarket&utm_campaign=bookmarks&utm_medium=banner",
		// 	image: {
		// 		dark: "https://alt-images.codestream.com/codestream_logo_bookmarks.png",
		// 		light: "https://alt-images.codestream.com/codestream_logo_bookmarks.png",
		// 	},
		// 	width: 52,
		// 	// message: `<p>Eliminate context switching and costly distractions.
		// 	//     Create and merge PRs and perform code reviews from inside your
		// 	//     IDE while using jump-to-definition, your keybindings, and other IDE favorites.</p>`,
		// 	// extra:
		// 	//     `<a title="Learn more about CodeStream" href="https://sponsorlink.codestream.com/?utm_source=vscmarket&utm_campaign=bookmarks&utm_medium=banner">
		// 	//     Learn more</a>`
		// };
		// sponsors.push(sponsorCodeStream);
		// const sponsorTabnine: Sponsor = <Sponsor>{
		// 	title: "Learn more about Tabnine",
		// 	link: "http://wd5a.2.vu/Bookmarks",
		// 	image: {
		// 		dark: "https://github.com/alefragnani/oss-resources/raw/master/images/sponsors/tabnine-hi-res.png",
		// 		light: "https://github.com/alefragnani/oss-resources/raw/master/images/sponsors/tabnine-hi-res.png",
		// 	},
		// 	width: 40,
		// 	// message: `<p>Improve your Bookmarks experience with Tabnine code
		// 	//     completions! Tabnine is a free powerful Artificial Intelligence
		// 	//     assistant designed to help you code faster, reduce mistakes,
		// 	//     and discover best coding practices - without ever leaving the
		// 	//     comfort of VSCode.</p>`,
		// 	// extra:
		// 	//     `<a title="Learn more about Tabnine" href="https://www.tabnine.com">
		// 	//     Get it now</a>`
		// };
		// sponsors.push(sponsorTabnine);
		return sponsors;
	}
}

export class BookmarksSocialMediaProvider implements SocialMediaProvider {
	public provideSocialMedias() {
		return [
			{
				title: "Follow me on GitHub",
				link: "https://github.com/MaxBec",
			},
		];
	}
}
