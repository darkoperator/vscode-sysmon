import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import {
	CONDITION_OPERATORS,
	getSysmonSchema,
	getSysmonSchemaVersions
} from '../../sysmonSchema';

suite('Sysmon Snippets', () => {
	function getSnippets(): any {
		const snippetsPath = path.resolve(__dirname, '../../../snippets/smc.json');
		return JSON.parse(fs.readFileSync(snippetsPath, 'utf8'));
	}

	function bodyLines(snippet: any): string[] {
		return Array.isArray(snippet.body) ? snippet.body : [snippet.body];
	}

	test('config snippet schema-version pickers match the schema registry', () => {
		const snippets = getSnippets();

		assert.strictEqual(
			snippets['Template Sysmon Config'].body[0],
			`<Sysmon schemaversion="\${1|${getSysmonSchemaVersions('windows').join(',')}|}">`
		);
		assert.strictEqual(
			snippets['Template Sysmon Linux_Config'].body[0],
			`<Sysmon schemaversion="\${1|${getSysmonSchemaVersions('linux').join(',')}|}">`
		);
	});

	test('every condition picker in the snippets matches the schema condition operators', () => {
		const snippets = getSnippets();
		const expected = CONDITION_OPERATORS.join(',');
		const conditionPicker = /condition="\$\{\d+\|([^|]*)\|}"/;
		let pickers = 0;

		for (const key of Object.keys(snippets)) {
			for (const line of bodyLines(snippets[key])) {
				const match = conditionPicker.exec(line);
				if (match) {
					pickers++;
					assert.strictEqual(match[1], expected, `condition picker in snippet "${key}" is out of sync with the schema`);
				}
			}
		}

		assert.ok(pickers > 0, 'expected at least one condition picker in the snippets');
	});

	test('event-type snippets map one-to-one with Windows schema event tags', () => {
		const snippets = getSnippets();
		const schemaTags = getSysmonSchema({ platform: 'windows' }).events.map(event => event.tag);
		const snippetTags = Object.keys(snippets)
			.filter(key => key.startsWith('Sysmon EventType ') && !key.includes('filter set'))
			.map(key => snippets[key].prefix.replace(/^!/, ''));

		for (const tag of snippetTags) {
			assert.ok(schemaTags.indexOf(tag) !== -1, `snippet event "${tag}" is not a Windows schema event tag`);
		}
		for (const tag of schemaTags) {
			assert.ok(snippetTags.indexOf(tag) !== -1, `Windows schema event "${tag}" has no event-type snippet`);
		}
	});

	test('Windows manifest source files are checked in for supported schemas', () => {
		const rootPath = path.resolve(__dirname, '../../..');
		const manifest490 = fs.readFileSync(path.join(rootPath, 'schema/manifests/windows/sysmon-4.90.xml'), 'utf8');
		const manifest491 = fs.readFileSync(path.join(rootPath, 'schema/manifests/windows/sysmon-4.91.xml'), 'utf8');

		assert.ok(manifest490.includes('<manifest schemaversion="4.90" binaryversion="18">'));
		assert.ok(manifest491.includes('<manifest schemaversion="4.91" binaryversion="18">'));
		assert.ok(manifest490.includes('<filters default="is">is,is not,contains,contains any,is any,contains all,excludes,excludes any,excludes all,begin with,not begin with,end with,not end with,less than,more than,image</filters>'));
		assert.ok(manifest491.includes('<filters default="is">is,is not,contains,contains any,is any,contains all,excludes,excludes any,excludes all,begin with,not begin with,end with,not end with,less than,more than,image</filters>'));
	});
});
