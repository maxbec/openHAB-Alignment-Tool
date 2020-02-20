class Item {
	public line: number;
	public leadingWhiteSpace: number;

	type: string;
	name: string;
	label: string;
	icon: string;
	group: string;
	tag: string;
	channel: string;
	comment: string;

	constructor(line: number, leadingWhiteSpace: number, type: string, name: string, label: string, icon: string, group: string, tag: string, channel: string, comment?: string) {
		this.line = line;
		this.leadingWhiteSpace = leadingWhiteSpace;
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
