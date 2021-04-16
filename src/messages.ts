"use strict";
import { ConfigurationTarget, env, MessageItem, Uri, window } from "vscode";

export enum SuppressedMessages {
	CommitHasNoPreviousCommitWarning = "suppressCommitHasNoPreviousCommitWarning",
	CommitNotFoundWarning = "suppressCommitNotFoundWarning",
	CreatePullRequestPrompt = "suppressCreatePullRequestPrompt",
	FileNotUnderSourceControlWarning = "suppressFileNotUnderSourceControlWarning",
	GitDisabledWarning = "suppressGitDisabledWarning",
	GitMissingWarning = "suppressGitMissingWarning",
	GitVersionWarning = "suppressGitVersionWarning",
	IncorrectWorkspaceCasingWarning = "suppressImproperWorkspaceCasingWarning",
	LineUncommittedWarning = "suppressLineUncommittedWarning",
	NoRepositoryWarning = "suppressNoRepositoryWarning",
	RebaseSwitchToTextWarning = "suppressRebaseSwitchToTextWarning",
}

export class Messages {

	static async showGenericErrorMessage(message: string): Promise<MessageItem | undefined> {
		const actions: MessageItem[] = [{ title: "Open Output Channel" }];
		const result = await Messages.showMessage("error", `${message}. See output channel for more details`, undefined, null, ...actions);

		// if (result !== undefined) {
		// 	Logger.showOutputChannel();
		// }
		return result;
	}

	static async showWhatsNewMessage(version: string) {
		const actions: MessageItem[] = [{ title: "What's New" }, { title: "❤ Sponsor" }];

		const result = await Messages.showMessage("info", `GitLens has been updated to v${version} — check out what's new!`, undefined, null, ...actions);

		if (result != null) {
			if (result === actions[0]) {
				await env.openExternal(Uri.parse("https://gitlens.amod.io/#whats-new"));
			} else if (result === actions[1]) {
				await env.openExternal(Uri.parse("https://gitlens.amod.io/#sponsor"));
			}
		}
	}

	private static async showMessage(type: "info" | "warn" | "error", message: string, suppressionKey?: SuppressedMessages, dontShowAgain: MessageItem | null = { title: "Don't Show Again" }, ...actions: MessageItem[]): Promise<MessageItem | undefined> {
		//Logger.log(`ShowMessage(${type}, '${message}', ${suppressionKey}, ${JSON.stringify(dontShowAgain)})`);

		// if (suppressionKey !== undefined && configuration.get("advanced", "messages", suppressionKey)) {
		// 	Logger.log(`ShowMessage(${type}, '${message}', ${suppressionKey}, ${JSON.stringify(dontShowAgain)}) skipped`);
		// 	return undefined;
		// }

		if (suppressionKey !== undefined && dontShowAgain !== null) {
			actions.push(dontShowAgain);
		}

		let result: MessageItem | undefined = undefined;
		switch (type) {
			case "info":
				result = await window.showInformationMessage(message, ...actions);
				break;

			case "warn":
				result = await window.showWarningMessage(message, ...actions);
				break;

			case "error":
				result = await window.showErrorMessage(message, ...actions);
				break;
		}

		// if ((suppressionKey !== undefined && dontShowAgain === null) || result === dontShowAgain) {
		// 	Logger.log(`ShowMessage(${type}, '${message}', ${suppressionKey}, ${JSON.stringify(dontShowAgain)}) don't show again requested`);
		// 	await this.suppressedMessage(suppressionKey!);

		// 	if (result === dontShowAgain) return undefined;
		// }

		// Logger.log(`ShowMessage(${type}, '${message}', ${suppressionKey}, ${JSON.stringify(dontShowAgain)}) returned ${result != null ? result.title : result}`);
		return result;
	}
}
