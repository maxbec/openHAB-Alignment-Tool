"use strict";
/*---------------------------------------------------------------------------------------------
*  Copyright (c) Alessandro Fragnani. All rights reserved.
*  Licensed under the MIT License. See License.md in the project root for license information.
*--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueKind = exports.ChangeLogKind = void 0;
// changelog
var ChangeLogKind;
(function (ChangeLogKind) {
    ChangeLogKind["NEW"] = "NEW";
    ChangeLogKind["CHANGED"] = "CHANGED";
    ChangeLogKind["FIXED"] = "FIXED";
    ChangeLogKind["VERSION"] = "VERSION";
    ChangeLogKind["INTERNAL"] = "INTERNAL";
})(ChangeLogKind = exports.ChangeLogKind || (exports.ChangeLogKind = {}));
var IssueKind;
(function (IssueKind) {
    IssueKind["Issue"] = "Issue";
    IssueKind["PR"] = "PR";
})(IssueKind = exports.IssueKind || (exports.IssueKind = {}));
//# sourceMappingURL=ContentProvider.js.map