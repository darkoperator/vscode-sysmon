// A tolerant, single-pass XML scanner.
//
// It is deliberately NOT a validating parser: completions run while the user is
// mid-edit, so the input is frequently incomplete or malformed. The scanner
// recognises tags, attributes, and comments with precise document offsets and
// degrades gracefully (an unterminated trailing tag is simply not emitted).

export interface XmlAttribute {
	readonly name: string;
	readonly value: string;
	// Offsets of the value *inside* the quotes. -1 for a valueless attribute.
	readonly valueStart: number;
	readonly valueEnd: number;
}

export interface XmlTag {
	readonly kind: 'open' | 'close' | 'self';
	readonly name: string;
	readonly tagStart: number; // offset of '<'
	readonly tagEnd: number;   // offset just past '>'
	readonly nameStart: number;
	readonly nameEnd: number;
	readonly attributes: readonly XmlAttribute[];
}

export interface XmlCommentRange {
	readonly start: number;
	readonly end: number;
}

export interface XmlScan {
	readonly tags: readonly XmlTag[];
	readonly comments: readonly XmlCommentRange[];
}

const NAME_START = /[A-Za-z_:]/;
const NAME_CHAR = /[A-Za-z0-9_:.\-]/;
const WHITESPACE = /\s/;

function parseTag(text: string, start: number): XmlTag | null {
	const n = text.length;
	let j = start + 1;
	let kind: 'open' | 'close' | 'self' = 'open';

	if (text[j] === '/') {
		kind = 'close';
		j++;
	}

	if (j >= n || !NAME_START.test(text[j])) {
		return null;
	}

	const nameStart = j;
	while (j < n && NAME_CHAR.test(text[j])) {
		j++;
	}
	const nameEnd = j;
	const name = text.slice(nameStart, nameEnd);
	const attributes: XmlAttribute[] = [];

	while (j < n) {
		while (j < n && WHITESPACE.test(text[j])) {
			j++;
		}
		if (j >= n) {
			return null; // ran off the end before '>': incomplete tag
		}

		const ch = text[j];
		if (ch === '>') {
			return { kind, name, tagStart: start, tagEnd: j + 1, nameStart, nameEnd, attributes };
		}
		if (ch === '/' && text[j + 1] === '>') {
			return { kind: 'self', name, tagStart: start, tagEnd: j + 2, nameStart, nameEnd, attributes };
		}
		if (!NAME_START.test(ch)) {
			j++; // stray character (e.g. lone '/') — skip and keep scanning attributes
			continue;
		}

		const attrNameStart = j;
		while (j < n && NAME_CHAR.test(text[j])) {
			j++;
		}
		const attrName = text.slice(attrNameStart, j);

		while (j < n && WHITESPACE.test(text[j])) {
			j++;
		}
		if (text[j] !== '=') {
			attributes.push({ name: attrName, value: '', valueStart: -1, valueEnd: -1 });
			continue;
		}
		j++; // skip '='
		while (j < n && WHITESPACE.test(text[j])) {
			j++;
		}

		const quote = text[j];
		if (quote !== '"' && quote !== '\'') {
			return null; // malformed attribute value: treat the whole tag as incomplete
		}
		j++; // skip opening quote
		const valueStart = j;
		while (j < n && text[j] !== quote) {
			j++;
		}
		if (j >= n) {
			return null; // unterminated value
		}
		const valueEnd = j;
		j++; // skip closing quote
		attributes.push({ name: attrName, value: text.slice(valueStart, valueEnd), valueStart, valueEnd });
	}

	return null;
}

export function scanDocument(text: string): XmlScan {
	const tags: XmlTag[] = [];
	const comments: XmlCommentRange[] = [];
	const n = text.length;
	let i = 0;

	while (i < n) {
		if (text[i] !== '<') {
			i++;
			continue;
		}

		if (text.startsWith('<!--', i)) {
			const close = text.indexOf('-->', i + 4);
			const end = close === -1 ? n : close + 3;
			comments.push({ start: i, end });
			i = end;
			continue;
		}
		if (text[i + 1] === '?') {
			const close = text.indexOf('?>', i + 2);
			i = close === -1 ? n : close + 2;
			continue;
		}
		if (text[i + 1] === '!') {
			// DOCTYPE / CDATA and similar — skip to the next '>'.
			const close = text.indexOf('>', i + 2);
			i = close === -1 ? n : close + 1;
			continue;
		}

		const tag = parseTag(text, i);
		if (!tag) {
			i++; // not a complete tag (e.g. a trailing '<' being typed) — move on
			continue;
		}
		tags.push(tag);
		i = tag.tagEnd;
	}

	return { tags, comments };
}

// The element names open at `offset`, accounting for proper nesting. A close tag
// pops down to its nearest matching open ancestor, so unclosed inner elements do
// not corrupt the stack for later tags.
export function openElementsBefore(scan: XmlScan, offset: number): string[] {
	const stack: string[] = [];

	for (const tag of scan.tags) {
		if (tag.tagEnd > offset) {
			break; // tags are ordered; nothing further can be fully before the offset
		}
		if (tag.kind === 'open') {
			stack.push(tag.name);
		} else if (tag.kind === 'close') {
			const idx = stack.lastIndexOf(tag.name);
			if (idx !== -1) {
				stack.length = idx;
			}
		}
	}

	return stack;
}
