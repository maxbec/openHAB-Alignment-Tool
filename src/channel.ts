class Channel {
	public line: number;
	public leadingWhiteSpace: number;

	keyword_id: string;
	type_id: string;
	channel_id: string;
	label: string;
	parameters: string;
	comment: string;

	/**
	 *
	 * Example for a Channel definition
	 * Thing <binding_id>:<type_id>:<thing_id> "Label" @ "Location" [ <parameters> ]
	 *
	 * @param line
	 * @param leadingWhiteSpace
	 * @param type
	 * @param name
	 * @param label
	 * @param icon
	 * @param group
	 * @param tag
	 * @param channel
	 * @param comment
	 */
	constructor(line: number, leadingWhiteSpace: number, keyword_id: string, type_id: string, channel_id: string, label: string, parameters: string, comment?: string) {
		this.line = line;
		this.leadingWhiteSpace = leadingWhiteSpace;
		this.keyword_id = keyword_id;
		this.type_id = type_id;
		this.channel_id = channel_id;
		this.label = label;
		this.parameters = parameters;
		this.comment = comment ? comment : "";
	}
}

export = Channel;
