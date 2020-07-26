"use strict";

import * as vscode from "vscode";

import * as utils from "./utils";

import Item = require("./item");
import Bridge = require("./bridge");
import Thing = require("./thing");
import Channel = require("./channel");

import { type } from "os";
import { format } from "path";

// Regex patterns to match comment sections
const REGEX_COMMENT = /^\s*\/\/.*$/;
const REGEX_START_BLOCKCOMMENT = /^\s*\/\*.*$/;
const REGEX_END_BLOCKCOMMENT = /^.*\s*\*\/$/;
const REGEX_EOL_COMMENT = /\/\/.*/;
const REGEX_OHFS_COMMENT = /^\s*\/\/\s*\#OHFS\#(\w*)\#OHFS\#$/;
const REGEX_OHNG_COMMENT = /^\s*\/\/\s*\#OHNG\#$/;

// Regex patterns to match parts of item definition
const REGEX_ITEM_TYPE = /(Color|Contact|DateTime|Dimmer|Group|Image|Location|Number|Player|Rollershutter|String|Switch)(:\w+)?(:\w+)?(\(\w+,\s*\w+\))?(\(".*"\))?/;
const REGEX_ITEM_NAME = /[a-zA-Z0-9äöüÄÖÜ][a-zA-Z0-9äöüÄÖÜ_]*/;
const REGEX_ITEM_LABEL = /\".+?\"/;
const REGEX_ITEM_ICON = /<.+?>/;
const REGEX_ITEM_GROUP = /\(.+?\)/;
const REGEX_ITEM_TAG = /\[\s*(\".+?\")\s*(,\s*\".+?\"\s*)*\]/;
const REGEX_ITEM_CHANNEL_START = /\{\s*(\w*\s?=\s?"[^\}]*"?,?\s*)+\}?/;
const REGEX_ITEM_CHANNEL_END = /.*[\},]/;

const REGEX_SITEMAP_ELEMENTS = /\b(Frame|Default|Text|Group|Switch|Selection|Setpoint|Slider|Colorpicker|Webview|Mapview|Image|Video|Chart)\b/g;

const REGEX_THING_TYPE = /^Bridge|Thing/g;
const REGEX_THING_ID = /\w*:\w*:\w*/;
const REGEX_THING_LABEL = /\".+?\"/;
const REGEX_THING_LOCATION = /\".+?\"/;
const REGEX_THING_PARAMETERS = /.*[\},]/;

// Default item values
const DEF_ITEM_TYPE = "Type";
const DEF_ITEM_NAME = "Name";
const DEF_ITEM_LABEL = '"Label [%s]"';
const DEF_ITEM_ICON = "<icon>";
const DEF_ITEM_GROUP = "(group)";
const DEF_ITEM_TAG = '["tag"]';
const DEF_ITEM_CHANNEL = '{ channel="" }\n';

// Section lengths for things
var highestThingTypeLength = 6;
var highestThingIdLength = 0;
var hightesThingLabelLength = 0;
var highestThingLocationLength = 0;
var highestThingParametersLength = 0;

// Comment Checker
let isInBlockComment = false;

function getDocumentRange(document: vscode.TextDocument) {
	var start = new vscode.Position(0, 0);
	var lastLine = document.lineCount - 1;
	var end = new vscode.Position(lastLine, document.lineAt(lastLine).text.length);
	return new vscode.Range(start, end);
}

/**
 * This function is calles when the extension is opened and activated
 * @param context
 */
export function activate(context: vscode.ExtensionContext) {
	// Formatter implementation
	context.subscriptions.push(
		vscode.languages.registerDocumentFormattingEditProvider("openhab", {
			provideDocumentFormattingEdits: (document, options, token) => {
				let config = vscode.workspace.getConfiguration("oh-alignment-tool");
				// Check the file type, clean the file and format it
				if (document.fileName.includes(".sitemap")) {
					return config.enableBetaFeatures ? formatSitemapFile() : undefined;
				} else if (document.fileName.includes(".items")) {
					return formatItemFile();
				} else if (document.fileName.includes(".things")) {
					return config.enableBetaFeatures ? formatThingFile() : undefined;
				} else {
					return undefined;
				}
			},
		})
	);
	// Selection Formatter implementation
	context.subscriptions.push(
		vscode.languages.registerDocumentRangeFormattingEditProvider("openhab", {
			provideDocumentRangeFormattingEdits: (document, range, options, token) => {
				var start = new vscode.Position(0, 0);
				var end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
				return formatItemFile(range);
			},
		})
	);

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
}

/**
 * This method is called when the extension is closed and deactivated
 */
export function deactivate() {}

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
 * Format the whole sitemap file
 *
 * @param range
 */
function formatSitemapFile(range?: vscode.Range): vscode.TextEdit[] {
	var result: vscode.TextEdit[] = [];
	// Get the section lengths of each line with an item in it.
	// Only execute if there's an active text editor
	if (!vscode.window.activeTextEditor) {
		return result;
	}

	// Define the basic vscode variables
	let doc = vscode.window.activeTextEditor.document;
	let editor = vscode.window.activeTextEditor;
	let currentPos = editor.selection.active;
	let newPos: vscode.Position;
	let indentCounter = 0;

	// Reset the comment-tracker
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
	result.push(vscode.TextEdit.replace(selection, wholeDoc));

	let firstLine = range ? range.start.line : 0;
	let lastLine = range ? range.end.line : doc.lineCount - 1;

	// Clear the file in case of line-by-line item definitions
	for (let index = firstLine; index <= lastLine; index++) {
		// Get Position at the beginning of the current line and start a selection
		newPos = currentPos.with(index, 0);

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
		result.push(vscode.TextEdit.replace(selection, lineText));
	}

	return result;
}

/**
 * Format the whole file after cleaning and preparing it.
 */
function formatItemFile(range?: vscode.Range): vscode.TextEdit[] {
	var result: vscode.TextEdit[] = [];
	// Get the section lengths of each line with an item in it.
	// Only execute if there's an active text editor
	if (!vscode.window.activeTextEditor) {
		return result;
	}

	// Define the basic vscode variables
	let doc = vscode.window.activeTextEditor.document;
	let editor = vscode.window.activeTextEditor;
	let currentPos = editor.selection.active;
	let newPos: vscode.Position;
	let itemArray: Array<Item>;
	itemArray = new Array();

	let itemPending = false;
	let channelPending = false;
	var formatOption = "";
	var itemBlockCounter = 0;

	// Get the format configuration settings
	let config = vscode.workspace.getConfiguration("oh-alignment-tool");
	let preserveWhitespace = config.preserveWhitespace;
	let newLineAfterItem = config.newLineAfterItem;

	let leadingWhiteSpace = 0;

	// Reset the comment tracker
	isInBlockComment = false;

	// Default these to empty. They will be changed
	// if they exist in the item definition
	let firstPosition = new vscode.Position(0, 0);
	let lastPosition = new vscode.Position(0, 0);
	let itemType = "";
	let itemName = "";
	let itemLabel = "";
	let itemIcon = "";
	let itemGroup = "";
	let itemTag = "";
	let itemChannel = "";
	let itemComment = "";

	// Section lengths for items
	var highestLengths = [0, 0, 0, 0, 0, 0, 0];
	highestLengths[0] = 0;
	highestLengths[1] = 0;
	highestLengths[2] = 0;
	highestLengths[3] = 0;
	highestLengths[4] = 0;
	highestLengths[5] = 0;
	highestLengths[6] = 0;

	let firstLine = range ? range.start.line : 0;
	let lastLine = range ? range.end.line : doc.lineCount - 1;

	// Clear the file in case of line-by-line item definitions
	for (let index = firstLine; index <= lastLine; index++) {
		// Get Position at the beginning of the current line and start a selection
		newPos = currentPos.with(index, 0);

		// Get Text of current line and check if there is a comment in it
		let lineText = doc.lineAt(newPos.line);
		var comment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_COMMENT);
		var blockComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_START_BLOCKCOMMENT);
		var endBlockComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_END_BLOCKCOMMENT);
		var ohfsComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_OHFS_COMMENT);
		var ohngComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_OHNG_COMMENT);

		// Check if there is leading Whitespace. If Yes add one in size of a tab.
		leadingWhiteSpace = lineText.firstNonWhitespaceCharacterIndex;
		if (preserveWhitespace === false) {
			leadingWhiteSpace = 0;
		}

		// If line is empty or contains a comment continue to the next line
		if (lineText.text.length === 0 || lineText.isEmptyOrWhitespace) {
			if (itemPending) {
				// Add the new item to the itemArray
				if (newLineAfterItem) {
					lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
				}
				itemArray.push(new Item(new vscode.Range(firstPosition, lastPosition), leadingWhiteSpace, formatOption, highestLengths, itemType, itemName, itemLabel, itemIcon, itemGroup, itemTag, itemChannel, itemComment));
				itemBlockCounter++;

				// Default these to empty. They will be changed
				// if they exist in the item definition
				itemType = "";
				itemName = "";
				itemLabel = "";
				itemIcon = "";
				itemGroup = "";
				itemTag = "";
				itemChannel = "";
				itemComment = "";
				itemPending = false;
			}
			continue;
		} else if (comment) {
			if (ohfsComment) {
				var ohfs = doc.getText(ohfsComment);
				var formatOptions = ohfs.match(REGEX_OHFS_COMMENT);
				if (formatOptions && formatOptions.length >= 1) {
					formatOption = formatOptions[1];
				}
			} else if (ohngComment) {
				// Insert the newly formatted items
				for (var i = 1; i <= itemBlockCounter; i++) {
					var newItem = itemArray[itemArray.length - i];
					newItem.highestLengths = [...highestLengths];
				}
				// Section lengths for items
				highestLengths[0] = 0;
				highestLengths[1] = 0;
				highestLengths[2] = 0;
				highestLengths[3] = 0;
				highestLengths[4] = 0;
				highestLengths[5] = 0;
				highestLengths[6] = 0;
				itemBlockCounter = 0;
			}
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

		// Discover item Type
		// Count Whitespace or tabs at the begin of the line
		newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
		var wordRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_TYPE);
		if (wordRange && wordRange.isSingleLine) {
			if (itemPending) {
				// Add the new item to the itemArray
				itemArray.push(new Item(new vscode.Range(firstPosition, lastPosition), leadingWhiteSpace, formatOption, highestLengths, itemType, itemName, itemLabel, itemIcon, itemGroup, itemTag, itemChannel, itemComment));
				itemBlockCounter++;

				// Default these to empty. They will be changed
				// if they exist in the item definition
				itemType = "";
				itemName = "";
				itemLabel = "";
				itemIcon = "";
				itemGroup = "";
				itemTag = "";
				itemChannel = "";
				itemComment = "";
				itemPending = false;
			}
			itemType = doc.getText(wordRange);
			highestLengths[0] = itemType.length > highestLengths[0] ? itemType.length : highestLengths[0];
			newPos = newPos.with(newPos.line, newPos.character + itemType.length);
			newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
			firstPosition = new vscode.Position(index, 0);
			itemPending = true;

			// Discover item Name
			var itemNameRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_NAME);
			if (itemNameRange && itemNameRange.isSingleLine) {
				itemName = doc.getText(itemNameRange);
				highestLengths[1] = itemName.length > highestLengths[1] ? itemName.length : highestLengths[1];
				newPos = newPos.with(newPos.line, newPos.character + itemName.length);
				newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
				lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
			}
		}
		// Must have a type and name to continue
		if (itemType.length === 0 || itemName.length === 0) {
			continue;
		}
		// Discover item Label
		let itemLabelRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_LABEL);
		if (itemLabelRange && itemLabelRange.isSingleLine) {
			itemLabel = doc.getText(itemLabelRange);
			highestLengths[2] = itemLabel.length > highestLengths[2] ? itemLabel.length : highestLengths[2];
			newPos = newPos.with(newPos.line, newPos.character + itemLabel.length);
			newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
			lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
		}
		// Discover item Icon
		let itemIconRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_ICON);
		if (itemIconRange && itemIconRange.isSingleLine) {
			itemIcon = doc.getText(itemIconRange);
			highestLengths[3] = itemIcon.length > highestLengths[3] ? itemIcon.length : highestLengths[3];
			newPos = newPos.with(newPos.line, newPos.character + itemIcon.length);
			newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
			lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
		}
		// Discover item Group
		let itemGroupRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_GROUP);
		if (itemGroupRange && itemGroupRange.isSingleLine) {
			itemGroup = doc.getText(itemGroupRange);
			highestLengths[4] = itemGroup.length > highestLengths[4] ? itemGroup.length : highestLengths[4];
			newPos = newPos.with(newPos.line, newPos.character + itemGroup.length);
			newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
			lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
		}
		// Discover item Tag
		let itemTagRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_TAG);
		if (itemTagRange && itemTagRange.isSingleLine) {
			itemTag = doc.getText(itemTagRange);
			highestLengths[5] = itemTag.length > highestLengths[5] ? itemTag.length : highestLengths[5];
			newPos = newPos.with(newPos.line, newPos.character + itemTag.length);
			newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
			//console.log("Tag: " + itemTag);
			lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
		}
		// Discover item Channel
		if (!channelPending) {
			let itemChannelRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_CHANNEL_START);
			if (itemChannelRange && itemChannelRange.isSingleLine) {
				itemChannel += doc.getText(itemChannelRange);
				itemChannel = itemChannel.trimRight();
				if (!itemChannel.endsWith("}")) {
					channelPending = true;
				}
				highestLengths[6] = itemChannel.length > highestLengths[6] ? itemChannel.length : highestLengths[6];
				newPos = newPos.with(newPos.line, newPos.character + itemChannel.length);
				newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
				lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
			}
		} else {
			let itemChannelRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_CHANNEL_END);
			if (itemChannelRange && itemChannelRange.isSingleLine) {
				itemChannel += doc.getText(itemChannelRange).trimLeft();
				if (itemChannel.endsWith("}")) {
					channelPending = false;
				}
				highestLengths[6] = itemChannel.length > highestLengths[6] ? itemChannel.length : highestLengths[6];
				newPos = newPos.with(newPos.line, newPos.character + itemChannel.length);
				newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
				lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
			}
		}

		// Discover comment at end of line
		let itemCommentRange = doc.getWordRangeAtPosition(newPos, REGEX_EOL_COMMENT);
		if (itemCommentRange && itemCommentRange.isSingleLine && itemCommentRange.start.character >= newPos.character) {
			itemComment = doc.getText(itemCommentRange);
			newPos = newPos.with(newPos.line, newPos.character + itemComment.length);
			newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
			lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
		}
	}

	if (itemPending) {
		// Add the new item to the itemArray
		itemArray.push(new Item(new vscode.Range(firstPosition, lastPosition), leadingWhiteSpace, formatOption, highestLengths, itemType, itemName, itemLabel, itemIcon, itemGroup, itemTag, itemChannel, itemComment));
		itemBlockCounter++;

		// Default these to empty. They will be changed
		// if they exist in the item definition
		itemType = "";
		itemName = "";
		itemLabel = "";
		itemIcon = "";
		itemGroup = "";
		itemTag = "";
		itemChannel = "";
		itemComment = "";
		itemPending = false;
	}

	for (var e = 1; e <= itemBlockCounter; e++) {
		var item = itemArray[itemArray.length - e];
		item.highestLengths = [...highestLengths];
	}

	// Insert the newly formatted items
	itemArray.forEach(function (item) {
		let reformattedItem = formatItem(item);
		if (reformattedItem !== "") {
			result.push(vscode.TextEdit.replace(item.range, reformattedItem));
		}
	});

	return result;
}

/**
 * Format the whole thing file
 *
 * @param range
 */
function formatThingFile(range?: vscode.Range): vscode.TextEdit[] {
	var result: vscode.TextEdit[] = [];
	// Get the section lengths of each line with an item in it.
	// Only execute if there's an active text editor
	if (!vscode.window.activeTextEditor) {
		return result;
	}

	// Define the basic vscode variables
	let doc = vscode.window.activeTextEditor.document;
	let editor = vscode.window.activeTextEditor;
	let currentPos = editor.selection.active;
	let newPos: vscode.Position;
	let thingArray: Array<Thing>;
	thingArray = new Array();

	let thingPending = false;
	let channelPending = false;

	// Get the format configuration settings
	let config = vscode.workspace.getConfiguration("oh-alignment-tool");
	let preserveWhitespace = config.preserveWhitespace;
	let newLineAfterItem = config.newLineAfterItem;

	let leadingWhiteSpace = 0;

	// Reset the comment tracker
	isInBlockComment = false;

	// Default these to empty. They will be changed
	// if they exist in the item definition
	let firstPosition = new vscode.Position(0, 0);
	let lastPosition = new vscode.Position(0, 0);
	let thingType = "";
	let thingId = "";
	let thingLabel = "";
	let thingLocation = "";
	let thingParameters = "";
	let thingComment = "";

	// Section lengths for items
	var highestLengths = [0, 0, 0, 0, 0, 0, 0];
	highestLengths[0] = 0;
	highestLengths[1] = 0;
	highestLengths[2] = 0;
	highestLengths[3] = 0;
	highestLengths[4] = 0;
	highestLengths[5] = 0;
	highestLengths[6] = 0;

	let firstLine = range ? range.start.line : 0;
	let lastLine = range ? range.end.line : doc.lineCount - 1;

	// #OHFS#Channel#OHFS#
	// Clear the file in case of line-by-line item definitions
	for (let index = firstLine; index <= lastLine; index++) {
		// Get Position at the beginning of the current line and start a selection
		newPos = currentPos.with(index, 0);

		// Get Text of current line and check if there is a comment in it
		let lineText = doc.lineAt(newPos.line);
		var comment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_COMMENT);
		var blockComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_START_BLOCKCOMMENT);
		var endBlockComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_END_BLOCKCOMMENT);

		// Check if there is leading Whitespace. If Yes add one in size of a tab.
		leadingWhiteSpace = lineText.firstNonWhitespaceCharacterIndex;
		if (preserveWhitespace === false) {
			leadingWhiteSpace = 0;
		}

		// If line is empty or contains a comment continue to the next line
		if (lineText.text.length === 0 || lineText.isEmptyOrWhitespace) {
			if (thingPending) {
				// Add the new item to the itemArray
				if (newLineAfterItem) {
					lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
				}
				let bindingId = thingId.split(":")[0];
				let typeId = thingId.split(":")[1];
				thingId = thingId.split(":")[2];
				thingArray.push(new Thing(new vscode.Range(firstPosition, lastPosition), leadingWhiteSpace, highestLengths, thingType, bindingId, typeId, thingId, thingLabel, thingLocation, thingParameters, thingComment));

				// Default these to empty. They will be changed
				// if they exist in the item definition
				thingType = "";
				thingId = "";
				thingLabel = "";
				thingLocation = "";
				thingParameters = "";
				thingComment = "";
				thingPending = false;
			}
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

		// Discover thing Type
		// Count Whitespace or tabs at the begin of the line
		newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
		var wordRange = doc.getWordRangeAtPosition(newPos, REGEX_THING_TYPE);
		if (wordRange && wordRange.isSingleLine) {
			if (thingPending) {
				// Add the new item to the itemArray
				if (newLineAfterItem) {
					lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
				}
				let bindingId = thingId.split(":")[0];
				let typeId = thingId.split(":")[1];
				thingId = thingId.split(":")[2];
				thingArray.push(new Thing(new vscode.Range(firstPosition, lastPosition), leadingWhiteSpace, highestLengths, thingType, bindingId, typeId, thingId, thingLabel, thingLocation, thingParameters, thingComment));

				// Default these to empty. They will be changed
				// if they exist in the item definition
				thingType = "";
				thingId = "";
				thingLabel = "";
				thingLocation = "";
				thingParameters = "";
				thingComment = "";
				thingPending = false;
			}
			thingType = doc.getText(wordRange);
			highestThingTypeLength = thingType.length > highestThingTypeLength ? thingType.length : highestThingTypeLength;
			newPos = newPos.with(newPos.line, newPos.character + thingType.length);
			newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
			firstPosition = new vscode.Position(index, 0);
			thingPending = true;

			// Discover thing Name
			var thingIdRange = doc.getWordRangeAtPosition(newPos, REGEX_THING_ID);
			if (thingIdRange && thingIdRange.isSingleLine) {
				thingId = doc.getText(thingIdRange);
				highestLengths[1] = thingId.length > highestLengths[1] ? thingId.length : highestLengths[1];
				newPos = newPos.with(newPos.line, newPos.character + thingId.length);
				newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
				lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
			}
		}
		// Must have a type and name to continue
		if (thingType.length === 0 || thingId.length === 0) {
			continue;
		}
		// Discover thing Label
		let thingLabelRange = doc.getWordRangeAtPosition(newPos, REGEX_THING_LABEL);
		if (thingLabelRange && thingLabelRange.isSingleLine) {
			thingLabel = doc.getText(thingLabelRange);
			highestLengths[2] = thingLabel.length > highestLengths[2] ? thingLabel.length : highestLengths[2];
			newPos = newPos.with(newPos.line, newPos.character + thingLabel.length);
			newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
			lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
		}
		// Discover thing Icon
		let thingLocationRange = doc.getWordRangeAtPosition(newPos, REGEX_THING_LOCATION);
		if (thingLocationRange && thingLocationRange.isSingleLine) {
			thingLocation = doc.getText(thingLocationRange);
			highestLengths[3] = thingLocation.length > highestLengths[3] ? thingLocation.length : highestLengths[3];
			newPos = newPos.with(newPos.line, newPos.character + thingLocation.length);
			newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
			lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
		}
		// Discover thing Group
		let thingParametersRange = doc.getWordRangeAtPosition(newPos, REGEX_THING_PARAMETERS);
		if (thingParametersRange && thingParametersRange.isSingleLine) {
			thingParameters = doc.getText(thingParametersRange);
			highestLengths[4] = thingParameters.length > highestLengths[4] ? thingParameters.length : highestLengths[4];
			newPos = newPos.with(newPos.line, newPos.character + thingParameters.length);
			newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
			lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
		}
		// Discover comment at end of line
		let thingCommentRange = doc.getWordRangeAtPosition(newPos, REGEX_EOL_COMMENT);
		if (thingCommentRange && thingCommentRange.isSingleLine) {
			thingComment = doc.getText(thingCommentRange);
			newPos = newPos.with(newPos.line, newPos.character + thingComment.length);
			newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
			lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
		}
	}

	if (thingPending) {
		// Add the new item to the itemArray
		let bindingId = thingId.split(":")[0];
		let typeId = thingId.split(":")[1];
		thingId = thingId.split(":")[2];
		thingArray.push(new Thing(new vscode.Range(firstPosition, lastPosition), leadingWhiteSpace, highestLengths, thingType, bindingId, typeId, thingId, thingLabel, thingLocation, thingParameters, thingComment));

		// Default these to empty. They will be changed
		// if they exist in the item definition
		thingType = "";
		thingId = "";
		thingLabel = "";
		thingLocation = "";
		thingParameters = "";
		thingComment = "";
		thingPending = false;
	}

	// Convert the column lengths to tabs
	highestLengths[0] = utils.generateTabFromSpaces(highestLengths[0]);
	highestLengths[1] = utils.generateTabFromSpaces(highestLengths[1]);
	highestLengths[2] = utils.generateTabFromSpaces(highestLengths[2]);
	highestLengths[3] = utils.generateTabFromSpaces(highestLengths[3]);
	highestLengths[4] = utils.generateTabFromSpaces(highestLengths[4]);
	highestLengths[5] = utils.generateTabFromSpaces(highestLengths[5]);
	highestLengths[6] = utils.generateTabFromSpaces(highestLengths[6]);

	// Insert the newly formatted items
	thingArray.forEach(function (thing) {
		let reformattedThing = formatThing(thing);
		if (reformattedThing !== "") {
			result.push(vscode.TextEdit.replace(thing.range, reformattedThing));
		}
	});

	return result;
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

	// Section lengths for items
	var highestLengths = [0, 0, 0, 0, 0, 0, 0];
	highestLengths[0] = 0;
	highestLengths[1] = 0;
	highestLengths[2] = 0;
	highestLengths[3] = 0;
	highestLengths[4] = 0;
	highestLengths[5] = 0;
	highestLengths[6] = 0;

	let item = new Item(range, 0, "", highestLengths, type, name, label, icon, group, tag, channel);
	let formattedItem = formatItem(item);

	let selection = range;
	editor.edit((builder) => {
		builder.replace(selection, formattedItem);
	});
	editor.selection = new vscode.Selection(newPos, newPos);
}

/**
 * Format an item.
 *
 * @param item
 */
function formatItem(item: Item): string {
	// Get the configuration settings
	let config = vscode.workspace.getConfiguration("oh-alignment-tool");
	let formatStyle = item.formatOption ? item.formatOption : config.formatStyle;
	let newLineAfterItem = config.newLineAfterItem;
	let multilineIndentAmount = config.multilineIndentAmount;
	let editor = vscode.window.activeTextEditor;
	let formattedItem = "";

	// Only execute if there's an active text editor
	if (!editor) {
		return "";
	}

	let highestLengths = [];

	highestLengths[0] = utils.generateTabFromSpaces(item.highestLengths[0]);
	highestLengths[1] = utils.generateTabFromSpaces(item.highestLengths[1]);
	highestLengths[2] = utils.generateTabFromSpaces(item.highestLengths[2]);
	highestLengths[3] = utils.generateTabFromSpaces(item.highestLengths[3]);
	highestLengths[4] = utils.generateTabFromSpaces(item.highestLengths[4]);
	highestLengths[5] = utils.generateTabFromSpaces(item.highestLengths[5]);
	highestLengths[6] = utils.generateTabFromSpaces(item.highestLengths[6]);

	// Check for the formatting style in the user configuration
	if (formatStyle === "Column" || formatStyle === "ChannelColumn") {
		// Fill the required amount of tabs after each item part. For Column Style Formatting
		let newType = utils.fillColumns(item.type, highestLengths[0]);
		let newName = utils.fillColumns(item.name, highestLengths[1]);
		let newLabel = utils.fillColumns(item.label, highestLengths[2]);
		let newIcon = utils.fillColumns(item.icon, highestLengths[3]);
		let newGroup = utils.fillColumns(item.group, highestLengths[4]);
		let newTag = utils.fillColumns(item.tag, highestLengths[5]);

		// Add the leading whitespace (for group and subgroups)
		// Add tabs to string
		for (let i = 0; i < item.leadingWhiteSpace; i++) {
			newType = "\t" + newType;
		}

		if (formatStyle === "ChannelColumn") {
			let tabs = "";
			let spaces = "";
			let tabIndent = highestLengths[0] + highestLengths[1] + highestLengths[2] + highestLengths[3] + highestLengths[4] + highestLengths[5];

			for (let i = 0; i < tabIndent; i++) {
				tabs = tabs + "\t";
			}

			var identResult = item.channel.match(/^\{(\w*)="/);
			let identCount = 0;
			if (identResult) {
				identCount = identResult[0].length;
				for (let e = 0; e < identCount; e++) {
					spaces = spaces + " ";
				}
			}

			item.channel = item.channel.replace(/",\s*(\w*)=/g, '",\n' + tabs + " " + "$1=");
			item.channel = item.channel.replace(/\],\s*([\>\<])/g, "],\n" + tabs + spaces + "$1");
		}

		// Build the formatted item and return it
		if (item.comment !== "") {
			item.comment = "\t" + item.comment;
		}
		formattedItem = newType + newName + newLabel + newIcon + newGroup + newTag + item.channel + item.comment;

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
		if (highestLengths[0] > multilineIndentAmount) {
			typeNameIndent = typeNameIndent + "\t";
		} else {
			let gapSize = multilineIndentAmount - Math.floor(item.type.length / tabSize);
			for (let index = 0; index < gapSize; index++) {
				typeNameIndent = typeNameIndent + "\t";
			}
		}

		// Check if item parts are empty
		let newLabel = utils.fillMultiLines(item.label, multilineIndentAmount, item.leadingWhiteSpace);
		let newIcon = utils.fillMultiLines(item.icon, multilineIndentAmount, item.leadingWhiteSpace);
		let newGroup = utils.fillMultiLines(item.group, multilineIndentAmount, item.leadingWhiteSpace);
		let newTag = utils.fillMultiLines(item.tag, multilineIndentAmount, item.leadingWhiteSpace);
		let newChannel = utils.fillMultiLines(item.channel, multilineIndentAmount, item.leadingWhiteSpace);
		let newComment = utils.fillMultiLines(item.comment, multilineIndentAmount, item.leadingWhiteSpace);

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

	formattedItem = formattedItem.trimRight();
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
		let newType = utils.fillColumns(thing.thing_type, thing.highestLengths[0]);
		let newBindingId = utils.fillColumns(thing.binding_id, thing.highestLengths[1]);
		let newTypeId = utils.fillColumns(thing.type_id, thing.highestLengths[2]);
		let newThingId = utils.fillColumns(thing.thing_id, thing.highestLengths[3]);
		let newLabel = utils.fillColumns(thing.label, thing.highestLengths[4]);
		let newLocation = utils.fillColumns(thing.location, thing.highestLengths[5]);
		let newParameters = utils.fillColumns(thing.parameters, thing.highestLengths[5]);

		// Add the leading whitespace (for group and subgroups)
		// Add tabs to string
		for (let i = 0; i < thing.leadingWhiteSpace; i++) {
			newType = "\t" + newType;
		}

		if (formatStyle === "ChannelColumn") {
			let tabs = "";
			let tabIndent = thing.highestLengths[0] + thing.highestLengths[1] + thing.highestLengths[2] + thing.highestLengths[3] + thing.highestLengths[4] + thing.highestLengths[5];

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
