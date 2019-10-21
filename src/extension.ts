// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {


	const conditionops = vscode.languages.registerCompletionItemProvider(
		'smc',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				let linePrefix = document.lineAt(position).text.substr(0, position.character);
				if (!linePrefix.endsWith('condition="')) {
					return undefined;
				}

				return [
					// is,is not,contains,contains any,contains all,excludes,begin with,end with,less than,more than,image
					new vscode.CompletionItem('is', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('is not', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('contains', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('contains any', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('contains all', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('excludes', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('begin with', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('end with', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('less than', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('more than', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('image', vscode.CompletionItemKind.Method),
				];
			}
		},
		'"' // triggered whenever a '=' is being typed
	);

	const onmatch = vscode.languages.registerCompletionItemProvider(
		'smc',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				let linePrefix = document.lineAt(position).text.substr(0, position.character);
				if (!linePrefix.endsWith('onmatch="')) {
					return undefined;
				}

				return [
					// is,is not,contains,contains any,contains all,excludes,begin with,end with,less than,more than,image
					new vscode.CompletionItem('include', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('exclude', vscode.CompletionItemKind.Method),
				];
			}
		},
		'"' // triggered whenever a '=' is being typed
	);

	context.subscriptions.push(conditionops,onmatch);
}

// this method is called when your extension is deactivated
export function deactivate() {}
