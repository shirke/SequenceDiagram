define(['./SVGUtilities', './SVGTextBlock'], (svg, SVGTextBlock) => {
	'use strict';

	function renderBox(attrs, position) {
		return svg.make('rect', Object.assign({}, position, attrs));
	}

	function renderNote(attrs, flickAttrs, position) {
		const g = svg.make('g');
		const x0 = position.x;
		const x1 = position.x + position.width;
		const y0 = position.y;
		const y1 = position.y + position.height;
		const flick = 7;

		g.appendChild(svg.make('polygon', Object.assign({
			'points': (
				x0 + ' ' + y0 + ' ' +
				(x1 - flick) + ' ' + y0 + ' ' +
				x1 + ' ' + (y0 + flick) + ' ' +
				x1 + ' ' + y1 + ' ' +
				x0 + ' ' + y1
			),
		}, attrs)));

		g.appendChild(svg.make('polyline', Object.assign({
			'points': (
				(x1 - flick) + ' ' + y0 + ' ' +
				(x1 - flick) + ' ' + (y0 + flick) + ' ' +
				x1 + ' ' + (y0 + flick)
			),
		}, flickAttrs)));

		return g;
	}

	function renderBoxedText(text, {
		x,
		y,
		padding,
		boxAttrs,
		labelAttrs,
		boxLayer,
		labelLayer,
		boxRenderer = null,
		SVGTextBlockClass = SVGTextBlock,
	}) {
		if(!text) {
			return {width: 0, height: 0, label: null, box: null};
		}

		let shift = 0;
		let anchorX = x;
		switch(labelAttrs['text-anchor']) {
		case 'middle':
			shift = 0.5;
			anchorX += (padding.left - padding.right) / 2;
			break;
		case 'end':
			shift = 1;
			anchorX -= padding.right;
			break;
		default:
			shift = 0;
			anchorX += padding.left;
			break;
		}

		const label = new SVGTextBlockClass(labelLayer, {
			attrs: labelAttrs,
			text,
			x: anchorX,
			y: y + padding.top,
		});

		const width = (label.width + padding.left + padding.right);
		const height = (label.height + padding.top + padding.bottom);

		let box = null;
		if(boxRenderer) {
			box = boxRenderer({
				'x': anchorX - label.width * shift - padding.left,
				'y': y,
				'width': width,
				'height': height,
			});
		} else {
			box = renderBox(boxAttrs, {
				'x': anchorX - label.width * shift - padding.left,
				'y': y,
				'width': width,
				'height': height,
			});
		}

		if(boxLayer === labelLayer) {
			boxLayer.insertBefore(box, label.firstLine());
		} else {
			boxLayer.appendChild(box);
		}

		return {width, height, label, box};
	}

	return {
		renderBox,
		renderNote,
		renderBoxedText,
		TextBlock: SVGTextBlock,
	};
});
