"use strict";
/*---------------------------------------------------------------------------------------------
*  Copyright (c) Alessandro Fragnani. All rights reserved.
*  Licensed under the MIT License. See License.md in the project root for license information.
*--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsNewPageBuilder = void 0;
const fs = require("fs");
const semver = require("semver");
const ContentProvider_1 = require("./ContentProvider");
class WhatsNewPageBuilder {
    constructor(htmlFile) {
        this.htmlFile = fs.readFileSync(htmlFile).toString();
    }
    static newBuilder(htmlFile) {
        return new WhatsNewPageBuilder(htmlFile);
    }
    updateExtensionPublisher(publisher) {
        this.htmlFile = this.htmlFile.replace(/\$\{publisher\}/g, publisher);
        return this;
    }
    updateExtensionDisplayName(extensionDisplayName) {
        this.htmlFile = this.htmlFile.replace(/\$\{extensionDisplayName\}/g, extensionDisplayName);
        return this;
    }
    updateExtensionName(extensionName) {
        this.htmlFile = this.htmlFile.replace(/\$\{extensionName\}/g, extensionName);
        return this;
    }
    updateExtensionVersion(extensionVersion) {
        this.htmlFile = this.htmlFile.replace("${extensionVersion}", `${semver.major(extensionVersion)}.${semver.minor(extensionVersion)}`);
        return this;
    }
    updateRepositoryUrl(repositoryUrl) {
        this.htmlFile = this.htmlFile.replace(/\$\{repositoryUrl\}/g, repositoryUrl);
        this.repositoryUrl = repositoryUrl;
        return this;
    }
    updateRepositoryIssues(repositoryIssues) {
        this.htmlFile = this.htmlFile.replace("${repositoryIssues}", repositoryIssues);
        return this;
    }
    updateRepositoryHomepage(repositoryHomepage) {
        this.htmlFile = this.htmlFile.replace("${repositoryHomepage}", repositoryHomepage);
        return this;
    }
    updateCSS(cssUrl) {
        this.htmlFile = this.htmlFile.replace("${cssUrl}", cssUrl);
        return this;
    }
    updateHeader(header) {
        this.htmlFile = this.htmlFile.replace("${headerLogo}", header.logo.src);
        this.htmlFile = this.htmlFile.replace("${headerWidth}", header.logo.width.toString());
        this.htmlFile = this.htmlFile.replace("${headerHeight}", header.logo.height.toString());
        this.htmlFile = this.htmlFile.replace("${headerMessage}", header.message);
        return this;
    }
    updateChangeLog(changeLog) {
        let changeLogString = "";
        for (const cl of changeLog) {
            if (cl.kind === ContentProvider_1.ChangeLogKind.VERSION) {
                const cc = cl.detail;
                const borderTop = changeLogString === "" ? "" : "changelog__version__borders__top";
                changeLogString = changeLogString.concat(`<li class="changelog__version__borders ${borderTop}">
                        <span class="changelog__badge changelog__badge--version">${cc.releaseNumber}</span>
                        <span class="uppercase bold">${cc.releaseDate}</span>
                    </li>`);
            }
            else {
                const badge = this.getBadgeFromChangeLogKind(cl.kind);
                let message;
                if (typeof cl.detail === "string") {
                    message = cl.detail;
                }
                else {
                    const cc = cl.detail;
                    if (cc.kind === ContentProvider_1.IssueKind.Issue) {
                        message = `${cc.message}
                            (<a title="Open Issue #${cc.id}" 
                            href="${this.repositoryUrl}/issues/${cc.id}">Issue #${cc.id}</a>)`;
                    }
                    else {
                        message = `${cc.message}
                            (Thanks to ${cc.kudos} - <a title="Open PR #${cc.id}" 
                            href="${this.repositoryUrl}/pull/${cc.id}">PR #${cc.id}</a>)`;
                    }
                }
                changeLogString = changeLogString.concat(`<li><span class="changelog__badge changelog__badge--${badge}">${cl.kind}</span>
                        ${message}
                    </li>`);
            }
        }
        this.htmlFile = this.htmlFile.replace("${changeLog}", changeLogString);
        return this;
    }
    updateSponsors(sponsors) {
        if (!sponsors || sponsors.length === 0) {
            this.htmlFile = this.htmlFile.replace("${sponsors}", "");
            return this;
        }
        let sponsorsString = `<p>
          <h2>Sponsors</h2>`;
        for (const sp of sponsors) {
            if (sp.message) {
                sponsorsString = sponsorsString.concat(`<a title="${sp.title}" href="${sp.link}">
                    <img class="dark" src="${sp.image.light}" width="${sp.width}%"/>
                    <img class="light" src="${sp.image.dark}" width="${sp.width}%"/>
                    </a>
                    ${sp.message} 
                    ${sp.extra}<br><br>`);
            }
            else {
                sponsorsString = sponsorsString.concat(`<div align="center"><a title="${sp.title}" href="${sp.link}">
                    <img class="dark" src="${sp.image.light}" width="${sp.width}%"/>
                    <img class="light" src="${sp.image.dark}" width="${sp.width}%"/>
                    </a></div><br>`);
            }
        }
        sponsorsString = sponsorsString.concat("</p>");
        this.htmlFile = this.htmlFile.replace("${sponsors}", sponsorsString);
        return this;
    }
    updateSupportChannels(supportChannels) {
        if (supportChannels.length === 0) {
            this.htmlFile = this.htmlFile.replace("${supportChannels}", "");
            return this;
        }
        let supportChannelsString = `<div class="button-group button-group--support-alefragnani">`;
        for (const sc of supportChannels) {
            supportChannelsString = supportChannelsString.concat(`<a class="button button--flat-primary" title="${sc.title}" href="${sc.link}" target="_blank">
                    ${sc.message} 
                </a>`);
        }
        supportChannelsString = supportChannelsString.concat("</div>");
        this.htmlFile = this.htmlFile.replace("${supportChannels}", supportChannelsString);
        return this;
    }
    updateSocialMedias(socialMedias) {
        if (!socialMedias || socialMedias.length === 0) {
            this.htmlFile = this.htmlFile.replace("${socialMedias}", "");
            return this;
        }
        let socialMediasString = '';
        for (const sm of socialMedias) {
            socialMediasString = socialMediasString.concat(`<li><a title="${sm.title}" href="${sm.link}">${sm.title}</a></li>`);
        }
        this.htmlFile = this.htmlFile.replace("${socialMedias}", socialMediasString);
        return this;
    }
    build() {
        return this.htmlFile.toString();
    }
    getBadgeFromChangeLogKind(kind) {
        switch (kind) {
            case ContentProvider_1.ChangeLogKind.NEW:
                return "added";
            case ContentProvider_1.ChangeLogKind.CHANGED:
                return "changed";
            case ContentProvider_1.ChangeLogKind.FIXED:
                return "fixed";
            case ContentProvider_1.ChangeLogKind.INTERNAL:
                return "internal";
            default:
                return "internal";
        }
    }
}
exports.WhatsNewPageBuilder = WhatsNewPageBuilder;
//# sourceMappingURL=PageBuilder.js.map