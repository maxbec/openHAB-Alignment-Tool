import Thing = require("./thing");

class Bridge {
	public line: number;
	public leadingWhiteSpace: number;

	binding_id: string;
	type_id: string;
	thing_id: string;
	label: string;
	location: string;
	parameters: string;
	comment: string;

	things: Array<Thing>;

	/**
	 *
	 * Example for a thing definition
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
	constructor(line: number, leadingWhiteSpace: number, binding_id: string, type_id: string, thing_id: string, label: string, location: string, parameters: string, things: Array<Thing>, comment?: string) {
		this.line = line;
		this.leadingWhiteSpace = leadingWhiteSpace;
		this.binding_id = binding_id;
		this.type_id = type_id;
		this.thing_id = thing_id;
		this.label = label;
		this.location = location;
		this.parameters = parameters;
		this.things = things;
		this.comment = comment ? comment : "";
	}
}

export = Bridge;
