'use strict';

// ---external global dependencies
/* global d3:false */

var pie = module.exports = {},
    Plotly = require('./plotly'),
    isNumeric = require('./isnumeric'),
    tinycolor = require('tinycolor2');

Plotly.Plots.register(pie, 'pie', ['pie']);

pie.attributes = {
    // data
    labels: {type: 'data_array'},
    // equivalent of x0 and dx, if label is missing
    label0: {type: 'number', dflt: 0},
    dlabel: {type: 'number', dflt: 1},

    values: {type: 'data_array'},

    // if color is missing, use default trace color set
    colors: {type: 'data_array'},

    text: {type: 'data_array'},

    scalegroup: {
        /**
         * if there are multiple pies that should be sized according to
         * their totals, link them by providing a non-empty group id here
         * shared by every trace in the same group
         * see eg:
         * https://www.e-education.psu.edu/natureofgeoinfo/sites/www.e-education.psu.edu.natureofgeoinfo/files/image/hisp_pies.gif
         * (this example involves a map too - may someday be a whole trace type
         * of its own. but the point is the size of the whole pie is important.)
         */
        type: 'string',
        dflt: ''
    },

    // labels (legend is handled by plots.attributes.showlegend and layout.legend.hiddenslices)
    textinfo: {
        type: 'flaglist',
        flags: ['label', 'text', 'value', 'percent'],
        extras: ['none']
    },
    textposition: {
        type: 'enumerated',
        values: ['inside', 'outside', 'auto', 'none'],
        dflt: 'auto',
        arrayOk: true
    },
    textfont: {type: 'font'},
    insidetextfont: {type: 'font'},
    outsidetextfont: {type: 'font'},

    // position and shape
    domain: {
        x: [
            {type: 'number', min: 0, max: 1, dflt: 0},
            {type: 'number', min: 0, max: 1, dflt: 1}
        ],
        y: [
            {type: 'number', min: 0, max: 1, dflt: 0},
            {type: 'number', min: 0, max: 1, dflt: 1}
        ]
    },
    tilt: {
        // degrees to tilt the pie back from straight on
        type: 'number',
        min: 0,
        max: 90,
        dflt: 0
    },
    tiltaxis: {
        // degrees away from straight up to tilt the pie
        // only has an effect if tilt is nonzero
        type: 'number',
        min: -360,
        max: 360,
        dflt: 0
    },
    depth: {
        // "3D" size, as a fraction of radius
        // only has an effect if tilt is nonzero
        type: 'number',
        min: 0,
        max: 10,
        dflt: 0.5
    },
    hole: {
        // fraction of the radius to cut out and make a donut
        type: 'number',
        min: 0,
        max: 1,
        dflt: 0
    },

    // ordering and direction
    sort: {
        // reorder slices from largest to smallest?
        type: 'boolean',
        dflt: true
    },
    direction: {
        /**
         * there are two common conventions, both of which place the first
         * (largest, if sorted) slice with its left edge at 12 o'clock but
         * succeeding slices follow either cw or ccw from there.
         *
         * see http://visage.co/data-visualization-101-pie-charts/
         */
        type: 'enumerated',
        values: ['cw', 'ccw'],
        dflt: 'ccw'
    },
    rotation: {
        // instead of the first slice starting at 12 o'clock, rotate to some other angle
        type: 'number',
        min: -360,
        max: 360,
        dflt: 0
    },

    // style
    line: {
        color: {
            type: 'color',
            dflt: Plotly.Color.defaultLine,
            arrayOk: true
        },
        width: {
            type: 'number',
            min: 0,
            dflt: 0,
            arrayOk: true
        }
    },
    shading: {
        // how much darker to make the sides than the top,
        // with a 3D effect. We could of course get all
        // fancy with lighting effects, but maybe this is
        // sufficient.
        type: 'number',
        min: 0,
        max: 1,
        dflt: 0.2
    },
    pull: {
        // fraction of larger radius to pull the slices
        // out from the center. This can be a constant
        // to pull all slices apart from each other equally
        // or an array to highlight one or more slices
        type: 'number',
        min: 0,
        max: 1,
        dflt: 0,
        arrayOk: true
    }
};

pie.supplyDefaults = function(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Plotly.Lib.coerce(traceIn, traceOut, pie.attributes, attr, dflt);
    }

    var vals = coerce('values');
    if(!Array.isArray(vals) || !vals.length) {
        traceOut.visible = false;
        return;
    }

    var labels = coerce('labels');
    if(!Array.isArray(labels)) { // TODO: what if labels is shorter than vals?
        coerce('label0');
        coerce('dlabel');
    }

    var colors = coerce('colors');
    if(!Array.isArray(colors)) traceOut.colors = []; // later this will get padded with default colors

    coerce('scalegroup');
    // TODO: tilt, depth, and hole all need to be coerced to the same values within a scaleegroup
    // (ideally actually, depth would get set the same *after* scaling, ie the same absolute depth)
    // and if colors aren't specified we should match these up - potentially even if separate pies
    // are NOT in the same sharegroup


    var textData = coerce('text');
    var textInfo = coerce('textinfo', Array.isArray(textData) ? 'text+percent' : 'percent');

    if(textInfo && textInfo !== 'none') {
        var textPosition = coerce('textposition'),
            hasBoth = Array.isArray(textPosition) || textPosition === 'auto',
            hasInside = hasBoth || textPosition === 'inside',
            hasOutside = hasBoth || textPosition === 'outside';

        if(hasInside || hasOutside) {
            var dfltFont = coerce('textfont', layout.font);
            if(hasInside) coerce('insidetextfont', dfltFont);
            if(hasOutside) coerce('outsidetextfont', dfltFont);
        }
    }

    coerce('domain.x[0]');
    coerce('domain.x[1]');
    coerce('domain.y[0]');
    coerce('domain.y[1]');

    var tilt = coerce('tilt');
    if(tilt) {
        coerce('tiltaxis');
        coerce('depth');
        coerce('shading');
    }

    coerce('hole');

    coerce('sort');
    coerce('direction');
    coerce('rotation');

    var lineWidth = coerce('line.width');
    if(lineWidth) coerce('line.color');

    coerce('pull');
};

pie.supplyLayoutDefaults  = function(layoutIn, layoutOut){
    // clear out stashed label -> color mappings to be used by calc
    layoutOut._piecolormap = {};
    layoutOut._piedefaultcolorcount = 0;
};

pie.calc = function(gd, trace) {
    var vals = trace.values,
        labels = trace.labels,
        cd = [],
        fullLayout = gd._fullLayout,
        colorMap = fullLayout._piecolormap,
        allLabels = {},
        needDefaults = false,
        vTotal = 0,
        i,
        v,
        label,
        color;

    for(i = 0; i < vals.length; i++) {
        v = vals[i];
        if(!isNumeric(v)) continue;
        v = +v;
        if(v < 0) continue;

        label = labels[i];
        if(label === undefined || label === '') label = i;
        label = String(label);
        // only take the first occurrence of any given label.
        // TODO: perhaps (optionally?) sum values for a repeated label?
        if(allLabels[label] === undefined) allLabels[label] = true;
        else continue;

        color = tinycolor(trace.colors[i]);
        if(color.isValid()) {
            color = Plotly.Color.tinyRGB(color);
            colorMap[label] = color;
        }
        // have we seen this label and assigned a color to it in a previous trace?
        else if(colorMap[label]) color = colorMap[label];
        // color needs a default - mark it false, come back after sorting
        else {
            color = false;
            needDefaults = true;
        }

        vTotal += v;

        cd.push({
            v: v,
            label: label,
            color: color,
            i: i
        });
    }

    if(trace.sort) cd.sort(function(a, b) { return b.v - a.v; });

    /**
     * now go back and fill in colors we're still missing
     * this is done after sorting, so we pick defaults
     * in the order slices will be displayed
     */

    if(needDefaults) {
        for(i = 0; i < cd.length; i++) {
            if(cd[i].color === false) {
                colorMap[cd[i].label] = cd[i].color = nextDefaultColor(fullLayout._piedefaultcolorcount);
                fullLayout._piedefaultcolorcount++;
            }
        }
    }

    // include the sum of all values in the first point
    if(cd[0]) cd[0].vTotal = vTotal;

    // now insert text
    if(trace.textinfo && trace.textinfo !== 'none') {
        var hasLabel = trace.textinfo.indexOf('label') !== -1,
            hasText = trace.textinfo.indexOf('text') !== -1,
            hasValue = trace.textinfo.indexOf('value') !== -1,
            hasPercent = trace.textinfo.indexOf('percent') !== -1,
            thisText;

        for(i = 0; i < cd.length; i++) {
            thisText = hasLabel ? [cd[i].label] : [];
            if(hasText && trace.text[i]) thisText.push(trace.text[i]);
            if(hasValue) thisText.push(formatPieValue(cd[i].v));
            if(hasPercent) thisText.push(formatPiePercent(cd[i].v / vTotal));
            cd[i].text = thisText.join('<br>');
        }
    }

    return cd;
};

function formatPiePercent(v) {
    var vRounded = (v * 100).toPrecision(3);
    if(vRounded.indexOf('.') !== -1) return vRounded.replace(/[.]?0+$/,'') + '%';
    return vRounded + '%';
}

function formatPieValue(v) {
    var vRounded = v.toPrecision(10);
    if(vRounded.indexOf('.') !== -1) return vRounded.replace(/[.]?0+$/,'');
    return vRounded;
}

/**
 * pick a default color from the main default set, augmented by
 * itself lighter then darker before repeating
 */
var pieDefaultColors;

function nextDefaultColor(index) {
    if(!pieDefaultColors) {
        // generate this default set on demand (but then it gets saved in the module)
        var mainDefaults = Plotly.Color.defaults;
        pieDefaultColors = mainDefaults.slice();
        for(var i = 0; i < mainDefaults.length; i++) {
            pieDefaultColors.push(tinycolor(mainDefaults[i]).lighten(20).toHexString());
        }
        for(i = 0; i < Plotly.Color.defaults.length; i++) {
            pieDefaultColors.push(tinycolor(mainDefaults[i]).darken(20).toHexString());
        }
    }

    return pieDefaultColors[index % pieDefaultColors.length];
}

pie.plot = function(gd, cdpie) {
    var fullLayout = gd._fullLayout;

    scalePies(cdpie, fullLayout._size);

    var pieGroups = fullLayout._pielayer.selectAll('g.trace').data(cdpie);

    pieGroups.enter().append('g')
        .attr({
            'stroke-linejoin': 'round', // TODO: miter might look better but can sometimes cause problems
                                        // maybe miter with a small-ish stroke-miterlimit?
            'class': 'trace'
        });
    pieGroups.exit().remove();
    pieGroups.order();

    pieGroups.each(function(cd) {
        var pieGroup = d3.select(this),
            cd0 = cd[0],
            trace = cd0.trace,
            tiltRads = trace.tilt * Math.PI / 180,
            depthLength = (trace.depth||0) * cd0.r * Math.sin(tiltRads) / 2,
            tiltAxis = trace.tiltaxis || 0,
            tiltAxisRads = tiltAxis * Math.PI / 180,
            depthVector = [
                depthLength * Math.sin(tiltAxisRads),
                depthLength * Math.cos(tiltAxisRads)
            ],
            rSmall = cd0.r * Math.cos(tiltRads);

        var pieParts = pieGroup.selectAll('g.part')
            .data(trace.tilt ? ['top', 'sides'] : ['top']);

        pieParts.enter().append('g').attr('class', function(d) {
            return d + ' part';
        });
        pieParts.exit().remove();
        pieParts.order();

        setCoords(cd);

        pieGroup.selectAll('.top').each(function() {
            var slices = d3.select(this).selectAll('g.slice').data(cd);

            slices.enter().append('g')
                .classed('slice', true)
                .each(function() {
                    d3.select(this).append('path').classed('surface', true); // the top surface of the slice
                });
            slices.exit().remove();

            var outsideTextQuadrants = [
                [[],[]], // y<0: x<0, x>=0
                [[],[]] // y>=0: x<0, x>=0
            ];

            slices.each(function(pt) {
                var cx = cd0.cx + depthVector[0],
                    cy = cd0.cy + depthVector[1],
                    sliceTop = d3.select(this),
                    slicePath = sliceTop.select('path.surface');

                sliceTop.select('path.textline').remove();

                if(trace.pull) {
                    var pull = +(Array.isArray(trace.pull) ? trace.pull[pt.i] : trace.pull) || 0;
                    if(pull > 0) {
                        cx += pull * pt.pxmid[0];
                        cy += pull * pt.pxmid[1];
                    }
                }

                var outerArc = 'a' + cd0.r + ',' + rSmall + ' ' + tiltAxis + ' ' + pt.largeArc + ' 1 ' +
                    (pt.px1[0] - pt.px0[0]) + ',' + (pt.px1[1] - pt.px0[1]);

                if(trace.hole) {
                    var hole = trace.hole,
                        rim = 1 - hole;
                    slicePath.attr('d',
                        'M' + (cx + hole * pt.px1[0]) + ',' + (cy + hole * pt.px1[1]) +
                        'a' + (hole * cd0.r) + ',' + (hole * rSmall) + ' ' + tiltAxis + ' ' +
                            pt.largeArc + ' 0 ' +
                            (hole * (pt.px0[0] - pt.px1[0])) + ',' + (hole * (pt.px0[1] - pt.px1[1])) +
                        'l' + (rim * pt.px0[0]) + ',' + (rim * pt.px0[1]) +
                        outerArc +
                        'Z');
                } else {
                    slicePath.attr('d',
                        'M' + cx + ',' + cy +
                        'l' + pt.px0[0] + ',' + pt.px0[1] +
                        outerArc +
                        'Z');
                }

                // add text
                var textPosition = Array.isArray(trace.textposition) ?
                        trace.textposition[pt.i] : trace.textposition,
                    sliceTextGroup = sliceTop.selectAll('g.slicetext')
                    .data(pt.text && (textPosition !== 'none') ? [0] : []);

                sliceTextGroup.enter().append('g')
                    .classed('slicetext', true);
                sliceTextGroup.exit().remove();

                sliceTextGroup.each(function() {
                    var sliceText = d3.select(this).selectAll('text').data([0]);

                    sliceText.enter().append('text')
                        // prohibit tex interpretation until we can handle
                        // tex and regular text together
                        .attr('data-notex', 1);
                    sliceText.exit().remove();

                    sliceText.text(pt.text)
                        .attr({
                            'class': 'slicetext',
                            transform: '',
                            'data-bb': '',
                            'text-anchor': 'middle',
                            x: 0,
                            y: 0
                        })
                        .call(Plotly.Drawing.font, textPosition === 'outside' ?
                            trace.outsidetextfont : trace.insidetextfont)
                        .call(Plotly.util.convertToTspans);
                    sliceText.selectAll('tspan.line').attr({x: 0, y: 0});

                    // position the text relative to the slice
                    // TODO: so far this only accounts for flat
                    var textBB = Plotly.Drawing.bBox(sliceText.node()),
                        transform;

                    if(textPosition === 'outside') {
                        transform = transformOutsideText(textBB, pt);
                    } else {
                        transform = transformInsideText(textBB, pt, cd0, trace);
                        if(textPosition === 'auto' && transform.scale < 1) {
                            sliceText.call(Plotly.Drawing.font, trace.outsidetextfont);
                            if(trace.outsidetextfont.family !== trace.insidetextfont.family ||
                                    trace.outsidetextfont.size !== trace.insidetextfont.size) {
                                sliceText.attr({'data-bb': ''});
                                textBB = Plotly.Drawing.bBox(sliceText.node());
                            }
                            transform = transformOutsideText(textBB, pt);
                        }
                    }

                    var translateX = cx + pt.pxmid[0] * transform.rCenter + (transform.x || 0),
                        translateY = cy + pt.pxmid[1] * transform.rCenter + (transform.y || 0);

                    // save some stuff to use later ensure no labels overlap
                    if(transform.outside) {
                        pt.cxFinal = cx;
                        pt.cyFinal = cy;
                        pt.yLabelMin = translateY - textBB.height / 2;
                        pt.yLabelMid = translateY;
                        pt.yLabelMax = translateY + textBB.height / 2;
                        pt.labelExtraX = 0;
                        pt.labelExtraY = 0;
                        outsideTextQuadrants[transform.y < 0 ? 0 : 1][transform.x < 0 ? 0 : 1].push(pt);
                    }

                    sliceText.attr('transform',
                        'translate(' + translateX + ',' + translateY + ')' +
                        (transform.scale < 1 ? ('scale(' + transform.scale + ')') : '') +
                        (transform.rotate ? ('rotate(' + transform.rotate + ')') : '') +
                        'translate(' +
                            (-(textBB.left + textBB.right) / 2) + ',' +
                            (-(textBB.top + textBB.bottom) / 2) +
                        ')');
                });
            });

            // now make sure no labels overlap (at least within one pie)
            scootLabels(outsideTextQuadrants);
            slices.each(function(pt) {
                if(pt.labelExtraX || pt.labelExtraY) {
                    // first move the text to its new location
                    var sliceTop = d3.select(this),
                        sliceText = sliceTop.select('g.slicetext text');

                    sliceText.attr('transform', 'translate(' + pt.labelExtraX + ',' + pt.labelExtraY + ')' +
                        sliceText.attr('transform'));

                    // then add a line to the new location
                    var textLinePath = 'M' + (pt.cxFinal + pt.pxmid[0]) + ',' + (pt.cyFinal + pt.pxmid[1]),
                        finalX = (pt.yLabelMax - pt.yLabelMin) * (pt.pxmid[0] < 0 ? -1 : 1) / 4;
                    if(pt.labelExtraX) {
                        if(Math.abs((pt.yLabelMid + pt.labelExtraY - pt.cyFinal - pt.pxmid[1]) / pt.labelExtraX) >
                                Math.abs(pt.pxmid[1] / pt.pxmid[0])) {
                            textLinePath += 'l' + pt.labelExtraX + ',' + (pt.labelExtraX * pt.pxmid[1] / pt.pxmid[0]) +
                                'V' + (pt.cyFinal + pt.pxmid[1] + pt.labelExtraY) +
                                'h' + finalX;
                        } else {
                            textLinePath += 'l' + (pt.labelExtraY * pt.pxmid[0] / pt.pxmid[1]) + ',' + pt.labelExtraY +
                                'H' + (pt.cxFinal + pt.pxmid[0] + pt.labelExtraX + finalX);
                        }
                    } else {
                        textLinePath += 'V' + (pt.yLabelMid + pt.labelExtraY) +
                            'h' + finalX;
                    }

                    sliceTop.append('path')
                        .classed('textline', true)
                        .call(Plotly.Color.stroke, trace.outsidetextfont.color)
                        .attr({
                            'stroke-width': Math.min(2, trace.outsidetextfont.size / 8),
                            d: textLinePath,
                            fill: 'none'
                        });
                }
            });
        });
    });
};

function transformInsideText(textBB, pt, cd0, trace) {
    var textDiameter = Math.sqrt(textBB.width * textBB.width + textBB.height * textBB.height),
        textAspect = textBB.width / textBB.height,
        halfAngle = Math.PI * Math.min(pt.v / cd0.vTotal, 0.5),
        ring = 1 - trace.hole,
        rInscribed = Math.min(1 / (1 + 1 / Math.sin(halfAngle)), ring / 2),

        // max size text can be inserted inside without rotating it
        // this inscribes the text rectangle in a circle, which is then inscribed
        // in the slice, so it will be an underestimate, which some day we may want
        // to improve so this case can get more use
        transform = {
            scale: rInscribed * cd0.r * 2 / textDiameter,

            // and the center position and rotation in this case
            rCenter: 1 - rInscribed,
            rotate: 0
        };

    if(transform.scale >= 1) return transform;

        // max size if text is rotated radially
    var Qr = textAspect + 1 / (2 * Math.tan(halfAngle)),
        maxHalfHeightRotRadial = cd0.r * Math.min(
            1 / (Math.sqrt(Qr * Qr + 0.5) + Qr),
            ring / (Math.sqrt(textAspect * textAspect + ring / 2) + textAspect)
        ),
        radialTransform = {
            scale: maxHalfHeightRotRadial * 2 / textBB.height,
            rCenter: Math.cos(maxHalfHeightRotRadial / cd0.r) -
                maxHalfHeightRotRadial * textAspect / cd0.r,
            rotate: (180 / Math.PI * pt.midangle + 720) % 180 - 90
        },

        // max size if text is rotated tangentially
        aspectInv = 1 / textAspect,
        Qt = aspectInv + 1 / (2 * Math.tan(halfAngle)),
        maxHalfWidthTangential = cd0.r * Math.min(
            1 / (Math.sqrt(Qt * Qt + 0.5) + Qt),
            ring / (Math.sqrt(aspectInv * aspectInv + ring / 2) + aspectInv)
        ),
        tangentialTransform = {
            scale: maxHalfWidthTangential * 2 / textBB.width,
            rCenter: Math.cos(maxHalfWidthTangential / cd0.r) -
                maxHalfWidthTangential / textAspect / cd0.r,
            rotate: (180 / Math.PI * pt.midangle + 810) % 180 - 90
        },
        // if we need a rotated transform, pick the biggest one
        // even if both are bigger than 1
        rotatedTransform = tangentialTransform.scale > radialTransform.scale ?
            tangentialTransform : radialTransform;

    if(transform.scale < 1 && rotatedTransform.scale > transform.scale) return rotatedTransform;
    return transform;
}

function transformOutsideText(textBB, pt) {
    var x = pt.pxmid[0],
        y = pt.pxmid[1],
        dx = textBB.width / 2,
        dy = textBB.height / 2;

    if(x < 0) dx *= -1;
    if(y < 0) dy *= -1;

    return {
        scale: 1,
        rCenter: 1,
        rotate: 0,
        x: dx + Math.abs(dy) * (dx > 0 ? 1 : -1) / 2,
        y: dy / (1 + x * x / (y * y)),
        outside: true
    };
}

function scootLabels(outsideTextQuadrants) {
    var xHalf,
        yHalf,
        equatorFirst,
        farthestX,
        farthestY,
        i;

    function topFirst (a, b) { return a.pxmid[1] - b.pxmid[1]; }
    function bottomFirst (a, b) { return b.pxmid[1] - a.pxmid[1]; }

    function scootOneLabel(thisPt, prevPt) {
        if(yHalf) {
            var prevBottom = prevPt.cyFinal + prevPt.yLabelMax + prevPt.labelExtraY,
                thisTop = thisPt.cyFinal + thisPt.yLabelMin;
            if(thisTop < prevBottom) thisPt.labelExtraY = prevBottom - thisTop;
        } else {
            var prevTop = prevPt.cyFinal + prevPt.yLabelMin + prevPt.labelExtraY,
                thisBottom = thisPt.cyFinal + thisPt.yLabelMax;
            if(thisBottom > prevTop) thisPt.labelExtraY = prevTop - thisBottom;
        }
    }

    for(yHalf = 0; yHalf < 2; yHalf++) {
        equatorFirst = yHalf ? topFirst : bottomFirst;
        farthestY = yHalf ? Math.max : Math.min;
        for(xHalf = 0; xHalf < 2; xHalf++) {
            farthestX = xHalf ? Math.max : Math.min;
            // first sort the array
            // note this is a copy of cd, so cd itself doesn't get sorted
            // but we can still modify points in place.
            var thisQuad = outsideTextQuadrants[yHalf][xHalf];
            thisQuad.sort(equatorFirst);
            if(yHalf) {
                // bottom half needs to avoid the top half
                var topQuad = outsideTextQuadrants[1 - yHalf][xHalf];
                if(thisQuad.length && topQuad.length) {
                    scootOneLabel(thisQuad[0], topQuad[0]);
                }
            }

            // then each needs to avoid the previous
            for(i = 1; i < thisQuad.length; i++) {
                scootOneLabel(thisQuad[i], thisQuad[i - 1]);
            }

            // TODO: uneven pulls may need labelExtraX
        }
    }
}

function scalePies(cdpie, plotSize) {
    var pieBoxWidth,
        pieBoxHeight,
        i,
        j,
        cd0,
        trace,
        tiltAxisRads,
        maxPull,
        scaleGroups = [],
        scaleGroup,
        minPxPerValUnit;

    // first figure out the center and maximum radius for each pie
    for(i = 0; i < cdpie.length; i++) {
        cd0 = cdpie[i][0];
        trace = cd0.trace;
        pieBoxWidth = plotSize.w * (trace.domain.x[1] - trace.domain.x[0]);
        pieBoxHeight = plotSize.h * (trace.domain.y[1] - trace.domain.y[0]);
        tiltAxisRads = trace.tiltaxis * Math.PI / 180;

        maxPull = trace.pull;
        if(Array.isArray(maxPull)) {
            maxPull = 0;
            for(j = 0; j < trace.pull.length; j++) {
                if(trace.pull[j] > maxPull) maxPull = trace.pull[j];
            }
        }

        cd0.r = Math.min(
                pieBoxWidth / maxExtent(trace.tilt, Math.sin(tiltAxisRads), trace.depth),
                pieBoxHeight / maxExtent(trace.tilt, Math.cos(tiltAxisRads), trace.depth)
            ) / (2 + 2 * maxPull);

        cd0.cx = plotSize.l + plotSize.w * (trace.domain.x[1] + trace.domain.x[0])/2;
        cd0.cy = plotSize.t + plotSize.h * (2 - trace.domain.y[1] - trace.domain.y[0])/2;

        if(trace.scalegroup && scaleGroups.indexOf(trace.scalegroup) === -1) {
            scaleGroups.push(trace.scalegroup);
        }
    }

    // Then scale any pies that are grouped
    for(j = 0; j < scaleGroups.length; j++) {
        minPxPerValUnit = Infinity;
        scaleGroup = scaleGroups[j];

        for(i = 0; i < cdpie.length; i++) {
            cd0 = cdpie[i][0];
            if(cd0.trace.scalegroup === scaleGroup) {
                minPxPerValUnit = Math.min(minPxPerValUnit,
                    cd0.r * cd0.r / cd0.vTotal);
            }
        }

        for(i = 0; i < cdpie.length; i++) {
            cd0 = cdpie[i][0];
            if(cd0.trace.scalegroup === scaleGroup) {
                cd0.r = Math.sqrt(minPxPerValUnit * cd0.vTotal);
            }
        }
    }

}

function setCoords(cd) {
    var cd0 = cd[0],
        trace = cd0.trace,
        tilt = trace.tilt,
        tiltAxisRads,
        tiltAxisSin,
        tiltAxisCos,
        tiltRads,
        crossTilt,
        inPlane,
        currentAngle = trace.rotation * Math.PI / 180,
        angleFactor = 2 * Math.PI / cd0.vTotal,
        firstPt = 'px0',
        lastPt = 'px1',
        i,
        cdi,
        currentCoords;

    if(trace.direction === 'ccw') {
        currentAngle += angleFactor * cd0.v;
        angleFactor *= -1;
        firstPt = 'px1';
        lastPt = 'px0';
    }

    if(tilt) {
        tiltRads = tilt * Math.PI / 180;
        tiltAxisRads = trace.tiltaxis * Math.PI / 180;
        crossTilt = Math.sin(tiltAxisRads) * Math.cos(tiltAxisRads);
        inPlane = 1 - Math.cos(tiltRads);
        tiltAxisSin = Math.sin(tiltAxisRads);
        tiltAxisCos = Math.cos(tiltAxisRads);
    }

    function getCoords(angle) {
        var xFlat = cd0.r * Math.sin(angle),
            yFlat = -cd0.r * Math.cos(angle);

        if(!tilt) return [xFlat, yFlat];

        return [
            xFlat * (1 - inPlane * tiltAxisSin * tiltAxisSin) + yFlat * crossTilt * inPlane,
            xFlat * crossTilt * inPlane + yFlat * (1 - inPlane * tiltAxisCos * tiltAxisCos),
            Math.sin(tiltRads) * (yFlat * tiltAxisCos - xFlat * tiltAxisSin)
        ];
    }

    currentCoords = getCoords(currentAngle);

    for(i = 0; i < cd.length; i++) {
        cdi = cd[i];
        cdi[firstPt] = currentCoords;

        currentAngle += angleFactor * cdi.v / 2;
        cdi.pxmid = getCoords(currentAngle);
        cdi.midangle = currentAngle;

        currentAngle += angleFactor * cdi.v / 2;
        currentCoords = getCoords(currentAngle);

        cdi[lastPt] = currentCoords;

        cdi.largeArc = (cdi.v > cd0.vTotal / 2) ? 1 : 0;
    }
}

function maxExtent(tilt, tiltAxisFraction, depth) {
    if(!tilt) return 1;
    var sinTilt = Math.sin(tilt * Math.PI / 180);
    return Math.max(0.01, // don't let it go crazy if you tilt the pie totally on its side
        depth * sinTilt * Math.abs(tiltAxisFraction) +
        2 * Math.sqrt(1 - sinTilt * sinTilt * tiltAxisFraction * tiltAxisFraction));
}

pie.style = function(gd) {
    gd._fullLayout._pielayer.selectAll('.trace').each(function(cd) {
        var cd0 = cd[0],
            trace = cd0.trace,
            getLineWidth,
            traceSelection = d3.select(this);

        traceSelection.style({opacity: trace.opacity});

        if(Array.isArray(trace.line.width)) {
            getLineWidth = function(pt) {
                return trace.line.width[pt.i] || 0;
            };
        } else {
            var lineWidth = trace.line.width || 0;
            getLineWidth = function() { return lineWidth; };
        }

        traceSelection.selectAll('.top path.surface').each(function(pt) {
            var lineColor = trace.line.color;
            if(Array.isArray(lineColor)) lineColor = lineColor[pt.i] || Plotly.Color.defaultLine;

            d3.select(this).style({
                'stroke-width': getLineWidth(pt),
                fill: pt.color
            })
            .call(Plotly.Color.stroke, lineColor);
        });
    });
};
