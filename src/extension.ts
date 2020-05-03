/***********************************************************************************************************
 *
 *   ____  _    _            _ _                                  _     _______          _
 *  / __ \| |  | |     /\   | (_)                                | |   |__   __|        | |
 * | |  | | |__| |    /  \  | |_  __ _ _ __  _ __ ___   ___ _ __ | |_     | | ___   ___ | |
 * | |  | |  __  |   / /\ \ | | |/ _` | '_ \| '_ ` _ \ / _ \ '_ \| __|    | |/ _ \ / _ \| |
 * | |__| | |  | |  / ____ \| | | (_| | | | | | | | | |  __/ | | | |_     | | (_) | (_) | |
 *  \____/|_|  |_| /_/    \_\_|_|\__, |_| |_|_| |_| |_|\___|_| |_|\__|    |_|\___/ \___/|_|
 *                                __/ |
 *                               |___/
 *
 * @todo Complete Header description and tags.
 * @author Max Beckenbauer
 *
 * Credits to Mark Hilbush and his openHAB Formatter extension.
 *
 **********************************************************************************************************/

/**----------------------------------------------------------------------------------------------------------
 * HEADER SECTION
 *---------------------------------------------------------------------------------------------------------*/
import * as vscode from "vscode";

import Item = require("./item");
import Bridge = require("./bridge");
import Thing = require("./thing");
import Channel = require("./channel");

import { type } from "os";

// Regex patterns to match comment sections
const REGEX_COMMENT = /^\s*\/\/.*$/;
const REGEX_START_BLOCKCOMMENT = /^\s*\/\*.*$/;
const REGEX_END_BLOCKCOMMENT = /^.*\s*\*\/$/;
const REGEX_EOL_COMMENT = /\/\/.*/;

// Regex patterns to match parts of item definition
const REGEX_ITEM_TYPE = /(Color|Contact|DateTime|Dimmer|Group|Image|Location|Number|Player|Rollershutter|String|Switch)(:\w+)?(:\w+)?(\(\w+,\s*\w+\))?(\(".*"\))?/;
const REGEX_ITEM_NAME = /[a-zA-Z0-9äöüÄÖÜ][a-zA-Z0-9äöüÄÖÜ_]*/;
const REGEX_ITEM_LABEL = /\".+?\"/;
const REGEX_ITEM_ICON = /<.+?>/;
const REGEX_ITEM_GROUP = /\(.+?\)/;
const REGEX_ITEM_TAG = /\[\s*(\".+?\")\s*(,\s*\".+?\"\s*)*\]/;
const REGEX_ITEM_CHANNEL = /\{.+?\}/;

const REGEX_SITEMAP_ELEMENTS = /\b(Frame|Default|Text|Group|Switch|Selection|Setpoint|Slider|Colorpicker|Webview|Mapview|Image|Video|Chart)\b/g;

const REGEX_THING_TYPE = /^Bridge|Thing/g;
const REGEX_THING_ID = /\w*:\w*:\w*/;
const REGEX_THING_LABEL = /\".+?\"/;
const REGEX_THING_LOCATION = /\".+?\"/;
const REGEX_THING_PARAMETERS = /\[.*\]/;

// Default item values
const DEF_ITEM_TYPE = "Type";
const DEF_ITEM_NAME = "Name";
const DEF_ITEM_LABEL = '"Label [%s]"';
const DEF_ITEM_ICON = "<icon>";
const DEF_ITEM_GROUP = "(group)";
const DEF_ITEM_TAG = '["tag"]';
const DEF_ITEM_CHANNEL = '{ channel="" }\n';

// Section lengths for items
export let highestTypeLength = 0;
export let highestNameLength = 0;
export let highestLabelLength = 0;
export let highestIconLength = 0;
export let highestGroupLength = 0;
export let highestTagLength = 0;
export let highestChannelLength = 0;
// Section lengths for things
export let highestThingTypeLength = 6;
export let highestThingIdLength = 0;
export let hightesThingLabelLength = 0;
export let highestThingLocationLength = 0;
export let highestThingParametersLength = 0;

// Comment Checker
let isInBlockComment = false;

// Text and Workspace Edits for the "Prepare and Clean" and "Edit" procedures
export let clearTextEdits: vscode.TextEdit[] = [];
export let textTextEdits: vscode.TextEdit[] = [];
export let clearWorkEdit = new vscode.WorkspaceEdit();
export let textWorkEdit = new vscode.WorkspaceEdit();

/**----------------------------------------------------------------------------------------------------------
 * COMMAND SECTION
 *---------------------------------------------------------------------------------------------------------*/
/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 *
 * @param context
 */
export function activate(context: vscode.ExtensionContext) {
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "OpenHAB Alignment Tool" is now active!');
	// Insert a generic item
	vscode.commands.registerCommand("extension.insert-item-generic", () => {
		commandInsertNewGenericItem();
	});
	// Insert a Switch item
	vscode.commands.registerCommand("extension.insert-item-switch", () => {
		commandInsertNewSwitchItem();
	});
	// Insert a Dimmer item
	vscode.commands.registerCommand("extension.insert-item-dimmer", () => {
		commandInsertNewDimmerItem();
	});
	// Insert a String item
	vscode.commands.registerCommand("extension.insert-item-string", () => {
		commandInsertNewStringItem();
	});
	// Insert a Number item
	vscode.commands.registerCommand("extension.insert-item-number", () => {
		commandInsertNewNumberItem();
	});
	// Insert a DateTime item
	vscode.commands.registerCommand("extension.insert-item-datetime", () => {
		commandInsertNewDateTimeItem();
	});
	// Reformat all items in the file
	vscode.commands.registerCommand("extension.reformat-file", () => {
		commandReformatFile();
	});
	// Reformat all items in the file
	vscode.commands.registerCommand("extension.reformat-selection", () => {
		commandReformatSelection();
	});
}

/**
 * Insert new generic item at present cursor line
 */
function commandInsertNewGenericItem(): void {
	insertItem(DEF_ITEM_TYPE, DEF_ITEM_NAME, DEF_ITEM_LABEL, DEF_ITEM_ICON, DEF_ITEM_GROUP, DEF_ITEM_TAG, DEF_ITEM_CHANNEL);
}

/**
 * Insert new switch item at present cursor line
 */
function commandInsertNewSwitchItem(): void {
	insertItem("Switch", "_Switch", '"Label [%s]"', "<switch>", DEF_ITEM_GROUP, '["Switch"]', DEF_ITEM_CHANNEL);
}

/**
 * Insert new dimmer item at present cursor line
 */
function commandInsertNewDimmerItem(): void {
	insertItem("Dimmer", "_Dimmer", '"Label [%s]"', "<dimmer>", DEF_ITEM_GROUP, '["Dimmer"]', DEF_ITEM_CHANNEL);
}

/**
 * Insert new string item at present cursor line
 */
function commandInsertNewStringItem(): void {
	insertItem("String", DEF_ITEM_NAME, '"Label [%s]"', "<text>", DEF_ITEM_GROUP, DEF_ITEM_TAG, DEF_ITEM_CHANNEL);
}

/**
 * Insert new number item at present cursor line
 */
function commandInsertNewNumberItem(): void {
	insertItem("Number", DEF_ITEM_NAME, '"Label [%.0f]"', "<none>", DEF_ITEM_GROUP, DEF_ITEM_TAG, DEF_ITEM_CHANNEL);
}

/**
 * Insert new datetime item at present cursor line
 */
function commandInsertNewDateTimeItem(): void {
	insertItem("DateTime", DEF_ITEM_NAME, '"Label [%1$tA, %1$tm/%1$td/%1$tY %1$tl:%1$tM %1$tp]"', "<time>", DEF_ITEM_GROUP, DEF_ITEM_TAG, DEF_ITEM_CHANNEL);
}

/**
 * Reformat the current file with the style selected in the settings.
 */
async function commandReformatFile() {
	// Only execute if there's an active text editor
	if (!vscode.window.activeTextEditor) {
		return;
	}

	// Define the basic vscode variables
	let doc = vscode.window.activeTextEditor.document;

	// Clear all text and workspace edit arrays
	clearTextEdits = [];
	textTextEdits = [];
	clearWorkEdit = new vscode.WorkspaceEdit();
	textWorkEdit = new vscode.WorkspaceEdit();

	// Reset maximum item part length values
	highestTypeLength = 0;
	highestNameLength = 0;
	highestLabelLength = 0;
	highestIconLength = 0;
	highestGroupLength = 0;
	highestTagLength = 0;
	highestChannelLength = 0;

	// Check the file type, clean the file and format it
	if (vscode.window.activeTextEditor.document.fileName.includes(".sitemap")) {
		await cleanSitemapFile();
		await formatSitemapFile();
	} else if (vscode.window.activeTextEditor.document.fileName.includes(".item")) {
		await cleanItemFile();
		await formatItemFile();
	} else if (vscode.window.activeTextEditor.document.fileName.includes(".thing")) {
		await cleanThingFile();
		await formatThingFile();
	} else {
		return;
	}

	// Trim the generated whitespace at the end of a line
	vscode.commands.executeCommand("editor.action.trimTrailingWhitespace");
}

/**
 * Reformat the current selection with the style selected in the settings.
 */
async function commandReformatSelection() {
	// Only execute if there's an active text editor
	if (!vscode.window.activeTextEditor) {
		return;
	}

	// Define the basic vscode variables
	let doc = vscode.window.activeTextEditor.document;

	// Clear all text and workspace edit arrays
	clearTextEdits = [];
	textTextEdits = [];
	clearWorkEdit = new vscode.WorkspaceEdit();
	textWorkEdit = new vscode.WorkspaceEdit();

	// Reset maximum item part length values
	highestTypeLength = 0;
	highestNameLength = 0;
	highestLabelLength = 0;
	highestIconLength = 0;
	highestGroupLength = 0;
	highestTagLength = 0;
	highestChannelLength = 0;

	// Clean the file and prepare it for formatting
	await cleanItemFile();

	// Format the file
	await formatItemFile();

	// Trim the generated whitespace at the end of a line
	vscode.commands.executeCommand("editor.action.trimTrailingWhitespace");
}

/**----------------------------------------------------------------------------------------------------------
 * HELPER FUNCTIONS SECTION
 *---------------------------------------------------------------------------------------------------------*/
/**
 * Insert a new item whose parts are defined by the passed arguments
 *
 * @param type
 * @param name
 * @param label
 * @param icon
 * @param group
 * @param tag
 * @param channel
 */
function insertItem(type: string, name: string, label: string, icon: string, group: string, tag: string, channel: string): void {
	// Only execute if there's an active text editor
	if (!vscode.window.activeTextEditor) {
		return;
	}
	// Go to beginning of the line, then get an empty range
	let editor = vscode.window.activeTextEditor;
	let newPos = new vscode.Position(editor.selection.active.line, 0);
	editor.selection = new vscode.Selection(newPos, newPos);
	let range = new vscode.Range(newPos, newPos.with(newPos.line, 0));

	let item = new Item(editor.selection.active.line, 0, type, name, label, icon, group, tag, channel);
	let formattedItem = formatItem(item);

	let selection = range;
	editor.edit(builder => {
		builder.replace(selection, formattedItem);
	});
	editor.selection = new vscode.Selection(newPos, newPos);
}

/**
 * Clean file and prepare it for formatting.
 * Cleans all unnecessary lines, tabs, spaces, etc.
 */
async function cleanSitemapFile() {
	// Get the section lengths of each line with an item in it.
	// Only execute if there's an active text editor
	if (!vscode.window.activeTextEditor) {
		return;
	}

	// Define the basic vscode variables
	let doc = vscode.window.activeTextEditor.document;

	// Reset the comment tracker
	isInBlockComment = false;

	var wholeDoc = doc.getText();
	// Clean all new lines and tabs
	wholeDoc = wholeDoc.replace(/\n|\t/g, " ");
	// Clean more than two spaces
	wholeDoc = wholeDoc.replace(/ {2,}/g, " ");
	// Clean more than two spaces
	wholeDoc = wholeDoc.replace(/}/g, "\n}");
	// Insert new line before new element
	wholeDoc = wholeDoc.replace(REGEX_SITEMAP_ELEMENTS, "\n$&");
	// Insert new line before new element
	wholeDoc = wholeDoc.replace(/\/\//g, "\n$&");

	let selection = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(doc.lineCount - 1, doc.lineAt(doc.lineCount - 1).text.length));
	clearTextEdits.push(vscode.TextEdit.replace(selection, wholeDoc));

	// Apply all clean edits
	clearWorkEdit.set(doc.uri, clearTextEdits);
	await vscode.workspace.applyEdit(clearWorkEdit);
}

/**
 * Format the whole file after cleaning and preparing it.
 */
async function formatSitemapFile() {
	// Get the section lengths of each line with an item in it.
	// Only execute if there's an active text editor
	if (!vscode.window.activeTextEditor) {
		return;
	}

	// Define the basic vscode variables
	let doc = vscode.window.activeTextEditor.document;
	let editor = vscode.window.activeTextEditor;
	let currentPos = editor.selection.active;
	let newPos: vscode.Position;
	let indentCounter = 0;

	// Reset the comment-tracker
	isInBlockComment = false;

	// Clear the file in case of line-by-line item definitions
	for (let index = 0; index < doc.lineCount; index++) {
		// Get Position at the beginning of the current line and start a selection
		newPos = currentPos.with(index, 0);
		editor.selection = new vscode.Selection(newPos, newPos);

		// Get Text of current line and check if there is a comment in it
		let lineText = doc.lineAt(newPos.line).text;
		let indentTabs = "";

		if (lineText.includes("}")) {
			indentCounter--;
		}

		for (let index = 0; index < indentCounter; index++) {
			indentTabs = indentTabs + "\t";
		}

		lineText = indentTabs + lineText;

		// If line is empty or contains a comment continue to the next line
		if (lineText.includes("{")) {
			indentCounter++;
		}

		let selection = new vscode.Range(newPos, newPos.with(newPos.line, doc.lineAt(newPos.line).text.length));
		textTextEdits.push(vscode.TextEdit.replace(selection, lineText));
	}

	// Apply all    clean and formatting Edits
	textWorkEdit.set(doc.uri, textTextEdits);
	await vscode.workspace.applyEdit(textWorkEdit);
}

/**
 * Clean file and prepare it for formatting.
 * Cleans all unnecessary lines, tabs, spaces, etc.
 */
async function cleanItemFile() {
	// Only execute if there's an active text editor
	if (!vscode.window.activeTextEditor) {
		return;
	}

	// Define the basic vscode variables
	let doc = vscode.window.activeTextEditor.document;
	let editor = vscode.window.activeTextEditor;
	let currentPos = editor.selection.active;
	let newPos: vscode.Position;
	let newLineCounter = 0;

	// Reset the comment-tracker
	isInBlockComment = false;

	// Clear the file in case of line-by-line item definitions
	for (let index = 0; index < doc.lineCount; index++) {
		// Get Position at the beginning of the current line and start a selection
		newPos = currentPos.with(index, 0);
		editor.selection = new vscode.Selection(newPos, newPos);

		// Get Text of current line and check if there is a comment in it
		let lineText = doc.lineAt(newPos.line);
		var comment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_COMMENT);
		var blockComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_START_BLOCKCOMMENT);
		var endBlockComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_END_BLOCKCOMMENT);

		// If line is empty or contains a comment continue to the next line
		if (lineText.text.length === 0 || lineText.isEmptyOrWhitespace) {
			newLineCounter++;
			continue;
		} else if (comment) {
			newLineCounter = 0;
			continue;
		} else if (blockComment && endBlockComment) {
			isInBlockComment = false;
			newLineCounter = 0;
			continue;
		} else if (blockComment) {
			isInBlockComment = true;
			newLineCounter = 0;
			continue;
		} else if (endBlockComment) {
			isInBlockComment = false;
			newLineCounter = 0;
			continue;
		} else if (isInBlockComment) {
			newLineCounter = 0;
			continue;
		}

		// Discover item Type
		var wordRange = doc.getWordRangeAtPosition(newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos)), REGEX_ITEM_TYPE);

		// Check if there is an item type at the beginning of each line
		if (wordRange && wordRange.isSingleLine) {
			// Clear all free lines before an item definition
			if (newLineCounter !== 0) {
				let newRange = new vscode.Range(newPos.line - newLineCounter, doc.lineAt(newPos.line - newLineCounter).text.length, newPos.line, 0);
				clearTextEdits.push(vscode.TextEdit.delete(newRange));
			}

			// Reset new Line counter
			newLineCounter = 0;
			continue;
		} else {
			if (newPos.line > 0) {
				// Select the \n mark at the end of the line => Delete all new lines in item definitions
				let newRange = new vscode.Range(newPos.line - 1, doc.lineAt(newPos.line - 1).text.length, newPos.line, 0);
				clearTextEdits.push(vscode.TextEdit.delete(newRange));

				// Reset new Line counter
				newLineCounter = 0;
			}
		}
	}

	// Apply all clean edits
	clearWorkEdit.set(doc.uri, clearTextEdits);
	await vscode.workspace.applyEdit(clearWorkEdit);
}

/**
 * Format the whole file after cleaning and preparing it.
 */
async function formatItemFile() {
	// Get the section lengths of each line with an item in it.
	// Only execute if there's an active text editor
	if (!vscode.window.activeTextEditor) {
		return;
	}

	// Define the basic vscode variables
	let doc = vscode.window.activeTextEditor.document;
	let editor = vscode.window.activeTextEditor;
	let currentPos = editor.selection.active;
	let newPos: vscode.Position;
	let itemArray: Array<Item>;
	itemArray = new Array();

	// Get the format configuration settings
	let config = vscode.workspace.getConfiguration("oh-alignment-tool");
	let preserveWhitespace = config.preserveWhitespace;

	// Reset the comment tracker
	isInBlockComment = false;

	// Clear the file in case of line-by-line item definitions
	for (let index = 0; index < doc.lineCount; index++) {
		// Get Position at the beginning of the current line and start a selection
		newPos = currentPos.with(index, 0);
		editor.selection = new vscode.Selection(newPos, newPos);

		// Get Text of current line and check if there is a comment in it
		let lineText = doc.lineAt(newPos.line);
		var comment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_COMMENT);
		var blockComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_START_BLOCKCOMMENT);
		var endBlockComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_END_BLOCKCOMMENT);

		// If line is empty or contains a comment continue to the next line
		if (lineText.text.length === 0 || lineText.isEmptyOrWhitespace) {
			continue;
		} else if (comment) {
			continue;
		} else if (blockComment && endBlockComment) {
			isInBlockComment = false;
			continue;
		} else if (blockComment) {
			isInBlockComment = true;
			continue;
		} else if (endBlockComment) {
			isInBlockComment = false;
			continue;
		} else if (isInBlockComment) {
			continue;
		}

		// Default these to empty. They will be changed
		// if they exist in the item definition
		let itemType = "";
		let itemName = "";
		let itemLabel = "";
		let itemIcon = "";
		let itemGroup = "";
		let itemTag = "";
		let itemChannel = "";
		let itemComment = "";

		// Check if there is leading Whitespace. If Yes add one in size of a tab.
		let leadingWhiteSpace = lineText.firstNonWhitespaceCharacterIndex;

		if (preserveWhitespace === false) {
			leadingWhiteSpace = 0;
		}

		// Discover item Type
		// Count Whitespace or tabs at the begin of the line
		newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
		var wordRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_TYPE);
		if (wordRange && wordRange.isSingleLine) {
			itemType = doc.getText(wordRange);
			highestTypeLength = itemType.length > highestTypeLength ? itemType.length : highestTypeLength;
			newPos = newPos.with(newPos.line, newPos.character + itemType.length);
			newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));

			// Discover item Name
			var itemNameRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_NAME);
			if (itemNameRange && itemNameRange.isSingleLine) {
				itemName = doc.getText(itemNameRange);
				highestNameLength = itemName.length > highestNameLength ? itemName.length : highestNameLength;
				newPos = newPos.with(newPos.line, newPos.character + itemName.length);
				newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
			}
		}
		// Must have a type and name to continue
		if (itemType.length === 0 || itemName.length === 0) {
			return "";
		}
		// Discover item Label
		let itemLabelRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_LABEL);
		if (itemLabelRange && itemLabelRange.isSingleLine) {
			itemLabel = doc.getText(itemLabelRange);
			highestLabelLength = itemLabel.length > highestLabelLength ? itemLabel.length : highestLabelLength;
			newPos = newPos.with(newPos.line, newPos.character + itemLabel.length);
			newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
		}
		// Discover item Icon
		let itemIconRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_ICON);
		if (itemIconRange && itemIconRange.isSingleLine) {
			itemIcon = doc.getText(itemIconRange);
			highestIconLength = itemIcon.length > highestIconLength ? itemIcon.length : highestIconLength;
			newPos = newPos.with(newPos.line, newPos.character + itemIcon.length);
			newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
		}
		// Discover item Group
		let itemGroupRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_GROUP);
		if (itemGroupRange && itemGroupRange.isSingleLine) {
			itemGroup = doc.getText(itemGroupRange);
			highestGroupLength = itemGroup.length > highestGroupLength ? itemGroup.length : highestGroupLength;
			newPos = newPos.with(newPos.line, newPos.character + itemGroup.length);
			newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
		}
		// Discover item Tag
		let itemTagRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_TAG);
		if (itemTagRange && itemTagRange.isSingleLine) {
			itemTag = doc.getText(itemTagRange);
			highestTagLength = itemTag.length > highestTagLength ? itemTag.length : highestTagLength;
			//console.log("Tag: " + itemTag);
			newPos = newPos.with(newPos.line, newPos.character + itemTag.length);
			newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
		}
		// Discover item Channel
		let itemChannelRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_CHANNEL);
		if (itemChannelRange && itemChannelRange.isSingleLine) {
			itemChannel = doc.getText(itemChannelRange);
			highestChannelLength = itemChannel.length > highestChannelLength ? itemChannel.length : highestChannelLength;
			newPos = newPos.with(newPos.line, newPos.character + itemChannel.length);
			newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
		}
		// Discover comment at end of line
		let itemCommentRange = doc.getWordRangeAtPosition(newPos, REGEX_EOL_COMMENT);
		if (itemCommentRange && itemCommentRange.isSingleLine) {
			itemComment = doc.getText(itemCommentRange);
			newPos = newPos.with(newPos.line, newPos.character + itemComment.length);
			newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
		}

		// Add the new item to the itemArray
		itemArray.push(new Item(index, leadingWhiteSpace, itemType, itemName, itemLabel, itemIcon, itemGroup, itemTag, itemChannel, itemComment));
	}

	// Convert the column lengths to tabs
	highestTypeLength = generateTabFromSpaces(highestTypeLength);
	highestNameLength = generateTabFromSpaces(highestNameLength);
	highestLabelLength = generateTabFromSpaces(highestLabelLength);
	highestIconLength = generateTabFromSpaces(highestIconLength);
	highestGroupLength = generateTabFromSpaces(highestGroupLength);
	highestTagLength = generateTabFromSpaces(highestTagLength);
	highestChannelLength = generateTabFromSpaces(highestChannelLength);

	// Insert the newly formatted items
	itemArray.forEach(function(item) {
		newPos = currentPos.with(item.line, 0);
		editor.selection = new vscode.Selection(newPos, newPos);
		let reformattedItem = formatItem(item);
		if (reformattedItem !== "") {
			let selection = new vscode.Range(newPos, newPos.with(newPos.line, doc.lineAt(newPos.line).text.length));
			textTextEdits.push(vscode.TextEdit.replace(selection, reformattedItem));
		}
	});

	// Apply all    clean and formatting Edits
	textWorkEdit.set(doc.uri, textTextEdits);
	await vscode.workspace.applyEdit(textWorkEdit);
}

/**
 * Clean file and prepare it for formatting.
 * Cleans all unnecessary lines, tabs, spaces, etc.
 */
async function cleanThingFile() {
	// Only execute if there's an active text editor
	if (!vscode.window.activeTextEditor) {
		return;
	}

	// Define the basic vscode variables
	let doc = vscode.window.activeTextEditor.document;
	let editor = vscode.window.activeTextEditor;
	let currentPos = editor.selection.active;
	let newPos: vscode.Position;
	let newLineCounter = 0;

	// Reset the comment-tracker
	isInBlockComment = false;

	// Clear the file in case of line-by-line item definitions
	for (let index = 0; index < doc.lineCount; index++) {
		// Get Position at the beginning of the current line and start a selection
		newPos = currentPos.with(index, 0);
		editor.selection = new vscode.Selection(newPos, newPos);

		// Get Text of current line and check if there is a comment in it
		let lineText = doc.lineAt(newPos.line);
		var comment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_COMMENT);
		var blockComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_START_BLOCKCOMMENT);
		var endBlockComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_END_BLOCKCOMMENT);

		// If line is empty or contains a comment continue to the next line
		if (lineText.text.length === 0 || lineText.isEmptyOrWhitespace) {
			newLineCounter++;
			continue;
		} else if (comment) {
			newLineCounter = 0;
			continue;
		} else if (blockComment && endBlockComment) {
			isInBlockComment = false;
			newLineCounter = 0;
			continue;
		} else if (blockComment) {
			isInBlockComment = true;
			newLineCounter = 0;
			continue;
		} else if (endBlockComment) {
			isInBlockComment = false;
			newLineCounter = 0;
			continue;
		} else if (isInBlockComment) {
			newLineCounter = 0;
			continue;
		}

		// Discover item Type
		var wordRange = doc.getWordRangeAtPosition(newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos)), REGEX_THING_TYPE);

		// Check if there is an item type at the beginning of each line
		if (wordRange && wordRange.isSingleLine) {
			// Clear all free lines before an item definition
			if (newLineCounter !== 0) {
				let newRange = new vscode.Range(newPos.line - newLineCounter, doc.lineAt(newPos.line - newLineCounter).text.length, newPos.line, 0);
				clearTextEdits.push(vscode.TextEdit.delete(newRange));
			}

			// Reset new Line counter
			newLineCounter = 0;
			continue;
		} else {
			if (newPos.line > 0) {
				// Select the \n mark at the end of the line => Delete all new lines in item definitions
				let newRange = new vscode.Range(newPos.line - 1, doc.lineAt(newPos.line - 1).text.length, newPos.line, 0);
				clearTextEdits.push(vscode.TextEdit.delete(newRange));

				// Reset new Line counter
				newLineCounter = 0;
			}
		}
	}

	// Apply all clean edits
	clearWorkEdit.set(doc.uri, clearTextEdits);
	await vscode.workspace.applyEdit(clearWorkEdit);
}

/**
 * Format the whole file after cleaning and preparing it.
 */
async function formatThingFile() {
	// Get the section lengths of each line with an item in it.
	// Only execute if there's an active text editor
	if (!vscode.window.activeTextEditor) {
		return;
	}

	// Define the basic vscode variables
	let doc = vscode.window.activeTextEditor.document;
	let editor = vscode.window.activeTextEditor;
	let currentPos = editor.selection.active;
	let newPos: vscode.Position;
	let thingArray: Array<Thing>;
	thingArray = new Array();

	// Get the format configuration settings
	let config = vscode.workspace.getConfiguration("oh-alignment-tool");
	let preserveWhitespace = config.preserveWhitespace;

	// Reset the comment tracker
	isInBlockComment = false;

	// Clear the file in case of line-by-line item definitions
	for (let index = 0; index < doc.lineCount; index++) {
		// Get Position at the beginning of the current line and start a selection
		newPos = currentPos.with(index, 0);
		editor.selection = new vscode.Selection(newPos, newPos);

		// Get Text of current line and check if there is a comment in it
		let lineText = doc.lineAt(newPos.line);
		var comment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_COMMENT);
		var blockComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_START_BLOCKCOMMENT);
		var endBlockComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_END_BLOCKCOMMENT);

		// If line is empty or contains a comment continue to the next line
		if (lineText.text.length === 0 || lineText.isEmptyOrWhitespace) {
			continue;
		} else if (comment) {
			continue;
		} else if (blockComment && endBlockComment) {
			isInBlockComment = false;
			continue;
		} else if (blockComment) {
			isInBlockComment = true;
			continue;
		} else if (endBlockComment) {
			isInBlockComment = false;
			continue;
		} else if (isInBlockComment) {
			continue;
		}

		// Default these to empty. They will be changed
		// if they exist in the item definition
		let thingType = "";
		let thingId = "";
		let thingLabel = "";
		let thingLocation = "";
		let thingParameters = "";
		let thingComment = "";

		// Check if there is leading Whitespace. If Yes add one in size of a tab.
		let leadingWhiteSpace = lineText.firstNonWhitespaceCharacterIndex;

		if (preserveWhitespace === false) {
			leadingWhiteSpace = 0;
		}

		// Discover thing Type
		// Count Whitespace or tabs at the begin of the line
		newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
		var wordRange = doc.getWordRangeAtPosition(newPos, REGEX_THING_TYPE);
		if (wordRange && wordRange.isSingleLine) {
			thingType = doc.getText(wordRange);
			highestThingTypeLength = thingType.length > highestThingTypeLength ? thingType.length : highestThingTypeLength;
			newPos = newPos.with(newPos.line, newPos.character + thingType.length);
			newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));

			// Discover thing Name
			var thingIdRange = doc.getWordRangeAtPosition(newPos, REGEX_THING_ID);
			if (thingIdRange && thingIdRange.isSingleLine) {
				thingId = doc.getText(thingIdRange);
				highestNameLength = thingId.length > highestNameLength ? thingId.length : highestNameLength;
				newPos = newPos.with(newPos.line, newPos.character + thingId.length);
				newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
			}
		}
		// Must have a type and name to continue
		if (thingType.length === 0 || thingId.length === 0) {
			return "";
		}
		// Discover thing Label
		let thingLabelRange = doc.getWordRangeAtPosition(newPos, REGEX_THING_LABEL);
		if (thingLabelRange && thingLabelRange.isSingleLine) {
			thingLabel = doc.getText(thingLabelRange);
			highestLabelLength = thingLabel.length > highestLabelLength ? thingLabel.length : highestLabelLength;
			newPos = newPos.with(newPos.line, newPos.character + thingLabel.length);
			newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
		}
		// Discover thing Icon
		let thingLocationRange = doc.getWordRangeAtPosition(newPos, REGEX_THING_LOCATION);
		if (thingLocationRange && thingLocationRange.isSingleLine) {
			thingLocation = doc.getText(thingLocationRange);
			highestIconLength = thingLocation.length > highestIconLength ? thingLocation.length : highestIconLength;
			newPos = newPos.with(newPos.line, newPos.character + thingLocation.length);
			newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
		}
		// Discover thing Group
		let thingParametersRange = doc.getWordRangeAtPosition(newPos, REGEX_THING_PARAMETERS);
		if (thingParametersRange && thingParametersRange.isSingleLine) {
			thingParameters = doc.getText(thingParametersRange);
			highestGroupLength = thingParameters.length > highestGroupLength ? thingParameters.length : highestGroupLength;
			newPos = newPos.with(newPos.line, newPos.character + thingParameters.length);
			newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
		}
		// Discover comment at end of line
		let thingCommentRange = doc.getWordRangeAtPosition(newPos, REGEX_EOL_COMMENT);
		if (thingCommentRange && thingCommentRange.isSingleLine) {
			thingComment = doc.getText(thingCommentRange);
			newPos = newPos.with(newPos.line, newPos.character + thingComment.length);
			newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
		}

		let bindingId = thingId.split(":")[0];
		let typeId = thingId.split(":")[1];
		thingId = thingId.split(":")[2];

		// Add the new item to the itemArray
		thingArray.push(new Thing(index, leadingWhiteSpace, thingType, bindingId, typeId, thingId, thingLabel, thingLocation, thingParameters, thingComment));
	}

	// Convert the column lengths to tabs
	highestThingTypeLength = generateTabFromSpaces(highestThingTypeLength);
	highestNameLength = generateTabFromSpaces(highestNameLength);
	highestLabelLength = generateTabFromSpaces(highestLabelLength);
	highestIconLength = generateTabFromSpaces(highestIconLength);
	highestGroupLength = generateTabFromSpaces(highestGroupLength);
	highestTagLength = generateTabFromSpaces(highestTagLength);
	highestChannelLength = generateTabFromSpaces(highestChannelLength);

	// Insert the newly formatted thing
	thingArray.forEach(function(thing) {
		newPos = currentPos.with(thing.line, 0);
		editor.selection = new vscode.Selection(newPos, newPos);
		let reformattedThing = formatThing(thing);
		if (reformattedThing !== "") {
			let selection = new vscode.Range(newPos, newPos.with(newPos.line, doc.lineAt(newPos.line).text.length));
			textTextEdits.push(vscode.TextEdit.replace(selection, reformattedThing));
		}
	});

	// Apply all    clean and formatting Edits
	textWorkEdit.set(doc.uri, textTextEdits);
	await vscode.workspace.applyEdit(textWorkEdit);
}

/**
 * Helper function which creates an item out of all single parts.
 *
 * @param type
 * @param name
 * @param label
 * @param icon
 * @param group
 * @param tag
 * @param channel
 * @param leadingWhitespaceCount
 */
function formatItem(item: Item): string {
	// Get the configuration settings
	let config = vscode.workspace.getConfiguration("oh-alignment-tool");
	let formatStyle = config.formatStyle;
	let newLineAfterItem = config.newLineAfterItem;
	let multilineIndentAmount = config.multilineIndentAmount;
	let editor = vscode.window.activeTextEditor;
	let formattedItem = "";

	// Only execute if there's an active text editor
	if (!editor) {
		return "";
	}

	// Check for the formatting style in the user configuration
	if (formatStyle === "Column" || formatStyle === "ChannelColumn") {
		// Fill the required amount of tabs after each item part. For Column Style Formatting
		let newType = fillColumns(item.type, highestTypeLength);
		let newName = fillColumns(item.name, highestNameLength);
		let newLabel = fillColumns(item.label, highestLabelLength);
		let newIcon = fillColumns(item.icon, highestIconLength);
		let newGroup = fillColumns(item.group, highestGroupLength);
		let newTag = fillColumns(item.tag, highestTagLength);

		// Add the leading whitespace (for group and subgroups)
		// Add tabs to string
		for (let i = 0; i < item.leadingWhiteSpace; i++) {
			newType = "\t" + newType;
		}

		if (formatStyle === "ChannelColumn") {
			let tabs = "";
			let tabIndent = highestTypeLength + highestNameLength + highestLabelLength + highestIconLength + highestGroupLength + highestTagLength;

			for (let i = 0; i < tabIndent; i++) {
				tabs = tabs + "\t";
			}
			tabs = ",\n" + tabs + " ";
			item.channel = item.channel.replace(/,\s*/g, tabs);
		}

		// Build the formatted item and return it
		formattedItem = newType + newName + newLabel + newIcon + newGroup + newTag + item.channel + "\t" + item.comment;

		// Multiline Format Style
	} else if (formatStyle === "Multiline") {
		// If item type is longer than the indent, make sure there's at least one space
		let typeNameIndent = "";
		let tabSize = 0;
		let indent = "";

		// Get the tab size setting of the current editor
		if (editor.options.tabSize !== undefined) {
			tabSize = +editor.options.tabSize;
		}

		// Check if Indent Amount is smaller than item type
		if (highestTypeLength > multilineIndentAmount) {
			typeNameIndent = typeNameIndent + "\t";
		} else {
			let gapSize = multilineIndentAmount - Math.floor(item.type.length / tabSize);
			for (let index = 0; index < gapSize; index++) {
				typeNameIndent = typeNameIndent + "\t";
			}
		}

		// Check if item parts are empty
		let newLabel = fillMultiLines(item.label, multilineIndentAmount, item.leadingWhiteSpace);
		let newIcon = fillMultiLines(item.icon, multilineIndentAmount, item.leadingWhiteSpace);
		let newGroup = fillMultiLines(item.group, multilineIndentAmount, item.leadingWhiteSpace);
		let newTag = fillMultiLines(item.tag, multilineIndentAmount, item.leadingWhiteSpace);
		let newChannel = fillMultiLines(item.channel, multilineIndentAmount, item.leadingWhiteSpace);
		let newComment = fillMultiLines(item.comment, multilineIndentAmount, item.leadingWhiteSpace);

		// Insert a new line after the item if config says so
		// Add the leading whitespace (for group and subgroups)
		// Add tabs to string
		for (let i = 0; i < item.leadingWhiteSpace; i++) {
			indent = "\t" + indent;
		}
		formattedItem = indent + item.type + typeNameIndent + item.name + newLabel + newIcon + newGroup + newTag + newChannel + newComment;
	} else {
		// @todo add window message for user
		return "";
	}

	formattedItem = newLineAfterItem === false ? formattedItem : formattedItem + "\n";
	return formattedItem;
}

/**
 * Helper function which creates an item out of all single parts.
 *
 * @param type
 * @param name
 * @param label
 * @param icon
 * @param group
 * @param tag
 * @param channel
 * @param leadingWhitespaceCount
 */
function formatThing(thing: Thing): string {
	// Get the configuration settings
	let config = vscode.workspace.getConfiguration("oh-alignment-tool");
	let formatStyle = config.formatStyle;
	let newLineAfterItem = config.newLineAfterItem;
	let multilineIndentAmount = config.multilineIndentAmount;
	let editor = vscode.window.activeTextEditor;
	let formattedThing = "";

	// Only execute if there's an active text editor
	if (!editor) {
		return "";
	}

	// Check for the formatting style in the user configuration
	if (formatStyle === "Column" || formatStyle === "ChannelColumn") {
		// Fill the required amount of tabs after each thing part. For Column Style Formatting
		let newType = fillColumns(thing.thing_type, highestTypeLength);
		let newBindingId = fillColumns(thing.binding_id, highestNameLength);
		let newTypeId = fillColumns(thing.type_id, highestLabelLength);
		let newThingId = fillColumns(thing.thing_id, highestIconLength);
		let newLabel = fillColumns(thing.label, highestGroupLength);
		let newLocation = fillColumns(thing.location, highestTagLength);
		let newParameters = fillColumns(thing.parameters, highestTagLength);

		// Add the leading whitespace (for group and subgroups)
		// Add tabs to string
		for (let i = 0; i < thing.leadingWhiteSpace; i++) {
			newType = "\t" + newType;
		}

		if (formatStyle === "ChannelColumn") {
			let tabs = "";
			let tabIndent = highestTypeLength + highestNameLength + highestLabelLength + highestIconLength + highestGroupLength + highestTagLength;

			for (let i = 0; i < tabIndent; i++) {
				tabs = tabs + "\t";
			}
			tabs = ",\n" + tabs + " ";
			thing.location = thing.location.replace(/,\s*/g, tabs);
		}

		// Build the formatted thing and return it

		// Multiline Format Style
	} else if (formatStyle === "Multiline") {
	} else {
		// @todo add window message for user
		return "";
	}

	return "";
}

/**
 * Count the amount of whitespace starting at startPos
 *
 * @param doc
 * @param startPos
 */
function countWhitespace(doc: vscode.TextDocument, startPos: vscode.Position): number {
	let whitespaceRange = doc.getWordRangeAtPosition(startPos, /[ \t@]+/);
	if (whitespaceRange && whitespaceRange.isSingleLine) {
		return doc.getText(whitespaceRange).length;
	}
	return 0;
}

/**
 * Calculate the number of tabs to separate each part item to fit the widest column
 *
 * @param str
 * @param finalLength
 */
function fillColumns(str: string, finalLength: number): string {
	let editor = vscode.window.activeTextEditor;
	let tabSize = 0;
	let gapLength = 0;
	let strLength = 0;

	// Check it item is empty
	if (finalLength === 0) {
		return "";
	}
	// Only execute if there's an active text editor
	if (!editor) {
		return "";
	}
	// Get the tab size setting of the current editor
	if (editor.options.tabSize !== undefined) {
		tabSize = +editor.options.tabSize;
	}

	// Calculate the width of the column gap
	strLength = Math.floor(str.length / tabSize);
	gapLength = finalLength - strLength;

	// Add tabs to string
	for (let i = 0; i < gapLength; i++) {
		str = str + "\t";
	}

	return str;
}

/**
 * Calculate the number of tabs to separate each part item to fit the widest column
 *
 * @param str
 * @param finalLength
 */
function fillMultiLines(str: string, indenAmount: number, leadingWhiteSpace: number): string {
	let editor = vscode.window.activeTextEditor;
	let gap = "";
	let indent = "";

	// Only execute if there's an active text editor
	if (!editor) {
		return "";
	}

	if (str === "") {
		return "";
	}

	// Add tabs to string
	for (let i = 0; i < indenAmount; i++) {
		gap = gap + "\t";
	}

	// Add tabs to string
	for (let i = 0; i < leadingWhiteSpace; i++) {
		indent = indent + "\t";
	}

	str = "\n" + indent + gap + str;

	return str;
}

function generateTabFromSpaces(spaces: number): number {
	let editor = vscode.window.activeTextEditor;
	let tabSize = 0;
	let tabs = "";

	// Only execute if there's an active text editor
	if (!editor) {
		return 0;
	}

	// Get the tab size setting of the current editor
	if (editor.options.tabSize !== undefined) {
		tabSize = +editor.options.tabSize;
	}

	// Add one space if spaces / size of tab is an even number
	spaces = (spaces / tabSize) % 1 === 0 ? spaces + 1 : spaces;

	return Math.ceil(spaces / tabSize);
}

/**
 * This method is called when the extension is closed and deactivated
 */
export function deactivate() {}
