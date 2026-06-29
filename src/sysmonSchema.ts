export interface SysmonFieldDefinition {
	readonly name: string;
	readonly description?: string;
}

export interface SysmonEventDefinition {
	readonly name: string;
	readonly eventId: number;
	readonly tag: string;
	readonly description?: string;
	readonly fields: readonly SysmonFieldDefinition[];
}

export type SysmonSchemaPlatform = 'windows';

export interface SysmonSchemaLookup {
	readonly platform?: string;
	readonly schemaVersion?: string;
}

export interface SysmonSchemaDefinition {
	readonly platform: SysmonSchemaPlatform;
	readonly schemaVersion: string;
	readonly binaryVersion: string;
	readonly conditionOperators: readonly string[];
	readonly events: readonly SysmonEventDefinition[];
}

const WINDOWS_CONDITION_OPERATORS = [
	'is',
	'is not',
	'contains',
	'contains any',
	'is any',
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

export const ONMATCH_VALUES = [
	'include',
	'exclude'
];

export const GROUP_RELATION_VALUES = [
	'and',
	'or'
];

const WINDOWS_SYSMON_EVENTS: SysmonEventDefinition[] = [
	{
		name: 'ProcessCreate',
		eventId: 1,
		tag: 'ProcessCreate',
		description: 'Process creation event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'Image' },
			{ name: 'FileVersion' },
			{ name: 'Description' },
			{ name: 'Product' },
			{ name: 'Company' },
			{ name: 'OriginalFileName' },
			{ name: 'CommandLine' },
			{ name: 'CurrentDirectory' },
			{ name: 'User' },
			{ name: 'LogonGuid' },
			{ name: 'LogonId' },
			{ name: 'TerminalSessionId' },
			{ name: 'IntegrityLevel' },
			{ name: 'Hashes' },
			{ name: 'ParentProcessGuid' },
			{ name: 'ParentProcessId' },
			{ name: 'ParentImage' },
			{ name: 'ParentCommandLine' },
			{ name: 'ParentUser' }
		]
	},
	{
		name: 'FileCreateTime',
		eventId: 2,
		tag: 'FileCreateTime',
		description: 'File creation time changed event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'Image' },
			{ name: 'TargetFilename' },
			{ name: 'CreationUtcTime' },
			{ name: 'PreviousCreationUtcTime' },
			{ name: 'User' }
		]
	},
	{
		name: 'NetworkConnect',
		eventId: 3,
		tag: 'NetworkConnect',
		description: 'Network connection event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'Image' },
			{ name: 'User' },
			{ name: 'Protocol' },
			{ name: 'Initiated' },
			{ name: 'SourceIsIpv6' },
			{ name: 'SourceIp' },
			{ name: 'SourceHostname' },
			{ name: 'SourcePort' },
			{ name: 'SourcePortName' },
			{ name: 'DestinationIsIpv6' },
			{ name: 'DestinationIp' },
			{ name: 'DestinationHostname' },
			{ name: 'DestinationPort' },
			{ name: 'DestinationPortName' }
		]
	},
	{
		name: 'ProcessTerminate',
		eventId: 5,
		tag: 'ProcessTerminate',
		description: 'Process terminated event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'Image' },
			{ name: 'User' }
		]
	},
	{
		name: 'DriverLoad',
		eventId: 6,
		tag: 'DriverLoad',
		description: 'Driver loaded event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ImageLoaded' },
			{ name: 'Hashes' },
			{ name: 'Signed' },
			{ name: 'Signature' },
			{ name: 'SignatureStatus' }
		]
	},
	{
		name: 'ImageLoad',
		eventId: 7,
		tag: 'ImageLoad',
		description: 'Image loaded into a process.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'Image' },
			{ name: 'ImageLoaded' },
			{ name: 'FileVersion' },
			{ name: 'Description' },
			{ name: 'Product' },
			{ name: 'Company' },
			{ name: 'OriginalFileName' },
			{ name: 'Hashes' },
			{ name: 'Signed' },
			{ name: 'Signature' },
			{ name: 'SignatureStatus' },
			{ name: 'User' }
		]
	},
	{
		name: 'CreateRemoteThread',
		eventId: 8,
		tag: 'CreateRemoteThread',
		description: 'Remote thread created event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'SourceProcessGuid' },
			{ name: 'SourceProcessId' },
			{ name: 'SourceImage' },
			{ name: 'TargetProcessGuid' },
			{ name: 'TargetProcessId' },
			{ name: 'TargetImage' },
			{ name: 'NewThreadId' },
			{ name: 'StartAddress' },
			{ name: 'StartModule' },
			{ name: 'StartFunction' },
			{ name: 'SourceUser' },
			{ name: 'TargetUser' }
		]
	},
	{
		name: 'RawAccessRead',
		eventId: 9,
		tag: 'RawAccessRead',
		description: 'Raw disk access read event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'Image' },
			{ name: 'Device' },
			{ name: 'User' }
		]
	},
	{
		name: 'ProcessAccess',
		eventId: 10,
		tag: 'ProcessAccess',
		description: 'Process access event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'SourceProcessGUID' },
			{ name: 'SourceProcessId' },
			{ name: 'SourceThreadId' },
			{ name: 'SourceImage' },
			{ name: 'TargetProcessGUID' },
			{ name: 'TargetProcessId' },
			{ name: 'TargetImage' },
			{ name: 'GrantedAccess' },
			{ name: 'CallTrace' },
			{ name: 'SourceUser' },
			{ name: 'TargetUser' }
		]
	},
	{
		name: 'FileCreate',
		eventId: 11,
		tag: 'FileCreate',
		description: 'File created event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'Image' },
			{ name: 'TargetFilename' },
			{ name: 'CreationUtcTime' },
			{ name: 'User' }
		]
	},
	{
		name: 'RegistryEvent',
		eventId: 12,
		tag: 'RegistryEvent',
		description: 'Registry object event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'EventType' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'Image' },
			{ name: 'TargetObject' },
			{ name: 'User' },
			{ name: 'Details' },
			{ name: 'NewName' }
		]
	},
	{
		name: 'FileCreateStreamHash',
		eventId: 15,
		tag: 'FileCreateStreamHash',
		description: 'File stream created event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'Image' },
			{ name: 'TargetFilename' },
			{ name: 'CreationUtcTime' },
			{ name: 'Hash' },
			{ name: 'Contents' },
			{ name: 'User' }
		]
	},
	{
		name: 'PipeEvent',
		eventId: 17,
		tag: 'PipeEvent',
		description: 'Named pipe event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'EventType' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'PipeName' },
			{ name: 'Image' },
			{ name: 'User' }
		]
	},
	{
		name: 'WmiEvent',
		eventId: 19,
		tag: 'WmiEvent',
		description: 'WMI event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'EventType' },
			{ name: 'UtcTime' },
			{ name: 'Operation' },
			{ name: 'User' },
			{ name: 'EventNamespace' },
			{ name: 'Name' },
			{ name: 'Query' },
			{ name: 'Type' },
			{ name: 'Destination' },
			{ name: 'Consumer' },
			{ name: 'Filter' }
		]
	},
	{
		name: 'DnsQuery',
		eventId: 22,
		tag: 'DnsQuery',
		description: 'DNS query event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'QueryName' },
			{ name: 'QueryStatus' },
			{ name: 'QueryResults' },
			{ name: 'Image' },
			{ name: 'User' }
		]
	},
	{
		name: 'FileDelete',
		eventId: 23,
		tag: 'FileDelete',
		description: 'File deleted and archived event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'User' },
			{ name: 'Image' },
			{ name: 'TargetFilename' },
			{ name: 'Hashes' },
			{ name: 'IsExecutable' },
			{ name: 'Archived' }
		]
	},
	{
		name: 'ClipboardChange',
		eventId: 24,
		tag: 'ClipboardChange',
		description: 'Clipboard content changed event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'Image' },
			{ name: 'Session' },
			{ name: 'Hashes' },
			{ name: 'ClientInfo' },
			{ name: 'Archived' },
			{ name: 'User' }
		]
	},
	{
		name: 'ProcessTampering',
		eventId: 25,
		tag: 'ProcessTampering',
		description: 'Process image tampering event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'Image' },
			{ name: 'Type' },
			{ name: 'User' }
		]
	},
	{
		name: 'FileDeleteDetected',
		eventId: 26,
		tag: 'FileDeleteDetected',
		description: 'File delete detected event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'User' },
			{ name: 'Image' },
			{ name: 'TargetFilename' },
			{ name: 'Hashes' },
			{ name: 'IsExecutable' }
		]
	},
	{
		name: 'FileBlockExecutable',
		eventId: 27,
		tag: 'FileBlockExecutable',
		description: 'Executable file creation blocked event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'User' },
			{ name: 'Image' },
			{ name: 'TargetFilename' },
			{ name: 'Hashes' }
		]
	},
	{
		name: 'FileBlockShredding',
		eventId: 28,
		tag: 'FileBlockShredding',
		description: 'File shredding blocked event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'User' },
			{ name: 'Image' },
			{ name: 'TargetFilename' },
			{ name: 'Hashes' },
			{ name: 'IsExecutable' }
		]
	},
	{
		name: 'FileExecutableDetected',
		eventId: 29,
		tag: 'FileExecutableDetected',
		description: 'Executable file creation detected event.',
		fields: [
			{ name: 'RuleName' },
			{ name: 'UtcTime' },
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'User' },
			{ name: 'Image' },
			{ name: 'TargetFilename' },
			{ name: 'Hashes' }
		]
	}
];

export const DEFAULT_SYSMON_SCHEMA_VERSION = '4.91';
export const DEFAULT_SYSMON_SCHEMA_PLATFORM: SysmonSchemaPlatform = 'windows';

function freezeField(field: SysmonFieldDefinition): SysmonFieldDefinition {
	const clone = field.description === undefined
		? { name: field.name }
		: { name: field.name, description: field.description };

	return Object.freeze(clone);
}

function freezeFields(fields: readonly SysmonFieldDefinition[]): readonly SysmonFieldDefinition[] {
	return Object.freeze(fields.map(field => freezeField(field)));
}

function freezeEvent(event: SysmonEventDefinition): SysmonEventDefinition {
	const clone = event.description === undefined
		? {
			name: event.name,
			eventId: event.eventId,
			tag: event.tag,
			fields: freezeFields(event.fields)
		}
		: {
			name: event.name,
			eventId: event.eventId,
			tag: event.tag,
			description: event.description,
			fields: freezeFields(event.fields)
		};

	return Object.freeze(clone);
}

function freezeEvents(events: readonly SysmonEventDefinition[]): readonly SysmonEventDefinition[] {
	return Object.freeze(events.map(event => freezeEvent(event)));
}

function createWindowsSchema(schemaVersion: string): SysmonSchemaDefinition {
	return Object.freeze({
		platform: 'windows',
		schemaVersion,
		binaryVersion: '18',
		conditionOperators: Object.freeze(WINDOWS_CONDITION_OPERATORS.slice()),
		events: freezeEvents(WINDOWS_SYSMON_EVENTS)
	});
}

export const SYSMON_SCHEMAS: readonly SysmonSchemaDefinition[] = Object.freeze([
	createWindowsSchema('4.91'),
	createWindowsSchema('4.90')
]);

function getDefaultSysmonSchema(): SysmonSchemaDefinition {
	const schema = SYSMON_SCHEMAS.find(candidate =>
		candidate.platform === DEFAULT_SYSMON_SCHEMA_PLATFORM
		&& candidate.schemaVersion === DEFAULT_SYSMON_SCHEMA_VERSION
	);

	if (!schema) {
		throw new Error(`Default Sysmon schema ${DEFAULT_SYSMON_SCHEMA_PLATFORM}:${DEFAULT_SYSMON_SCHEMA_VERSION} is not registered.`);
	}

	return schema;
}

export function getSysmonSchemaPlatforms(): readonly SysmonSchemaPlatform[] {
	const platforms = SYSMON_SCHEMAS.map(schema => schema.platform);

	return platforms.filter((platform, index) => platforms.indexOf(platform) === index);
}

export function getSysmonSchemaVersions(platform: string = DEFAULT_SYSMON_SCHEMA_PLATFORM): readonly string[] {
	return SYSMON_SCHEMAS
		.filter(schema => schema.platform === platform)
		.map(schema => schema.schemaVersion);
}

function getSchemaPlatform(platform: string | undefined): SysmonSchemaPlatform {
	return platform !== undefined && getSysmonSchemaPlatforms().indexOf(platform as SysmonSchemaPlatform) !== -1
		? platform as SysmonSchemaPlatform
		: DEFAULT_SYSMON_SCHEMA_PLATFORM;
}

function getDefaultSchemaVersion(platform: SysmonSchemaPlatform): string {
	const versions = getSysmonSchemaVersions(platform);

	if (platform === DEFAULT_SYSMON_SCHEMA_PLATFORM && versions.indexOf(DEFAULT_SYSMON_SCHEMA_VERSION) !== -1) {
		return DEFAULT_SYSMON_SCHEMA_VERSION;
	}

	return versions[0] || DEFAULT_SYSMON_SCHEMA_VERSION;
}

function isKnownSchemaPlatform(platform: string | undefined): boolean {
	return platform === undefined || getSysmonSchemaPlatforms().indexOf(platform as SysmonSchemaPlatform) !== -1;
}

function getSchemaVersion(platform: SysmonSchemaPlatform, schemaVersion: string | undefined, useRequestedVersion: boolean): string {
	const versions = getSysmonSchemaVersions(platform);

	return useRequestedVersion && schemaVersion !== undefined && versions.indexOf(schemaVersion) !== -1
		? schemaVersion
		: getDefaultSchemaVersion(platform);
}

export function getSysmonSchema(lookup: SysmonSchemaLookup = {}): SysmonSchemaDefinition {
	const platform = getSchemaPlatform(lookup.platform);
	const schemaVersion = getSchemaVersion(platform, lookup.schemaVersion, isKnownSchemaPlatform(lookup.platform));
	const schema = SYSMON_SCHEMAS.find(candidate =>
		candidate.platform === platform
		&& candidate.schemaVersion === schemaVersion
	);

	return schema || getDefaultSysmonSchema();
}

const DEFAULT_SYSMON_SCHEMA = getDefaultSysmonSchema();

export const SYSMON_SCHEMA_PLATFORM = DEFAULT_SYSMON_SCHEMA.platform;
export const SYSMON_SCHEMA_VERSION = DEFAULT_SYSMON_SCHEMA.schemaVersion;
export const SYSMON_BINARY_VERSION = DEFAULT_SYSMON_SCHEMA.binaryVersion;
export const CONDITION_OPERATORS = DEFAULT_SYSMON_SCHEMA.conditionOperators;
export const SYSMON_EVENTS = DEFAULT_SYSMON_SCHEMA.events;

export function getEventDefinition(name: string): SysmonEventDefinition | undefined {
	return SYSMON_EVENTS.find(event => event.name === name || event.tag === name);
}
