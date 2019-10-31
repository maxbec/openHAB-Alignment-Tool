"use strict";
/**
 * openHAB Alignment Tool
 *
 * @todo Complete Header description and tags.
 * @author Max Beckenbauer
 *
 * Credits to Mark Hilbush and his openHAB Formatter extension.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**----------------------------------------------------------------------------------------------------------
 * HEADER SECTION
 *---------------------------------------------------------------------------------------------------------*/
const vscode = require("vscode");
const Item = require("./item");
// Regex patterns to match comment sections
const REGEX_COMMENT = /^\s*\/\/.*$/;
const REGEX_START_BLOCKCOMMENT = /^\s*\/\*.*$/;
const REGEX_END_BLOCKCOMMENT = /^.*\s*\*\/$/;
const REGEX_EOL_COMMENT = /\/\/.*/;
// Regex patterns to match parts of item definition
const REGEX_ITEM_TYPE = /(Color|Contact|DateTime|Dimmer|Group|Image|Location|Number|Player|Rollershutter|String|Switch)(:\w+)?(:\w+)?(\(\w+,\s*\w+\))?(\(".*"\))?/;
const REGEX_ITEM_NAME = /[a-zA-Z0-9][a-zA-Z0-9_]*/;
const REGEX_ITEM_LABEL = /\".+?\"/;
const REGEX_ITEM_ICON = /<.+?>/;
const REGEX_ITEM_GROUP = /\(.+?\)/;
const REGEX_ITEM_TAG = /\[\s*(\".+?\")\s*(,\s*\".+?\"\s*)*]/;
const REGEX_ITEM_CHANNEL = /\{.+?\}/;
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
// Text and Workspace Edits for the "Prepare and Clean" and "Edit" procedures
let clearTextEdits = [];
let textTextEdits = [];
let clearWorkEdit = new vscode.WorkspaceEdit();
let textWorkEdit = new vscode.WorkspaceEdit();
/**----------------------------------------------------------------------------------------------------------
 * COMMAND SECTION
 *---------------------------------------------------------------------------------------------------------*/
/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 *
 * @param context
 */
function activate(context) {
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
}
exports.activate = activate;
/**
 * Insert new generic item at present cursor line
 */
function commandInsertNewGenericItem() {
    insertItem(DEF_ITEM_TYPE, DEF_ITEM_NAME, DEF_ITEM_LABEL, DEF_ITEM_ICON, DEF_ITEM_GROUP, DEF_ITEM_TAG, DEF_ITEM_CHANNEL);
}
/**
 * Insert new switch item at present cursor line
 */ function commandInsertNewSwitchItem() {
    insertItem("Switch", "_Switch", '"Label [%s]"', "<switch>", DEF_ITEM_GROUP, '["Switch"]', DEF_ITEM_CHANNEL);
}
/**
 * Insert new dimmer item at present cursor line
 */ function commandInsertNewDimmerItem() {
    insertItem("Dimmer", "_Dimmer", '"Label [%s]"', "<dimmer>", DEF_ITEM_GROUP, '["Dimmer"]', DEF_ITEM_CHANNEL);
}
/**
 * Insert new string item at present cursor line
 */ function commandInsertNewStringItem() {
    insertItem("String", DEF_ITEM_NAME, '"Label [%s]"', "<text>", DEF_ITEM_GROUP, DEF_ITEM_TAG, DEF_ITEM_CHANNEL);
}
/**
 * Insert new number item at present cursor line
 */ function commandInsertNewNumberItem() {
    insertItem("Number", DEF_ITEM_NAME, '"Label [%.0f]"', "<none>", DEF_ITEM_GROUP, DEF_ITEM_TAG, DEF_ITEM_CHANNEL);
}
/**
 * Insert new datetime item at present cursor line
 */ function commandInsertNewDateTimeItem() {
    insertItem("DateTime", DEF_ITEM_NAME, '"Label [%1$tA, %1$tm/%1$td/%1$tY %1$tl:%1$tM %1$tp]"', "<time>", DEF_ITEM_GROUP, DEF_ITEM_TAG, DEF_ITEM_CHANNEL);
}
/**
 * Reformat the current file with the style selected in the settings.
 */
function commandReformatFile() {
    return __awaiter(this, void 0, void 0, function* () {
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
        yield cleanAndPrepareFile();
        // Format the file
        yield formatFile();
    });
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
function insertItem(type, name, label, icon, group, tag, channel) {
    // Only execute if there's an active text editor
    if (!vscode.window.activeTextEditor) {
        return;
    }
    // Go to beginning of the line, then get an empty range
    let editor = vscode.window.activeTextEditor;
    let newPos = new vscode.Position(editor.selection.active.line, 0);
    editor.selection = new vscode.Selection(newPos, newPos);
    let range = new vscode.Range(newPos, newPos.with(newPos.line, 0));
    let item = new Item(editor.selection.active.line, false, type, name, label, icon, group, tag, channel);
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
function cleanAndPrepareFile() {
    return __awaiter(this, void 0, void 0, function* () {
        // Only execute if there's an active text editor
        if (!vscode.window.activeTextEditor) {
            return;
        }
        // Define the basic vscode variables
        let doc = vscode.window.activeTextEditor.document;
        let editor = vscode.window.activeTextEditor;
        let currentPos = editor.selection.active;
        let newPos;
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
            }
            else if (comment) {
                newLineCounter = 0;
                continue;
            }
            else if (blockComment && endBlockComment) {
                isInBlockComment = false;
                newLineCounter = 0;
                continue;
            }
            else if (blockComment) {
                isInBlockComment = true;
                newLineCounter = 0;
                continue;
            }
            else if (endBlockComment) {
                isInBlockComment = false;
                newLineCounter = 0;
                continue;
            }
            else if (isInBlockComment) {
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
            }
            else {
                // Select the \n mark at the end of the line => Delete all new lines in item definitions
                let newRange = new vscode.Range(newPos.line - 1, doc.lineAt(newPos.line - 1).text.length, newPos.line, 0);
                clearTextEdits.push(vscode.TextEdit.delete(newRange));
                // Reset new Line counter
                newLineCounter = 0;
            }
        }
        // Apply all clean edits
        clearWorkEdit.set(doc.uri, clearTextEdits);
        yield vscode.workspace.applyEdit(clearWorkEdit);
    });
}
/**
 * Format the whole file after cleaning and preparing it.
 */
function formatFile() {
    return __awaiter(this, void 0, void 0, function* () {
        // Get the section lengths of each line with an item in it.
        // Only execute if there's an active text editor
        if (!vscode.window.activeTextEditor) {
            return;
        }
        // Define the basic vscode variables
        let doc = vscode.window.activeTextEditor.document;
        let editor = vscode.window.activeTextEditor;
        let currentPos = editor.selection.active;
        let newPos;
        let itemArray;
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
            // Check if there is leading Whitespace. If Yes add one in tabsize.
            let leadingWhiteSpace = false;
            let leadingWhitespaceCount = lineText.firstNonWhitespaceCharacterIndex;
            if (preserveWhitespace === false) {
                leadingWhiteSpace = false;
            }
            else if (leadingWhitespaceCount > 0) {
                leadingWhiteSpace = true;
            }
            // Discover item Type
            // Count Whitespace or tabs at the begin of the line
            newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
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
        itemArray.forEach(function (item) {
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
        yield vscode.workspace.applyEdit(textWorkEdit);
    });
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
function formatItem(item) {
    // Get the configuration settings
    let config = vscode.workspace.getConfiguration("oh-alignment-tool");
    let formatStyle = config.formatStyle;
    let newLineAfterItem = config.newLineAfterItem;
    let multilineIndentAmount = config.multilineIndentAmount;
    let editor = vscode.window.activeTextEditor;
    let leadingWhiteSpace = item.leadingWhiteSpace ? "\t" : "";
    // Only execute if there's an active text editor
    if (!editor) {
        return "";
    }
    // Check for the formatting style in the user configuration
    if (formatStyle === "Column") {
        // Fill the required amount of tabs after each item part. For Column Style Formatting
        let newType = fillColumns(item.type, highestTypeLength);
        let newName = fillColumns(item.name, highestNameLength);
        let newLabel = fillColumns(item.label, highestLabelLength);
        let newIcon = fillColumns(item.icon, highestIconLength);
        let newGroup = fillColumns(item.group, highestGroupLength);
        let newTag = fillColumns(item.tag, highestTagLength);
        // Add the leading whitespace (for group and subgroups)
        newType = item.leadingWhiteSpace ? "\t" + newType : newType;
        // Build the formatted item and return it
        let formattedItem = newType + newName + newLabel + newIcon + newGroup + newTag + item.channel + "\t" + item.comment;
        return formattedItem;
        // Multiline Format Style
    }
    else if (formatStyle === "Multiline") {
        // If item type is longer than the indent, make sure there's at least one space
        let typeNameIndent = "";
        let tabSize = 0;
        // Get the tab size setting of the current editor
        if (editor.options.tabSize !== undefined) {
            tabSize = +editor.options.tabSize;
        }
        // Check if Indent Amount is smaller than item type
        if (generateTabFromSpaces(item.type.length) > multilineIndentAmount) {
            typeNameIndent = typeNameIndent + "\t";
            multilineIndentAmount = generateTabFromSpaces(item.type.length);
        }
        else {
            let gapSize = multilineIndentAmount - Math.floor(item.type.length / tabSize);
            for (let index = 0; index < gapSize; index++) {
                typeNameIndent = typeNameIndent + "\t";
            }
        }
        // Check if item parts are empty
        let newLabel = fillMultiLines(item.label, multilineIndentAmount, leadingWhiteSpace);
        let newIcon = fillMultiLines(item.icon, multilineIndentAmount, leadingWhiteSpace);
        let newGroup = fillMultiLines(item.group, multilineIndentAmount, leadingWhiteSpace);
        let newTag = fillMultiLines(item.tag, multilineIndentAmount, leadingWhiteSpace);
        let newChannel = fillMultiLines(item.channel, multilineIndentAmount, leadingWhiteSpace);
        let newComment = fillMultiLines(item.comment, multilineIndentAmount, leadingWhiteSpace);
        // Insert a new line after the item if config says so
        let formattedItem = leadingWhiteSpace + item.type + typeNameIndent + item.name + newLabel + newIcon + newGroup + newTag + newChannel + newComment;
        formattedItem = newLineAfterItem === false ? formattedItem : formattedItem + "\n";
        return formattedItem;
    }
    else {
        // @todo add window message for user
        return "";
    }
}
/**
 * Count the amount of whitespace starting at startPos
 *
 * @param doc
 * @param startPos
 */
function countWhitespace(doc, startPos) {
    let whitespaceRange = doc.getWordRangeAtPosition(startPos, /[ \t]+/);
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
function fillColumns(str, finalLength) {
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
function fillMultiLines(str, indenAmount, leadingWhiteSpace) {
    let editor = vscode.window.activeTextEditor;
    let gap = "";
    // Only execute if there's an active text editor
    if (!editor) {
        return "";
    }
    // Add tabs to string
    for (let i = 0; i < indenAmount; i++) {
        gap = gap + "\t";
    }
    str = str === "" ? str : "\n" + leadingWhiteSpace + gap + str;
    return str;
}
function generateTabFromSpaces(spaces) {
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
    // Add one space if spaces / tabsize is an even number
    spaces = (spaces / tabSize) % 1 === 0 ? spaces + 1 : spaces;
    return Math.ceil(spaces / tabSize);
}
/**
 * This method is called when the extension is closed and deactivated
 */
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map