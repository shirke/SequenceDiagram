define(['core/ArrayUtilities'], (array) => {
	'use strict';

	const TRIMMER = /^([ \t]*)(.*)$/;
	const SQUASH_START = /^[ \t\r\n:,]/;
	const SQUASH_END = /[ \t\r\n]$/;
	const REQUIRED_QUOTED = /[\r\n:,"]/;
	const QUOTE_ESCAPE = /["\\]/g;

	function suggestionsEqual(a, b) {
		return (
			(a.v === b.v) &&
			(a.prefix === b.prefix) &&
			(a.suffix === b.suffix) &&
			(a.q === b.q)
		);
	}

	function makeRanges(cm, line, chFrom, chTo) {
		const ln = cm.getLine(line);
		const ranges = {
			wordFrom: {line: line, ch: chFrom},
			squashFrom: {line: line, ch: chFrom},
			wordTo: {line: line, ch: chTo},
			squashTo: {line: line, ch: chTo},
		};
		if(chFrom > 0 && ln[chFrom - 1] === ' ') {
			ranges.squashFrom.ch --;
		}
		if(ln[chTo] === ' ') {
			ranges.squashTo.ch ++;
		}
		return ranges;
	}

	function wrapQuote(entry, quote) {
		if(!quote && entry.q && REQUIRED_QUOTED.test(entry.v)) {
			quote = '"';
		}
		let inner = entry.v;
		if(quote) {
			inner = quote + inner.replace(QUOTE_ESCAPE, '\\$&') + quote;
		}
		return (entry.prefix || '') + inner + (entry.suffix || '');
	}

	function makeHintItem(entry, ranges, quote) {
		const quoted = wrapQuote(entry, quote);
		return {
			text: quoted,
			displayText: (quoted === '\n') ? '<END>' : quoted.trim(),
			className: (quoted === '\n') ? 'pick-virtual' : null,
			from: SQUASH_START.test(quoted) ?
				ranges.squashFrom : ranges.wordFrom,
			to: SQUASH_END.test(quoted) ?
				ranges.squashTo : ranges.wordTo,
		};
	}

	function getGlobals({global, prefix = '', suffix = ''}, globals) {
		const identified = globals[global];
		if(!identified) {
			return [];
		}
		return identified.map((item) => ({v: item, prefix, suffix, q: true}));
	}

	function populateGlobals(suggestions, globals = {}) {
		for(let i = 0; i < suggestions.length;) {
			if(suggestions[i].global) {
				const identified = getGlobals(suggestions[i], globals);
				array.mergeSets(suggestions, identified, suggestionsEqual);
				suggestions.splice(i, 1);
			} else {
				++ i;
			}
		}
	}

	function getPartial(cur, token) {
		let partial = token.string;
		if(token.end > cur.ch) {
			partial = partial.substr(0, cur.ch - token.start);
		}
		const parts = TRIMMER.exec(partial);
		partial = parts[2];
		let quote = '';
		if(partial[0] === '"') {
			quote = partial[0];
			partial = partial.substr(1);
		}
		return {
			partial,
			quote,
			from: token.start + parts[1].length,
		};
	}

	function getHints(cm, options) {
		const cur = cm.getCursor();
		const token = cm.getTokenAt(cur);
		const {partial, from, quote} = getPartial(cur, token);

		const continuation = (cur.ch > 0 && token.state.line.length > 0);
		let comp = (continuation ?
			token.state.completions :
			token.state.beginCompletions
		);
		if(!continuation) {
			comp = comp.concat(token.state.knownAgent);
		}

		populateGlobals(comp, cm.options.globals);

		const ranges = makeRanges(cm, cur.line, from, token.end);
		let selfValid = false;
		const list = (comp
			.filter(({v, q}) => (q || !quote) && v.startsWith(partial))
			.map((o) => {
				if(o.v === partial + ' ' && !options.completeSingle) {
					selfValid = true;
					return null;
				}
				return makeHintItem(o, ranges, quote);
			})
			.filter((opt) => (opt !== null))
		);
		if(selfValid && list.length > 0) {
			list.unshift(makeHintItem(
				{v: partial, suffix: ' ', q: false},
				ranges,
				quote
			));
		}

		return {
			list,
			from: ranges.wordFrom,
			to: ranges.wordTo,
		};
	}

	return {
		getHints,
	};
});
