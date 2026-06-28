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
	}
];

export function getEventDefinition(name: string): SysmonEventDefinition | undefined {
	return SYSMON_EVENTS.find(event => event.name === name || event.tag === name);
}
