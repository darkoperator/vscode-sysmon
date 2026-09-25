// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { formatSysmonXml } from './formatter';
import {
	CONDITION_OPERATORS,
	GROUP_RELATION_VALUES,
	ONMATCH_VALUES,
	SYSMON_EVENTS,
	SysmonEventDefinition,
	SysmonSchemaDefinition,
	getSysmonSchema,
	getSysmonSchemaVersions,
	loadSysmonSchemaFromFile
} from './sysmonSchema';
import { XmlScan, openElementsBefore, scanDocument } from './xmlScanner';

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


interface CustomSchemaCacheEntry {
	resolvedPath: string;
	mtimeMs: number;
	platform: string | undefined;
	schema: SysmonSchemaDefinition;
}

let customSchemaCache: CustomSchemaCacheEntry | undefined;
let lastInvalidCustomSchemaPath: string | undefined;

function resolveCustomSchemaPath(customPath: string): string {
	if (path.isAbsolute(customPath)) {
		return customPath;
	}

	const folders = vscode.workspace.workspaceFolders;

	return folders && folders.length > 0
		? path.join(folders[0].uri.fsPath, customPath)
		: customPath;
}

// Load the user-provided schema, re-parsing only when the file's mtime changes.
function loadCustomSchema(resolvedPath: string, platform: string | undefined): SysmonSchemaDefinition | undefined {
	let stats: fs.Stats;

	try {
		stats = fs.statSync(resolvedPath);
	} catch {
		return undefined;
	}

	if (customSchemaCache
		&& customSchemaCache.resolvedPath === resolvedPath
		&& customSchemaCache.mtimeMs === stats.mtimeMs
		&& customSchemaCache.platform === platform) {
		return customSchemaCache.schema;
	}

	const schema = loadSysmonSchemaFromFile(resolvedPath, platform);

	if (schema) {
		customSchemaCache = { resolvedPath, mtimeMs: stats.mtimeMs, platform, schema };
	}

	return schema;
}

function getConfiguredSysmonSchema(): SysmonSchemaDefinition {
	const configuration = vscode.workspace.getConfiguration('sysmon');
	const platform = configuration.get<string>('platform');
	const schemaVersion = configuration.get<string>('schemaVersion');
	const customPath = configuration.get<string>('customSchemaPath');

	if (customPath && customPath.trim().length > 0) {
		const resolvedPath = resolveCustomSchemaPath(customPath.trim());
		const customSchema = loadCustomSchema(resolvedPath, platform);

		if (customSchema) {
			lastInvalidCustomSchemaPath = undefined;
			return customSchema;
		}

		if (lastInvalidCustomSchemaPath !== resolvedPath) {
			lastInvalidCustomSchemaPath = resolvedPath;
			vscode.window.showWarningMessage(
				`Sysmon: could not load custom schema "${resolvedPath}". Falling back to the built-in schema.`
			);
		}
	}

	return getSysmonSchema({ platform, schemaVersion });
}

// The deepest known event in an open-element stack, i.e. the event whose filter
// context the cursor (or a tag) sits inside.
function getEnclosingEvent(
	openElements: readonly string[],
	schema: SysmonSchemaDefinition
): SysmonEventDefinition | undefined {
	for (let index = openElements.length - 1; index >= 0; index--) {
		const event = schema.events.find(candidate => candidate.tag === openElements[index]);
		if (event) {
			return event;
		}
	}

	return undefined;
}

function getCompletionCursorOffset(
	documentText: string,
	cursorOffsetOrSchema: number | SysmonSchemaDefinition | undefined
): number {
	return typeof cursorOffsetOrSchema === 'number'
		? cursorOffsetOrSchema
		: documentText.length;
}

function getCompletionSchema(
	cursorOffsetOrSchema: number | SysmonSchemaDefinition | undefined,
	schema: SysmonSchemaDefinition | undefined
): SysmonSchemaDefinition {
	return typeof cursorOffsetOrSchema === 'object' && cursorOffsetOrSchema !== undefined
		? cursorOffsetOrSchema
		: schema || getSysmonSchema();
}

export function getAttributeCompletions(
	linePrefix: string,
	schema: SysmonSchemaDefinition = getSysmonSchema()
): readonly string[] | undefined {
	if (linePrefix.endsWith('condition="')) {
		return schema.conditionOperators;
	}

	if (linePrefix.endsWith('onmatch="')) {
		return ONMATCH_COMPLETIONS;
	}

	if (linePrefix.endsWith('groupRelation="')) {
		return GROUP_RELATION_COMPLETIONS;
	}

	return undefined;
}

export function getElementCompletions(
	documentText: string,
	linePrefix: string,
	cursorOffsetOrSchema?: number | SysmonSchemaDefinition,
	schema?: SysmonSchemaDefinition
): string[] | undefined {
	if (!linePrefix.endsWith('<')) {
		return undefined;
	}

	const openElements = openElementsBefore(scanDocument(documentText), getCompletionCursorOffset(documentText, cursorOffsetOrSchema));

	if (openElements.indexOf('EventFiltering') === -1) {
		return undefined;
	}

	return getCompletionSchema(cursorOffsetOrSchema, schema).events.map(event => event.tag);
}

export function getFieldCompletions(
	documentText: string,
	linePrefix: string,
	cursorOffsetOrSchema?: number | SysmonSchemaDefinition,
	schema?: SysmonSchemaDefinition
): string[] | undefined {
	if (!linePrefix.endsWith('<')) {
		return undefined;
	}

	const resolvedSchema = getCompletionSchema(cursorOffsetOrSchema, schema);
	const openElements = openElementsBefore(scanDocument(documentText), getCompletionCursorOffset(documentText, cursorOffsetOrSchema));
	const activeEvent = getEnclosingEvent(openElements, resolvedSchema);

	return activeEvent ? activeEvent.fields.map(field => field.name) : undefined;
}

function getAllowedAttributeValues(
	attributeName: string,
	schema: SysmonSchemaDefinition
): readonly string[] | undefined {
	if (attributeName === 'condition') {
		return schema.conditionOperators;
	}

	if (attributeName === 'onmatch') {
		return ONMATCH_VALUES;
	}

	if (attributeName === 'groupRelation') {
		return GROUP_RELATION_VALUES;
	}

	return undefined;
}

function getAttributeDiagnostics(
	scan: XmlScan,
	schema: SysmonSchemaDefinition
): SysmonDiagnostic[] {
	const diagnostics: SysmonDiagnostic[] = [];

	for (const tag of scan.tags) {
		for (const attribute of tag.attributes) {
			if (attribute.valueStart < 0) {
				continue;
			}

			const allowedValues = getAllowedAttributeValues(attribute.name, schema);

			if (!allowedValues || allowedValues.indexOf(attribute.value) !== -1) {
				continue;
			}

			diagnostics.push({
				message: `Invalid Sysmon ${attribute.name} value "${attribute.value}".`,
				severity: vscode.DiagnosticSeverity.Warning,
				start: attribute.valueStart,
				end: attribute.valueEnd
			});
		}
	}

	return diagnostics;
}

function getDuplicateOnmatchDiagnostics(
	scan: XmlScan,
	schema: SysmonSchemaDefinition
): SysmonDiagnostic[] {
	const diagnostics: SysmonDiagnostic[] = [];
	const knownEventTags = new Set(schema.events.map(event => event.tag));
	const seenByEvent = new Map<string, Set<string>>();

	for (const tag of scan.tags) {
		if (tag.kind === 'close' || !knownEventTags.has(tag.name)) {
			continue;
		}

		const openElements = openElementsBefore(scan, tag.tagStart);
		if (openElements.indexOf('EventFiltering') === -1 || getEnclosingEvent(openElements, schema)) {
			continue;
		}

		const onmatch = tag.attributes.find(attribute => attribute.name === 'onmatch');
		if (!onmatch || onmatch.valueStart < 0 || ONMATCH_VALUES.indexOf(onmatch.value) === -1) {
			continue;
		}

		const seenValues = seenByEvent.get(tag.name) || new Set<string>();
		if (seenValues.has(onmatch.value)) {
			diagnostics.push({
				message: `Duplicate Sysmon ${tag.name} filter with onmatch="${onmatch.value}". Only one ${onmatch.value} filter is allowed per event tag.`,
				severity: vscode.DiagnosticSeverity.Warning,
				start: onmatch.valueStart,
				end: onmatch.valueEnd
			});
			continue;
		}

		seenValues.add(onmatch.value);
		seenByEvent.set(tag.name, seenValues);
	}

	return diagnostics;
}

function getRootSchemaDiagnostics(
	scan: XmlScan,
	schema: SysmonSchemaDefinition
): SysmonDiagnostic[] {
	const diagnostics: SysmonDiagnostic[] = [];
	const supportedVersions = getSysmonSchemaVersions(schema.platform);

	for (const tag of scan.tags) {
		if (tag.name !== 'Sysmon') {
			continue;
		}

		const attribute = tag.attributes.find(candidate => candidate.name === 'schemaversion');

		if (!attribute || attribute.valueStart < 0 || supportedVersions.indexOf(attribute.value) !== -1) {
			continue;
		}

		diagnostics.push({
			message: `Unsupported Sysmon schema version "${attribute.value}". Supported versions: ${supportedVersions.join(', ')}.`,
			severity: vscode.DiagnosticSeverity.Warning,
			start: attribute.valueStart,
			end: attribute.valueEnd
		});
	}

	return diagnostics;
}

export function getSysmonDiagnostics(
	documentText: string,
	schema: SysmonSchemaDefinition = getSysmonSchema()
): SysmonDiagnostic[] {
	const scan = scanDocument(documentText);
	const diagnostics: SysmonDiagnostic[] = [];
	const knownEventTags = new Set(schema.events.map(event => event.tag));
	const structuralTags = new Set(STRUCTURAL_TAGS);

	for (const tag of scan.tags) {
		if (tag.kind === 'close') {
			continue;
		}

		const openElements = openElementsBefore(scan, tag.tagStart);

		if (openElements.indexOf('EventFiltering') === -1) {
			continue;
		}

		const tagName = tag.name;
		const activeEvent = getEnclosingEvent(openElements, schema);

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
				start: tag.nameStart,
				end: tag.nameEnd
			});
			continue;
		}

		if (structuralTags.has(tagName) || knownEventTags.has(tagName)) {
			continue;
		}

		diagnostics.push({
			message: `Unknown Sysmon event tag "${tagName}".`,
			severity: vscode.DiagnosticSeverity.Warning,
			start: tag.nameStart,
			end: tag.nameEnd
		});
	}

	return diagnostics
		.concat(getRootSchemaDiagnostics(scan, schema))
		.concat(getAttributeDiagnostics(scan, schema))
		.concat(getDuplicateOnmatchDiagnostics(scan, schema));
}

function toCompletionItems(values: readonly string[]): vscode.CompletionItem[] {
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

	const schema = getConfiguredSysmonSchema();

	diagnosticCollection.set(
		document.uri,
		getSysmonDiagnostics(document.getText(), schema).map(diagnostic => toDiagnostic(document, diagnostic))
	);
}

function getDocumentRange(document: vscode.TextDocument): vscode.Range {
	const lastLine = document.lineAt(document.lineCount - 1);

	return new vscode.Range(
		new vscode.Position(0, 0),
		lastLine.range.end
	);
}

function formatDocumentText(
	document: vscode.TextDocument,
	range: vscode.Range,
	options: vscode.FormattingOptions
): vscode.TextEdit[] {
	const formatted = formatSysmonXml(document.getText(range), {
		insertSpaces: options.insertSpaces,
		tabSize: options.tabSize
	});

	return [vscode.TextEdit.replace(range, formatted)];
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
					const schema = getConfiguredSysmonSchema();
					const cursorOffset = document.offsetAt(position);
					const values = getAttributeCompletions(linePrefix, schema)
						|| getFieldCompletions(documentText, linePrefix, cursorOffset, schema)
						|| getElementCompletions(documentText, linePrefix, cursorOffset, schema);

				if (!values) {
					return undefined;
				}

				return toCompletionItems(values);
			}
		},
		'"',
		'<'
	);

	const documentFormatter = vscode.languages.registerDocumentFormattingEditProvider(
		'smc',
		{
			provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions) {
				return formatDocumentText(document, getDocumentRange(document), options);
			}
		}
	);

	const rangeFormatter = vscode.languages.registerDocumentRangeFormattingEditProvider(
		'smc',
		{
			provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions) {
				return formatDocumentText(document, range, options);
			}
		}
	);

	const diagnosticCollection = vscode.languages.createDiagnosticCollection('sysmon');

	const refreshAllDiagnostics = () => {
		for (const document of vscode.workspace.textDocuments) {
			updateDiagnostics(document, diagnosticCollection);
		}
	};

	// Watch the user-provided schema file so edits to it refresh diagnostics live.
	// Re-created whenever sysmon.customSchemaPath changes.
	let customSchemaWatcher: vscode.FileSystemWatcher | undefined;

	const refreshCustomSchemaWatcher = () => {
		if (customSchemaWatcher) {
			customSchemaWatcher.dispose();
			customSchemaWatcher = undefined;
		}

		const customPath = vscode.workspace.getConfiguration('sysmon').get<string>('customSchemaPath');

		if (!customPath || customPath.trim().length === 0) {
			return;
		}

		const onCustomSchemaChanged = () => {
			customSchemaCache = undefined;
			lastInvalidCustomSchemaPath = undefined;
			refreshAllDiagnostics();
		};

		customSchemaWatcher = vscode.workspace.createFileSystemWatcher(resolveCustomSchemaPath(customPath.trim()));
		customSchemaWatcher.onDidChange(onCustomSchemaChanged);
		customSchemaWatcher.onDidCreate(onCustomSchemaChanged);
		customSchemaWatcher.onDidDelete(onCustomSchemaChanged);
	};

	refreshCustomSchemaWatcher();
	refreshAllDiagnostics();

	context.subscriptions.push(
		attributeCompletions,
		documentFormatter,
		rangeFormatter,
		diagnosticCollection,
		{ dispose: () => customSchemaWatcher && customSchemaWatcher.dispose() },
		vscode.workspace.onDidOpenTextDocument(document => updateDiagnostics(document, diagnosticCollection)),
		vscode.workspace.onDidChangeTextDocument(event => updateDiagnostics(event.document, diagnosticCollection)),
		vscode.workspace.onDidSaveTextDocument(document => updateDiagnostics(document, diagnosticCollection)),
		vscode.workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration('sysmon.customSchemaPath')) {
				customSchemaCache = undefined;
				lastInvalidCustomSchemaPath = undefined;
				refreshCustomSchemaWatcher();
			}

			if (!event.affectsConfiguration('sysmon.platform')
				&& !event.affectsConfiguration('sysmon.schemaVersion')
				&& !event.affectsConfiguration('sysmon.customSchemaPath')) {
				return;
			}

			refreshAllDiagnostics();
		}),
		vscode.workspace.onDidCloseTextDocument(document => {
			if (document.languageId === 'smc') {
				diagnosticCollection.delete(document.uri);
			}
		})
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
