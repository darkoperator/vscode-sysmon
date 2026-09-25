export interface SysmonFormattingOptions {
	readonly insertSpaces: boolean;
	readonly tabSize: number;
}

type XmlTokenKind = 'tag' | 'text';

interface XmlToken {
	readonly kind: XmlTokenKind;
	readonly text: string;
}

function getIndent(options: SysmonFormattingOptions): string {
	return options.insertSpaces
		? ' '.repeat(options.tabSize)
		: '\t';
}

function findTagEnd(text: string, start: number): number {
	let quote = '';

	for (let index = start + 1; index < text.length; index++) {
		const ch = text[index];

		if (quote) {
			if (ch === quote) {
				quote = '';
			}
			continue;
		}

		if (ch === '"' || ch === '\'') {
			quote = ch;
			continue;
		}

		if (ch === '>') {
			return index;
		}
	}

	return -1;
}

function tokenizeXml(text: string): XmlToken[] {
	const tokens: XmlToken[] = [];
	let index = 0;

	while (index < text.length) {
		const tagStart = text.indexOf('<', index);

		if (tagStart === -1) {
			const trailingText = text.slice(index).trim();
			if (trailingText) {
				tokens.push({ kind: 'text', text: trailingText });
			}
			break;
		}

		const textContent = text.slice(index, tagStart).trim();
		if (textContent) {
			tokens.push({ kind: 'text', text: textContent });
		}

		let tagEnd: number;
		if (text.startsWith('<!--', tagStart)) {
			const commentEnd = text.indexOf('-->', tagStart + 4);
			tagEnd = commentEnd === -1 ? -1 : commentEnd + 2;
		} else if (text.startsWith('<![CDATA[', tagStart)) {
			const cdataEnd = text.indexOf(']]>', tagStart + 9);
			tagEnd = cdataEnd === -1 ? -1 : cdataEnd + 2;
		} else {
			tagEnd = findTagEnd(text, tagStart);
		}

		if (tagEnd === -1) {
			const remainder = text.slice(tagStart).trim();
			if (remainder) {
				tokens.push({ kind: 'text', text: remainder });
			}
			break;
		}

		tokens.push({ kind: 'tag', text: text.slice(tagStart, tagEnd + 1).trim() });
		index = tagEnd + 1;
	}

	return tokens;
}

function isCloseTag(token: XmlToken): boolean {
	return token.kind === 'tag' && /^<\//.test(token.text);
}

function isSelfContainedTag(token: XmlToken): boolean {
	return token.kind === 'tag' && (
		/^<\?/.test(token.text)
		|| /^<!--/.test(token.text)
		|| /^<!/.test(token.text)
		|| /\/>$/.test(token.text)
	);
}

function isOpenTag(token: XmlToken): boolean {
	return token.kind === 'tag' && !isCloseTag(token) && !isSelfContainedTag(token);
}

function getTagName(token: XmlToken): string | undefined {
	const match = /^<\/?\s*([^\s>/]+)/.exec(token.text);

	return match ? match[1] : undefined;
}

function isMatchingCloseTag(openToken: XmlToken, closeToken: XmlToken): boolean {
	return getTagName(openToken) === getTagName(closeToken);
}

export function formatSysmonXml(text: string, options: SysmonFormattingOptions): string {
	const unit = getIndent(options);
	const tokens = tokenizeXml(text);
	const lines: string[] = [];
	let level = 0;

	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index];
		const next = tokens[index + 1];
		const afterNext = tokens[index + 2];

		if (isOpenTag(token) && next && next.kind === 'text' && afterNext && isCloseTag(afterNext) && isMatchingCloseTag(token, afterNext)) {
			lines.push(unit.repeat(level) + token.text + next.text + afterNext.text);
			index += 2;
			continue;
		}

		if (isCloseTag(token)) {
			level = Math.max(level - 1, 0);
			lines.push(unit.repeat(level) + token.text);
			continue;
		}

		lines.push(unit.repeat(level) + token.text);

		if (isOpenTag(token)) {
			level++;
		}
	}

	return lines.join('\n');
}
