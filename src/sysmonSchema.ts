export interface SysmonFieldDefinition {
	name: string;
	description?: string;
}

export interface SysmonEventDefinition {
	name: string;
	eventId: number;
	tag: string;
	description?: string;
	fields: SysmonFieldDefinition[];
}

export const CONDITION_OPERATORS = [
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

export const ONMATCH_VALUES = [
	'include',
	'exclude'
];

export const GROUP_RELATION_VALUES = [
	'and',
	'or'
];

export const SYSMON_EVENTS: SysmonEventDefinition[] = [
	{
		name: 'ProcessCreate',
		eventId: 1,
		tag: 'ProcessCreate',
		description: 'Process creation event.',
		fields: [
			{ name: 'Image' },
			{ name: 'CommandLine' },
			{ name: 'ParentImage' },
			{ name: 'ParentCommandLine' },
			{ name: 'User' },
			{ name: 'IntegrityLevel' },
			{ name: 'CurrentDirectory' },
			{ name: 'Hashes' }
		]
	},
	{
		name: 'FileCreateTime',
		eventId: 2,
		tag: 'FileCreateTime',
		description: 'File creation time changed event.',
		fields: [
			{ name: 'Image' },
			{ name: 'TargetFilename' },
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
			{ name: 'Image' },
			{ name: 'DestinationIp' },
			{ name: 'DestinationHostname' },
			{ name: 'DestinationPort' },
			{ name: 'DestinationPortName' },
			{ name: 'SourceIp' },
			{ name: 'SourceHostname' },
			{ name: 'SourcePort' },
			{ name: 'Protocol' },
			{ name: 'User' }
		]
	},
	{
		name: 'ProcessTerminate',
		eventId: 5,
		tag: 'ProcessTerminate',
		description: 'Process terminated event.',
		fields: [
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
			{ name: 'Image' },
			{ name: 'ImageLoaded' },
			{ name: 'Hashes' },
			{ name: 'Signed' },
			{ name: 'Signature' },
			{ name: 'SignatureStatus' },
			{ name: 'Company' },
			{ name: 'Description' },
			{ name: 'Product' }
		]
	},
	{
		name: 'CreateRemoteThread',
		eventId: 8,
		tag: 'CreateRemoteThread',
		description: 'Remote thread created event.',
		fields: [
			{ name: 'SourceImage' },
			{ name: 'TargetImage' },
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
			{ name: 'SourceThreadId' },
			{ name: 'SourceImage' },
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
			{ name: 'Image' },
			{ name: 'TargetFilename' },
			{ name: 'User' }
		]
	},
	{
		name: 'RegistryEvent',
		eventId: 12,
		tag: 'RegistryEvent',
		description: 'Registry object event.',
		fields: [
			{ name: 'EventType' },
			{ name: 'Image' },
			{ name: 'TargetObject' },
			{ name: 'Details' },
			{ name: 'NewName' },
			{ name: 'User' }
		]
	},
	{
		name: 'FileCreateStreamHash',
		eventId: 15,
		tag: 'FileCreateStreamHash',
		description: 'File stream created event.',
		fields: [
			{ name: 'Image' },
			{ name: 'TargetFilename' },
			{ name: 'Hash' },
			{ name: 'User' }
		]
	},
	{
		name: 'PipeEvent',
		eventId: 17,
		tag: 'PipeEvent',
		description: 'Named pipe event.',
		fields: [
			{ name: 'EventType' },
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
			{ name: 'EventType' },
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
			{ name: 'User' },
			{ name: 'Image' },
			{ name: 'TargetFilename' },
			{ name: 'Hashes' }
		]
	},
	{
		name: 'FileExecutableDetected',
		eventId: 29,
		tag: 'FileExecutableDetected',
		description: 'Executable file creation detected event.',
		fields: [
			{ name: 'User' },
			{ name: 'Image' },
			{ name: 'TargetFilename' },
			{ name: 'Hashes' },
			{ name: 'IsExecutable' }
		]
	},
	{
		name: 'FileBlockShredding',
		eventId: 28,
		tag: 'FileBlockShredding',
		description: 'File shredding blocked event.',
		fields: [
			{ name: 'User' },
			{ name: 'Image' },
			{ name: 'TargetFilename' },
			{ name: 'Hashes' },
			{ name: 'IsExecutable' }
		]
	},
	{
		name: 'FileDeleteDetected',
		eventId: 26,
		tag: 'FileDeleteDetected',
		description: 'File delete detected event.',
		fields: [
			{ name: 'User' },
			{ name: 'Image' },
			{ name: 'TargetFilename' },
			{ name: 'Hashes' },
			{ name: 'IsExecutable' }
		]
	},
	{
		name: 'ClipboardChange',
		eventId: 24,
		tag: 'ClipboardChange',
		description: 'Clipboard content changed event.',
		fields: [
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
			{ name: 'ProcessGuid' },
			{ name: 'ProcessId' },
			{ name: 'Image' },
			{ name: 'Type' },
			{ name: 'User' }
		]
	}
];

export function getEventDefinition(name: string): SysmonEventDefinition | undefined {
	return SYSMON_EVENTS.find(event => event.name === name || event.tag === name);
}
