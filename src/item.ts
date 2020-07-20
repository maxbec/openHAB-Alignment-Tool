import * as vscode from "vscode";

class Item {
	public range: vscode.Range;
	public leadingWhiteSpace: number;
	public formatOption: string;
	public highestLengths: number[];

	type: string;
	name: string;
	label: string;
	icon: string;
	group: string;
	tag: string;
	channel: string;
	comment: string;

	constructor(range: vscode.Range, leadingWhiteSpace: number, formatOption: string, highestLengths: number[], type: string, name: string, label: string, icon: string, group: string, tag: string, channel: string, comment?: string) {
		this.range = range;
		this.leadingWhiteSpace = leadingWhiteSpace;
		this.formatOption = formatOption;
		this.highestLengths = highestLengths;
		this.type = type;
		this.name = name;
		this.label = label.replace(/\"\s*/, '"').replace(/\s*\"/, '"');
		this.icon = icon.replace(/\<\s*/, "<").replace(/\s*\>/, ">");
		this.group = group.replace(/\(\s*/, "(").replace(/\s*\)/, ")");
		this.tag = tag;
		this.channel = channel.replace(/\{\s*/, "{").replace(/\s*\}/, "}");
		this.comment = comment ? comment : "";
	}
}

export = Item;
