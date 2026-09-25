import * as assert from 'assert';
import { openElementsBefore, scanDocument } from '../../xmlScanner';

suite('XML Scanner', () => {
	test('scans open, close, and self-closing tags with name offsets', () => {
		const text = '<Rule>\n<Image/>\n</Rule>';
		const scan = scanDocument(text);

		assert.deepStrictEqual(
			scan.tags.map(tag => `${tag.kind}:${tag.name}`),
			['open:Rule', 'self:Image', 'close:Rule']
		);

		const image = scan.tags[1];
		assert.strictEqual(text.slice(image.nameStart, image.nameEnd), 'Image');
	});

	test('captures attribute values with quote-internal offsets', () => {
		const text = '<Image condition="contains">cmd.exe</Image>';
		const scan = scanDocument(text);
		const image = scan.tags[0];

		assert.strictEqual(image.attributes.length, 1);
		assert.strictEqual(image.attributes[0].name, 'condition');
		assert.strictEqual(image.attributes[0].value, 'contains');
		assert.strictEqual(image.attributes[0].valueStart, text.indexOf('contains'));
		assert.strictEqual(image.attributes[0].valueEnd, text.indexOf('contains') + 'contains'.length);
	});

	test('records a valueless attribute with sentinel offsets', () => {
		const scan = scanDocument('<CheckRevocation disabled/>');
		const attribute = scan.tags[0].attributes[0];

		assert.strictEqual(attribute.name, 'disabled');
		assert.strictEqual(attribute.valueStart, -1);
		assert.strictEqual(attribute.valueEnd, -1);
	});

	test('does not emit tags inside comments and records the comment range', () => {
		const text = '<Rule>\n<!-- <Image condition="bad"> -->\n</Rule>';
		const scan = scanDocument(text);

		assert.deepStrictEqual(scan.tags.map(tag => tag.name), ['Rule', 'Rule']);
		assert.strictEqual(scan.comments.length, 1);
		assert.strictEqual(text.slice(scan.comments[0].start, scan.comments[0].end), '<!-- <Image condition="bad"> -->');
	});

	test('skips processing instructions and declarations', () => {
		const scan = scanDocument('<?xml version="1.0"?>\n<Sysmon></Sysmon>');

		assert.deepStrictEqual(scan.tags.map(tag => `${tag.kind}:${tag.name}`), ['open:Sysmon', 'close:Sysmon']);
	});

	test('does not emit an unterminated trailing tag', () => {
		const scan = scanDocument('<EventFiltering>\n<Imag');

		assert.deepStrictEqual(scan.tags.map(tag => tag.name), ['EventFiltering']);
	});

	test('does not emit a tag whose attribute value is unterminated', () => {
		const scan = scanDocument('<Image condition="contains>cmd.exe');

		assert.deepStrictEqual(scan.tags, []);
	});

	test('openElementsBefore tracks proper nesting', () => {
		const text = '<EventFiltering><RuleGroup><ProcessCreate><Image>x</Image></ProcessCreate></RuleGroup></EventFiltering>';
		const scan = scanDocument(text);
		const image = scan.tags.find(tag => tag.name === 'Image' && tag.kind === 'open')!;

		assert.deepStrictEqual(
			openElementsBefore(scan, image.tagStart),
			['EventFiltering', 'RuleGroup', 'ProcessCreate']
		);
		assert.deepStrictEqual(openElementsBefore(scan, text.length), []);
	});

	test('openElementsBefore recovers from an unclosed inner element', () => {
		// <Image> is never closed; the </ProcessCreate> close should still pop ProcessCreate.
		const text = '<EventFiltering><ProcessCreate><Image></ProcessCreate><NetworkConnect>';
		const scan = scanDocument(text);

		assert.deepStrictEqual(
			openElementsBefore(scan, text.length),
			['EventFiltering', 'NetworkConnect']
		);
	});
});
