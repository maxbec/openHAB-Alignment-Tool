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
		this.label = label;
		this.icon = icon;
		this.group = group;
		this.tag = tag;
		this.channel = channel;
		this.comment = comment ? comment : "";
	}
}

export = Item;
