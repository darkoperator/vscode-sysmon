import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

suite('Sysmon Snippets', () => {
	function getSnippets(): any {
		const snippetsPath = path.resolve(__dirname, '../../../snippets/smc.json');
		return JSON.parse(fs.readFileSync(snippetsPath, 'utf8'));
	}

	test('Windows config snippet only offers supported Windows schema versions', () => {
		const snippets = getSnippets();

		assert.deepStrictEqual(snippets['Template Sysmon Config'].body[0], '<Sysmon schemaversion="${1|4.91,4.90|}">');
	});

	test('Linux config snippet keeps its existing schema version picker', () => {
		const snippets = getSnippets();

		assert.deepStrictEqual(snippets['Template Sysmon Linux_Config'].body[0], '<Sysmon schemaversion="${1|4.81|}">');
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
