// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {
	CONDITION_OPERATORS,
	GROUP_RELATION_VALUES,
	ONMATCH_VALUES,
	SYSMON_EVENTS,
	SysmonEventDefinition
} from './sysmonSchema';

export const CONDITION_COMPLETIONS = CONDITION_OPERATORS;
export const EVENT_TAG_COMPLETIONS = SYSMON_EVENTS.map(event => event.tag);
export const GROUP_RELATION_COMPLETIONS = GROUP_RELATION_VALUES;
export const ONMATCH_COMPLETIONS = ONMATCH_VALUES;

export interface SysmonDiagnostic {
	message: string;
	severity: vscode.DiagnosticSeverity;
	start: number;
	end: number;
}

const STRUCTURAL_TAGS = [
	'EventFiltering',
	'RuleGroup',
	'Rule'
];

export function getAttributeCompletions(linePrefix: string): string[] | undefined {
	if (linePrefix.endsWith('condition="')) {
		return CONDITION_COMPLETIONS;
	}

	if (linePrefix.endsWith('onmatch="')) {
		return ONMATCH_COMPLETIONS;
	}

	if (linePrefix.endsWith('groupRelation="')) {
		return GROUP_RELATION_COMPLETIONS;
	}

	return undefined;
}

export function getElementCompletions(documentText: string, linePrefix: string): string[] | undefined {
	if (!linePrefix.endsWith('<')) {
		return undefined;
	}

	const lastEventFilteringOpen = documentText.lastIndexOf('<EventFiltering');
	const lastEventFilteringClose = documentText.lastIndexOf('</EventFiltering>');

	if (lastEventFilteringOpen === -1 || lastEventFilteringOpen < lastEventFilteringClose) {
		return undefined;
	}

	return EVENT_TAG_COMPLETIONS;
}

export function getFieldCompletions(documentText: string, linePrefix: string): string[] | undefined {
	if (!linePrefix.endsWith('<')) {
		return undefined;
	}

	let activeEventTagIndex = -1;
	let activeEventFields: string[] | undefined;

	for (const event of SYSMON_EVENTS) {
		const lastEventOpen = documentText.lastIndexOf(`<${event.tag}`);
		const lastEventClose = documentText.lastIndexOf(`</${event.tag}>`);

		if (lastEventOpen > lastEventClose && lastEventOpen > activeEventTagIndex) {
			activeEventTagIndex = lastEventOpen;
			activeEventFields = event.fields.map(field => field.name);
		}
	}

	return activeEventFields;
}

function isInsideOpenEventFiltering(documentText: string, offset: number): boolean {
	const textBeforeOffset = documentText.slice(0, offset);
	const lastEventFilteringOpen = textBeforeOffset.lastIndexOf('<EventFiltering');
	const lastEventFilteringClose = textBeforeOffset.lastIndexOf('</EventFiltering>');

	return lastEventFilteringOpen !== -1 && lastEventFilteringOpen > lastEventFilteringClose;
}

function isInsideComment(documentText: string, offset: number): boolean {
	const textBeforeOffset = documentText.slice(0, offset);
	const lastCommentOpen = textBeforeOffset.lastIndexOf('<!--');
	const lastCommentClose = textBeforeOffset.lastIndexOf('-->');

	return lastCommentOpen !== -1 && lastCommentOpen > lastCommentClose;
}

function getActiveEvent(documentText: string, offset: number): SysmonEventDefinition | undefined {
	const textBeforeOffset = documentText.slice(0, offset);
	let activeEventTagIndex = -1;
	let activeEvent: SysmonEventDefinition | undefined;

	for (const event of SYSMON_EVENTS) {
		const lastEventOpen = textBeforeOffset.lastIndexOf(`<${event.tag}`);
		const lastEventClose = textBeforeOffset.lastIndexOf(`</${event.tag}>`);

		if (lastEventOpen > lastEventClose && lastEventOpen > activeEventTagIndex) {
			activeEventTagIndex = lastEventOpen;
			activeEvent = event;
		}
	}

	return activeEvent;
}

export function getSysmonDiagnostics(documentText: string): SysmonDiagnostic[] {
	const diagnostics: SysmonDiagnostic[] = [];
	const knownEventTags = new Set(SYSMON_EVENTS.map(event => event.tag));
	const structuralTags = new Set(STRUCTURAL_TAGS);
	const tagPattern = /<([A-Za-z][A-Za-z0-9]*)\b[^>]*>/g;
	let match: RegExpExecArray | null;

	while ((match = tagPattern.exec(documentText)) !== null) {
		const tagName = match[1];
		const tagStart = match.index;
		const tagNameStart = tagStart + 1;
		const tagNameEnd = tagNameStart + tagName.length;

		if (!isInsideOpenEventFiltering(documentText, tagStart)) {
			continue;
		}

		if (isInsideComment(documentText, tagStart)) {
			continue;
		}

		const activeEvent = getActiveEvent(documentText, tagStart);

		if (activeEvent) {
			if (tagName === activeEvent.tag) {
				continue;
			}

			if (activeEvent.fields.some(field => field.name === tagName)) {
				continue;
			}

			diagnostics.push({
				message: `Unknown Sysmon field tag "${tagName}" for event "${activeEvent.tag}".`,
				severity: vscode.DiagnosticSeverity.Warning,
				start: tagNameStart,
				end: tagNameEnd
			});
			continue;
		}

		if (structuralTags.has(tagName) || knownEventTags.has(tagName)) {
			continue;
		}

		diagnostics.push({
			message: `Unknown Sysmon event tag "${tagName}".`,
			severity: vscode.DiagnosticSeverity.Warning,
			start: tagNameStart,
			end: tagNameEnd
		});
	}

	return diagnostics;
}

function toCompletionItems(values: string[]): vscode.CompletionItem[] {
	return values.map(value => new vscode.CompletionItem(value, vscode.CompletionItemKind.Method));
}

function toDiagnostic(document: vscode.TextDocument, diagnostic: SysmonDiagnostic): vscode.Diagnostic {
	return new vscode.Diagnostic(
		new vscode.Range(
			document.positionAt(diagnostic.start),
			document.positionAt(diagnostic.end)
		),
		diagnostic.message,
		diagnostic.severity
	);
}

function updateDiagnostics(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection) {
	if (document.languageId !== 'smc') {
		return;
	}

	diagnosticCollection.set(
		document.uri,
		getSysmonDiagnostics(document.getText()).map(diagnostic => toDiagnostic(document, diagnostic))
	);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const attributeCompletions = vscode.languages.registerCompletionItemProvider(
		'smc',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				const linePrefix = document.lineAt(position).text.substr(0, position.character);
				const documentText = document.getText();
				const values = getAttributeCompletions(linePrefix)
					|| getFieldCompletions(documentText, linePrefix)
					|| getElementCompletions(documentText, linePrefix);

				if (!values) {
					return undefined;
				}

				return toCompletionItems(values);
			}
		},
		'"',
		'<'
	);

	const diagnosticCollection = vscode.languages.createDiagnosticCollection('sysmon');

	for (const document of vscode.workspace.textDocuments) {
		updateDiagnostics(document, diagnosticCollection);
	}

	context.subscriptions.push(
		attributeCompletions,
		diagnosticCollection,
		vscode.workspace.onDidOpenTextDocument(document => updateDiagnostics(document, diagnosticCollection)),
		vscode.workspace.onDidChangeTextDocument(event => updateDiagnostics(event.document, diagnosticCollection)),
		vscode.workspace.onDidSaveTextDocument(document => updateDiagnostics(document, diagnosticCollection)),
		vscode.workspace.onDidCloseTextDocument(document => {
			if (document.languageId === 'smc') {
				diagnosticCollection.delete(document.uri);
			}
		})
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
