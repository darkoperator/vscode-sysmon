// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

export const CONDITION_COMPLETIONS = [
	'is',
	'is not',
	'is any',
	'contains',
	'contains any',
	'contains all',
	'excludes',
	'excludes any',
	'excludes all',
	'begin with',
	'not begin with',
	'end with',
	'not end with',
	'less than',
	'more than',
	'image'
];

export const ONMATCH_COMPLETIONS = [
	'include',
	'exclude'
];

export function getAttributeCompletions(linePrefix: string): string[] | undefined {
	if (linePrefix.endsWith('condition="')) {
		return CONDITION_COMPLETIONS;
	}

	if (linePrefix.endsWith('onmatch="')) {
		return ONMATCH_COMPLETIONS;
	}

	return undefined;
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
				const values = getAttributeCompletions(linePrefix);

				if (!values) {
					return undefined;
				}

				return toCompletionItems(values);
			}
		},
		'"'
	);

	context.subscriptions.push(attributeCompletions);
}

// this method is called when your extension is deactivated
export function deactivate() {}
