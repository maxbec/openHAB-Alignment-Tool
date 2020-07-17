"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const utils = require("./utils");
const Item = require("./item");
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
const REGEX_ITEM_CHANNEL_START = /\{\s*(\w*=".*"?,?\s*)+\}?/;
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
// Section lengths for items
var highestTypeLength = 0;
var highestNameLength = 0;
var highestLabelLength = 0;
var highestIconLength = 0;
var highestGroupLength = 0;
var highestTagLength = 0;
var highestChannelLength = 0;
// Section lengths for things
var highestThingTypeLength = 6;
var highestThingIdLength = 0;
var hightesThingLabelLength = 0;
var highestThingLocationLength = 0;
var highestThingParametersLength = 0;
// Comment Checker
let isInBlockComment = false;
function getDocumentRange(document) {
    var start = new vscode.Position(0, 0);
    var lastLine = document.lineCount - 1;
    var end = new vscode.Position(lastLine, document.lineAt(lastLine).text.length);
    return new vscode.Range(start, end);
}
/**
 * This function is calles when the extension is opened and activated
 * @param context
 */
function activate(context) {
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider("openhab", {
        provideDocumentFormattingEdits: (document, options, token) => {
            return formatItemFile();
        },
    }));
    context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider("openhab", {
        provideDocumentRangeFormattingEdits: (document, range, options, token) => {
            var start = new vscode.Position(0, 0);
            var end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
            return formatItemFile(range);
        },
    }));
}
exports.activate = activate;
/**
 * This method is called when the extension is closed and deactivated
 */
function deactivate() { }
exports.deactivate = deactivate;
/**
 * Format the whole file after cleaning and preparing it.
 */
function formatItemFile(range) {
    var result = [];
    // Get the section lengths of each line with an item in it.
    // Only execute if there's an active text editor
    if (!vscode.window.activeTextEditor) {
        return result;
    }
    // Define the basic vscode variables
    let doc = vscode.window.activeTextEditor.document;
    let editor = vscode.window.activeTextEditor;
    let currentPos = editor.selection.active;
    let newPos;
    let itemArray;
    itemArray = new Array();
    let itemPending = false;
    let channelPending = false;
    // Get the format configuration settings
    let config = vscode.workspace.getConfiguration("oh-alignment-tool");
    let preserveWhitespace = config.preserveWhitespace;
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
        // Check if there is leading Whitespace. If Yes add one in size of a tab.
        leadingWhiteSpace = lineText.firstNonWhitespaceCharacterIndex;
        if (preserveWhitespace === false) {
            leadingWhiteSpace = 0;
        }
        // If line is empty or contains a comment continue to the next line
        if (lineText.text.length === 0 || lineText.isEmptyOrWhitespace) {
            if (itemPending) {
                // Add the new item to the itemArray
                itemArray.push(new Item(new vscode.Range(firstPosition, lastPosition), leadingWhiteSpace, itemType, itemName, itemLabel, itemIcon, itemGroup, itemTag, itemChannel, itemComment));
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
        }
        else if (comment) {
            continue;
        }
        else if (blockComment && endBlockComment) {
            isInBlockComment = false;
            continue;
        }
        else if (blockComment) {
            isInBlockComment = true;
            continue;
        }
        else if (endBlockComment) {
            isInBlockComment = false;
            continue;
        }
        else if (isInBlockComment) {
            continue;
        }
        // Discover item Type
        // Count Whitespace or tabs at the begin of the line
        newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
        var wordRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_TYPE);
        if (wordRange && wordRange.isSingleLine) {
            if (itemPending) {
                // Add the new item to the itemArray
                itemArray.push(new Item(new vscode.Range(firstPosition, lastPosition), leadingWhiteSpace, itemType, itemName, itemLabel, itemIcon, itemGroup, itemTag, itemChannel, itemComment));
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
            highestTypeLength = itemType.length > highestTypeLength ? itemType.length : highestTypeLength;
            newPos = newPos.with(newPos.line, newPos.character + itemType.length);
            newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
            firstPosition = new vscode.Position(index, 0);
            itemPending = true;
            // Discover item Name
            var itemNameRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_NAME);
            if (itemNameRange && itemNameRange.isSingleLine) {
                itemName = doc.getText(itemNameRange);
                highestNameLength = itemName.length > highestNameLength ? itemName.length : highestNameLength;
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
            highestLabelLength = itemLabel.length > highestLabelLength ? itemLabel.length : highestLabelLength;
            newPos = newPos.with(newPos.line, newPos.character + itemLabel.length);
            newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
            lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
        }
        // Discover item Icon
        let itemIconRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_ICON);
        if (itemIconRange && itemIconRange.isSingleLine) {
            itemIcon = doc.getText(itemIconRange);
            highestIconLength = itemIcon.length > highestIconLength ? itemIcon.length : highestIconLength;
            newPos = newPos.with(newPos.line, newPos.character + itemIcon.length);
            newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
            lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
        }
        // Discover item Group
        let itemGroupRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_GROUP);
        if (itemGroupRange && itemGroupRange.isSingleLine) {
            itemGroup = doc.getText(itemGroupRange);
            highestGroupLength = itemGroup.length > highestGroupLength ? itemGroup.length : highestGroupLength;
            newPos = newPos.with(newPos.line, newPos.character + itemGroup.length);
            newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
            lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
        }
        // Discover item Tag
        let itemTagRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_TAG);
        if (itemTagRange && itemTagRange.isSingleLine) {
            itemTag = doc.getText(itemTagRange);
            highestTagLength = itemTag.length > highestTagLength ? itemTag.length : highestTagLength;
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
                if (!itemChannel.endsWith("}")) {
                    channelPending = true;
                }
                highestChannelLength = itemChannel.length > highestChannelLength ? itemChannel.length : highestChannelLength;
                newPos = newPos.with(newPos.line, newPos.character + itemChannel.length);
                newPos = newPos.with(newPos.line, newPos.character + utils.countWhitespace(doc, newPos));
                lastPosition = new vscode.Position(index, doc.lineAt(index).text.length);
            }
        }
        else {
            let itemChannelRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_CHANNEL_END);
            if (itemChannelRange && itemChannelRange.isSingleLine) {
                itemChannel += doc.getText(itemChannelRange).trimLeft();
                if (itemChannel.endsWith("}")) {
                    channelPending = false;
                }
                highestChannelLength = itemChannel.length > highestChannelLength ? itemChannel.length : highestChannelLength;
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
        itemArray.push(new Item(new vscode.Range(firstPosition, lastPosition), leadingWhiteSpace, itemType, itemName, itemLabel, itemIcon, itemGroup, itemTag, itemChannel, itemComment));
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
    // Convert the column lengths to tabs
    highestTypeLength = utils.generateTabFromSpaces(highestTypeLength);
    highestNameLength = utils.generateTabFromSpaces(highestNameLength);
    highestLabelLength = utils.generateTabFromSpaces(highestLabelLength);
    highestIconLength = utils.generateTabFromSpaces(highestIconLength);
    highestGroupLength = utils.generateTabFromSpaces(highestGroupLength);
    highestTagLength = utils.generateTabFromSpaces(highestTagLength);
    highestChannelLength = utils.generateTabFromSpaces(highestChannelLength);
    // Insert the newly formatted items
    itemArray.forEach(function (item) {
        let reformattedItem = formatItem(item);
        if (reformattedItem !== "") {
            result.push(vscode.TextEdit.replace(item.range, reformattedItem));
        }
    });
    return result;
}
function formatItem(item) {
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
        let newType = utils.fillColumns(item.type, highestTypeLength);
        let newName = utils.fillColumns(item.name, highestNameLength);
        let newLabel = utils.fillColumns(item.label, highestLabelLength);
        let newIcon = utils.fillColumns(item.icon, highestIconLength);
        let newGroup = utils.fillColumns(item.group, highestGroupLength);
        let newTag = utils.fillColumns(item.tag, highestTagLength);
        // Add the leading whitespace (for group and subgroups)
        // Add tabs to string
        for (let i = 0; i < item.leadingWhiteSpace; i++) {
            newType = "\t" + newType;
        }
        if (formatStyle === "ChannelColumn") {
            let tabs = "";
            let spaces = "";
            let tabIndent = highestTypeLength + highestNameLength + highestLabelLength + highestIconLength + highestGroupLength + highestTagLength;
            for (let i = 0; i < tabIndent; i++) {
                tabs = tabs + "\t";
            }
            var identResult = item.channel.match(/.*\="/g);
            let identCount = 0;
            if (identResult) {
                identCount = identResult[0].length;
                for (let e = 0; e < identCount; e++) {
                    spaces = spaces + " ";
                }
            }
            item.channel = item.channel.replace(/",\s*/g, '",\n' + tabs + " ");
            item.channel = item.channel.replace(/([^"]),\s*/g, "$1,\n" + tabs + spaces);
        }
        // Build the formatted item and return it
        if (item.comment !== "") {
            item.comment = "\t" + item.comment;
        }
        formattedItem = newType + newName + newLabel + newIcon + newGroup + newTag + item.channel + item.comment;
        // Multiline Format Style
    }
    else if (formatStyle === "Multiline") {
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
        }
        else {
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
    }
    else {
        // @todo add window message for user
        return "";
    }
    formattedItem = newLineAfterItem === false ? formattedItem : formattedItem + "\n";
    return formattedItem;
}
//# sourceMappingURL=extension.js.map