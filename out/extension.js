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
// Regex patterns to match comment sections
const REGEX_COMMENT = /^\s*\/\/.*$/;
const REGEX_START_BLOCKCOMMENT = /^\s*\/\*.*$/;
const REGEX_END_BLOCKCOMMENT = /^.*\s*\*\/$/;
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
    // Use the console to output diagnostic information (console.log) and errors (console.error)
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
// Add new generic item
function commandInsertNewGenericItem() {
    insertItem(DEF_ITEM_TYPE, DEF_ITEM_NAME, DEF_ITEM_LABEL, DEF_ITEM_ICON, DEF_ITEM_GROUP, DEF_ITEM_TAG, DEF_ITEM_CHANNEL);
}
// Add new Switch item
function commandInsertNewSwitchItem() {
    insertItem("Switch", "_Switch", '"Label [%s]"', "<switch>", DEF_ITEM_GROUP, '["Switch"]', DEF_ITEM_CHANNEL);
}
// Add new Dimmer item
function commandInsertNewDimmerItem() {
    insertItem("Dimmer", "_Dimmer", '"Label [%s]"', "<dimmer>", DEF_ITEM_GROUP, '["Dimmer"]', DEF_ITEM_CHANNEL);
}
// Add new String item
function commandInsertNewStringItem() {
    insertItem("String", DEF_ITEM_NAME, '"Label [%s]"', "<text>", DEF_ITEM_GROUP, DEF_ITEM_TAG, DEF_ITEM_CHANNEL);
}
// Add new Number item
function commandInsertNewNumberItem() {
    insertItem("Number", DEF_ITEM_NAME, '"Label [%.0f]"', "<none>", DEF_ITEM_GROUP, DEF_ITEM_TAG, DEF_ITEM_CHANNEL);
}
// Add new DateTime item
function commandInsertNewDateTimeItem() {
    insertItem("DateTime", DEF_ITEM_NAME, '"Label [%1$tA, %1$tm/%1$td/%1$tY %1$tl:%1$tM %1$tp]"', "<time>", DEF_ITEM_GROUP, DEF_ITEM_TAG, DEF_ITEM_CHANNEL);
}
/**
 * Reformat the current file with the style selected in the settings
 */
function commandReformatFile() {
    return __awaiter(this, void 0, void 0, function* () {
        // Only execute if there's an active text editor
        if (!vscode.window.activeTextEditor) {
            return;
        }
        // Clear all edits
        clearTextEdits = [];
        textTextEdits = [];
        clearWorkEdit = new vscode.WorkspaceEdit();
        textWorkEdit = new vscode.WorkspaceEdit();
        // Reset maximum values
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
        // Clear all edits
        clearTextEdits = [];
        clearWorkEdit = new vscode.WorkspaceEdit();
        // Reset maximum values
        highestTypeLength = 0;
        highestNameLength = 0;
        highestLabelLength = 0;
        highestIconLength = 0;
        highestGroupLength = 0;
        highestTagLength = 0;
        highestChannelLength = 0;
        // Reset Block Comment Boolean
        isInBlockComment = false;
        let newLineCounter = 0;
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
        // Reset maximum values
        highestTypeLength = 0;
        highestNameLength = 0;
        highestLabelLength = 0;
        highestIconLength = 0;
        highestGroupLength = 0;
        highestTagLength = 0;
        highestChannelLength = 0;
        // Reset Block Comment Boolean
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
        }
        // Reformat each item line
        for (let index = 0; index < doc.lineCount; index++) {
            newPos = currentPos.with(index, 0);
            editor.selection = new vscode.Selection(newPos, newPos);
            let reformattedItem = reformatItem();
            if (reformattedItem !== "") {
                let selection = new vscode.Range(newPos, newPos.with(newPos.line, doc.lineAt(newPos.line).text.length));
                textTextEdits.push(vscode.TextEdit.replace(selection, reformattedItem));
            }
        }
        // Apply all clean and formatting Edits
        textWorkEdit.set(doc.uri, textTextEdits);
        yield vscode.workspace.applyEdit(textWorkEdit);
    });
}
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
    let formattedItem = formatItem(type, name, label, icon, group, tag, channel, 0);
    let selection = range;
    editor.edit(builder => {
        builder.replace(selection, formattedItem);
    });
    editor.selection = new vscode.Selection(newPos, newPos);
}
/**
 * Reformat one single item (one line)
 */
function reformatItem() {
    // Only execute if there's an active text editor
    if (!vscode.window.activeTextEditor) {
        return "";
    }
    // Define the basic vscode variables
    let doc = vscode.window.activeTextEditor.document;
    let editor = vscode.window.activeTextEditor;
    let currentPos = editor.selection.active;
    let newPos = currentPos.with(currentPos.line, 0);
    // Get Text of current line and check if there is a comment in it
    let lineText = doc.lineAt(newPos.line);
    var comment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_COMMENT);
    var blockComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_START_BLOCKCOMMENT);
    var endBlockComment = doc.getWordRangeAtPosition(newPos.with(newPos.line, 0), REGEX_END_BLOCKCOMMENT);
    // If line is empty or contains a comment continue to the next line
    if (lineText.text.length === 0 || lineText.isEmptyOrWhitespace) {
        return "";
    }
    else if (comment) {
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
    // Get the format configuration settings
    let config = vscode.workspace.getConfiguration("oh-alignment-tool");
    let preserveWhitespace = config.preserveWhitespace;
    // Position at start of line and get a range for the entire line
    editor.selection = new vscode.Selection(newPos, newPos);
    // Move to after the whitespace
    let leadingWhitespaceCount = lineText.firstNonWhitespaceCharacterIndex;
    newPos = newPos.with(newPos.line, leadingWhitespaceCount);
    if (preserveWhitespace === false) {
        // Set to 0 if not preserving leading whitespace
        leadingWhitespaceCount = 0;
    }
    // Discover item Type
    newPos = newPos.with(newPos.line, newPos.character + countWhitespace(doc, newPos));
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
function formatItem(type, name, label, icon, group, tag, channel, leadingWhitespaceCount) {
    // Get the format configuration settings
    let config = vscode.workspace.getConfiguration("oh-alignment-tool");
    let formatStyle = config.formatStyle;
    let newLineAfterItem = config.newLineAfterItem;
    let multilineIndentAmount = config.multilineIndentAmount;
    // Check for the formatting style in the user configuration
    if (formatStyle === "Column") {
        // Fill the required amount of tabs after each item part. For Column Style Formatting
        let newType = fillTabs(type, highestTypeLength);
        let newName = fillTabs(name, highestNameLength);
        let newLabel = fillTabs(label, highestLabelLength);
        let newIcon = fillTabs(icon, highestIconLength);
        let newGroup = fillTabs(group, highestGroupLength);
        let newTag = fillTabs(tag, highestTagLength);
        // Add the leading whitespace (for group and subgroups)
        for (let index = 0; index < leadingWhitespaceCount; index++) {
            newType = "\t" + newType;
        }
        // Build the formatted item and return it
        let formattedItem = newType + newName + newLabel + newIcon + newGroup + newTag + channel;
        return formattedItem;
    }
    else if (formatStyle === "Multiline") {
        // If item type is longer than the indent, make sure there's at least one space
        let typeNameIndent;
        if (type.length < multilineIndentAmount) {
            typeNameIndent = multiLineIndent(multilineIndentAmount - type.length);
        }
        else {
            typeNameIndent = multiLineIndent(1);
        }
        //Build the formatted item with new lines for every item part and return it
        let formattedItem = multiLineIndent(leadingWhitespaceCount) + type + typeNameIndent + name;
        // Check if item parts are empty
        formattedItem = label === "" ? formattedItem : formattedItem + "\n" + multiLineIndent(leadingWhitespaceCount + multilineIndentAmount) + label;
        formattedItem = icon === "" ? formattedItem : formattedItem + "\n" + multiLineIndent(leadingWhitespaceCount + multilineIndentAmount) + icon;
        formattedItem = group === "" ? formattedItem : formattedItem + "\n" + multiLineIndent(leadingWhitespaceCount + multilineIndentAmount) + group;
        formattedItem = tag === "" ? formattedItem : formattedItem + "\n" + multiLineIndent(leadingWhitespaceCount + multilineIndentAmount) + tag;
        formattedItem = channel === "" ? formattedItem : formattedItem + "\n" + multiLineIndent(leadingWhitespaceCount + multilineIndentAmount) + channel;
        // Insert a new line after the item if config says so
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
/**
 * Return a string containing 'number' spaces
 *
 * @param number
 */
function multiLineIndent(count) {
    let spaces = "";
    for (let i = 0; i < count; i++) {
        spaces = spaces + " ";
    }
    return spaces;
}
/**
 * This method is called when the extension is closed and deactivated
 */
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map