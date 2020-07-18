import * as vscode from "vscode";
class Thing {
	public range: vscode.Range;
	public leadingWhiteSpace: number;

	thing_type: string;
	binding_id: string;
	type_id: string;
	thing_id: string;
	label: string;
	location: string;
	parameters: string;
	comment: string;

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
	constructor(range: vscode.Range, leadingWhiteSpace: number, thing_type: string, binding_id: string, type_id: string, thing_id: string, label: string, location: string, parameters: string, comment?: string) {
		this.range = range;
		this.leadingWhiteSpace = leadingWhiteSpace;
		this.thing_type = thing_type;
		this.binding_id = binding_id;
		this.type_id = type_id;
		this.thing_id = thing_id;
		this.label = label;
		this.location = location;
		this.parameters = parameters;
		this.comment = comment ? comment : "";
	}
}

export = Thing;
