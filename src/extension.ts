// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {
	CONDITION_OPERATORS,
	GROUP_RELATION_VALUES,
	ONMATCH_VALUES,
	SYSMON_EVENTS
} from './sysmonSchema';

export const CONDITION_COMPLETIONS = CONDITION_OPERATORS;
export const EVENT_TAG_COMPLETIONS = SYSMON_EVENTS.map(event => event.tag);
export const GROUP_RELATION_COMPLETIONS = GROUP_RELATION_VALUES;
export const ONMATCH_COMPLETIONS = ONMATCH_VALUES;

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

function toCompletionItems(values: string[]): vscode.CompletionItem[] {
	return values.map(value => new vscode.CompletionItem(value, vscode.CompletionItemKind.Method));
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const attributeCompletions = vscode.languages.registerCompletionItemProvider(
		'smc',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				const linePrefix = document.lineAt(position).text.substr(0, position.character);
				const values = getAttributeCompletions(linePrefix)
					|| getElementCompletions(document.getText(), linePrefix);

				if (!values) {
					return undefined;
				}

				return toCompletionItems(values);
			}
		},
		'"',
		'<'
	);

	context.subscriptions.push(attributeCompletions);
}

// this method is called when your extension is deactivated
export function deactivate() {}
