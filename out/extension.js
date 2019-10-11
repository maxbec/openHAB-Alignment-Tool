"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const REGEX_COMMENT = /^\s*\/\/.*$/;
const REGEX_START_BLOCKCOMMENT = /^\s*\/\*.*$/;
const REGEX_END_BLOCKCOMMENT = /^.*\s*\*\/$/;
// Regex patterns to match parts of item definition
const REGEX_ITEM_TYPE = /(Color|Contact|DateTime|Dimmer|Group|Image|Location|Number|Player|Rollershutter|String|Switch)(:\w+)?(:\w+\((\s*\w+)(,\s*\w+)*\s*\))?/;
const REGEX_ITEM_NAME = /[a-zA-Z0-9][a-zA-Z0-9_]*/;
const REGEX_ITEM_LABEL = /\".+?\"/;
const REGEX_ITEM_ICON = /<.+?>/;
const REGEX_ITEM_GROUP = /\(.+?\)/;
const REGEX_ITEM_TAG = /\[\s*(\".+?\")\s*(,\s*\".+?\"\s*)*]/;
const REGEX_ITEM_CHANNEL = /\{.+?\}/;
const HIGHEST_TYPE_LENGTH = 13; //Rollershutter
// Default item values
const DEF_ITEM_TYPE = "Type";
const DEF_ITEM_NAME = "Name";
const DEF_ITEM_LABEL = '"Label [%s]"';
const DEF_ITEM_ICON = "<icon>";
const DEF_ITEM_GROUP = "(group)";
const DEF_ITEM_TAG = '["tag"]';
const DEF_ITEM_CHANNEL = '{ channel="" }\n';
// Section lengths
let highestTypeLength = 0;
let highestNameLength = 0;
let highestLabelLength = 0;
let highestIconLength = 0;
let highestGroupLength = 0;
let highestTagLength = 0;
let highestChannelLength = 0;
let isInBlockComment = false;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "oh-itemizer" is now active!');
    // Reformat all items in the file
    vscode.commands.registerCommand("extension.reformat-file", () => {
        vscode.window.showInformationMessage("File gets formatted!");
        commandReformatFile();
    });
}
exports.activate = activate;
function commandReformatFile() {
    // Reset maximum values
    highestTypeLength = 0;
    highestNameLength = 0;
    highestLabelLength = 0;
    highestIconLength = 0;
    highestGroupLength = 0;
    highestTagLength = 0;
    highestChannelLength = 0;
    // Only execute if there's an active text editor
    if (!vscode.window.activeTextEditor) {
        return;
    }
    let doc = vscode.window.activeTextEditor.document;
    let editor = vscode.window.activeTextEditor;
    let currentPos = editor.selection.active;
    let newPos;
    for (let index = 0; index < doc.lineCount; index++) {
        newPos = currentPos.with(index, 0);
        editor.selection = new vscode.Selection(newPos, newPos);
        // Get the section lengths of each line with an item in it.
        getSectionLengths();
    }
    editor
        .edit(builder => {
        for (let index = 0; index < doc.lineCount; index++) {
            newPos = currentPos.with(index, 0);
            editor.selection = new vscode.Selection(newPos, newPos);
            let reformattedItem = reformatItem();
            if (reformattedItem !== "") {
                let selection = new vscode.Range(newPos, newPos.with(newPos.line, doc.lineAt(newPos.line).text.length));
                builder.replace(selection, reformattedItem);
            }
        }
    })
        .then(success => {
        let pos = new vscode.Position(0, 0);
        editor.selection = new vscode.Selection(pos, pos);
    })
        .then(undefined, err => {
        console.error(err);
    });
}
function getSectionLengths() {
    // Only execute if there's an active text editor
    if (!vscode.window.activeTextEditor) {
        return "";
    }
    let doc = vscode.window.activeTextEditor.document;
    let editor = vscode.window.activeTextEditor;
    let currentPos = editor.selection.active;
    // Current line must have something in it
    let lineText = doc.lineAt(currentPos.line);
    if (lineText.text.length === 0 || lineText.isEmptyOrWhitespace) {
        return "";
    }
    // Ignore comments
    var comment = doc.getWordRangeAtPosition(currentPos.with(currentPos.line, 0), REGEX_COMMENT);
    var blockComment = doc.getWordRangeAtPosition(currentPos.with(currentPos.line, 0), REGEX_START_BLOCKCOMMENT);
    var endBlockComment = doc.getWordRangeAtPosition(currentPos.with(currentPos.line, 0), REGEX_END_BLOCKCOMMENT);
    if (comment) {
        return "";
    }
    else if (blockComment && endBlockComment) {
        isInBlockComment = false;
        return "";
    }
    else if (blockComment) {
        isInBlockComment = true;
        return "";
    }
    else if (endBlockComment) {
        isInBlockComment = false;
        return "";
    }
    else if (isInBlockComment) {
        return "";
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
    // Position at start of line and get a range for the entire line
    let newPos = currentPos.with(currentPos.line, 0);
    editor.selection = new vscode.Selection(newPos, newPos);
    // Discover item Type
    var wordRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_TYPE);
    if (wordRange && wordRange.isSingleLine) {
        itemType = doc.getText(wordRange);
        highestTypeLength = itemType.length > highestTypeLength ? itemType.length : highestTypeLength;
        // FIXME console.log("Matched type: " + itemType);
        newPos = newPos.with(newPos.line, newPos.character + itemType.length);
        newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
        // Discover item Name
        var itemNameRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_NAME);
        if (itemNameRange && itemNameRange.isSingleLine) {
            itemName = doc.getText(itemNameRange);
            highestNameLength = itemName.length > highestNameLength ? itemName.length : highestNameLength;
            // FIXME console.log("Matched name: " + itemName);
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
        //console.log("Label: " + itemLabel);
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
}
function reformatItem() {
    // Only execute if there's an active text editor
    if (!vscode.window.activeTextEditor) {
        return "";
    }
    let doc = vscode.window.activeTextEditor.document;
    let editor = vscode.window.activeTextEditor;
    let currentPos = editor.selection.active;
    // Current line must have something in it
    let lineText = doc.lineAt(currentPos.line);
    if (lineText.text.length === 0 || lineText.isEmptyOrWhitespace) {
        return "";
    }
    // Ignore comments
    var comment = doc.getWordRangeAtPosition(currentPos.with(currentPos.line, 0), REGEX_COMMENT);
    if (comment) {
        return "";
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
    let config = vscode.workspace.getConfiguration("oh-itemizer");
    let preserveWhitespace = config.preserveWhitespace;
    // Position at start of line and get a range for the entire line
    let newPos = currentPos.with(currentPos.line, 0);
    editor.selection = new vscode.Selection(newPos, newPos);
    // Move to after the whitespace
    let leadingWhitespaceCount = lineText.firstNonWhitespaceCharacterIndex;
    newPos = newPos.with(newPos.line, leadingWhitespaceCount);
    if (preserveWhitespace === false) {
        // Set to 0 if not preserving leading whitespace
        leadingWhitespaceCount = 0;
    }
    // Discover item Type
    var wordRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_TYPE);
    if (wordRange && wordRange.isSingleLine) {
        itemType = doc.getText(wordRange);
        // FIXME console.log("Matched type: " + itemType);
        newPos = newPos.with(newPos.line, newPos.character + itemType.length);
        newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
        // Discover item Name
        var itemNameRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_NAME);
        if (itemNameRange && itemNameRange.isSingleLine) {
            itemName = doc.getText(itemNameRange);
            // FIXME console.log("Matched name: " + itemName);
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
        //console.log("Label: " + itemLabel);
        newPos = newPos.with(newPos.line, newPos.character + itemLabel.length);
        newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
    }
    // Discover item Icon
    let itemIconRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_ICON);
    if (itemIconRange && itemIconRange.isSingleLine) {
        itemIcon = doc.getText(itemIconRange);
        newPos = newPos.with(newPos.line, newPos.character + itemIcon.length);
        newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
    }
    // Discover item Group
    let itemGroupRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_GROUP);
    if (itemGroupRange && itemGroupRange.isSingleLine) {
        itemGroup = doc.getText(itemGroupRange);
        newPos = newPos.with(newPos.line, newPos.character + itemGroup.length);
        newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
    }
    // Discover item Tag
    let itemTagRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_TAG);
    if (itemTagRange && itemTagRange.isSingleLine) {
        itemTag = doc.getText(itemTagRange);
        //console.log("Tag: " + itemTag);
        newPos = newPos.with(newPos.line, newPos.character + itemTag.length);
        newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
    }
    // Discover item Channel
    let itemChannelRange = doc.getWordRangeAtPosition(newPos, REGEX_ITEM_CHANNEL);
    if (itemChannelRange && itemChannelRange.isSingleLine) {
        itemChannel = doc.getText(itemChannelRange);
        newPos = newPos.with(newPos.line, newPos.character + itemChannel.length);
        newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
    }
    // Return the reformatted version of the item
    return formatItem(itemType, itemName, itemLabel, itemIcon, itemGroup, itemTag, itemChannel, leadingWhitespaceCount);
}
function formatItem(type, name, label, icon, group, tag, channel, leadingWhitespaceCount) {
    let newType = fillTabs(type, highestTypeLength);
    let newName = fillTabs(name, highestNameLength);
    let newLabel = fillTabs(label, highestLabelLength);
    let newIcon = fillTabs(icon, highestIconLength);
    let newGroup = fillTabs(group, highestGroupLength);
    let newTag = fillTabs(tag, highestTagLength);
    for (let index = 0; index < leadingWhitespaceCount; index++) {
        newType = "\t" + newType;
    }
    let formattedItem = newType + newName + newLabel + newIcon + newGroup + newTag + channel;
    return formattedItem;
}
// Count the amount of whitespace starting at startPos
function countWhitespace(doc, startPos) {
    let whitespaceRange = doc.getWordRangeAtPosition(startPos, /[ \t]+/);
    if (whitespaceRange && whitespaceRange.isSingleLine) {
        return doc.getText(whitespaceRange).length;
    }
    return 0;
}
// Add spaces to fill column
function fillTabs(str, finalLength) {
    // Check it item is empty
    if (finalLength === 0) {
        return "";
    }
    // Only execute if there's an active text editor
    if (!vscode.window.activeTextEditor) {
        return "";
    }
    let editor = vscode.window.activeTextEditor;
    let tabSize = 0;
    let colLength = 0;
    let addedSpaces = 0;
    let addedTabs = 0;
    // Get the tab size setting of the current editor
    if (editor.options.tabSize !== undefined) {
        tabSize = +editor.options.tabSize;
    }
    // Check if indentation is done with tabs or spaces
    finalLength = (finalLength / tabSize) % 1 === 0 ? finalLength + 1 : finalLength;
    colLength = Math.ceil(finalLength / tabSize) * tabSize;
    addedSpaces = colLength - str.length;
    if (editor.options.insertSpaces === true) {
        for (let i = 0; i < addedSpaces; i++) {
            str = str + " ";
        }
    }
    else {
        addedTabs = Math.ceil(addedSpaces / tabSize);
        for (let e = 0; e < addedTabs; e++) {
            str = str + "\t";
        }
    }
    return str;
}
// Return a string of 'number' spaces
function indent(count) {
    let spaces = "";
    for (let i = 0; i < count; i++) {
        spaces = spaces + " ";
    }
    return spaces;
}
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map