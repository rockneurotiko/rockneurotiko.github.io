import {Rx} from 'rx';
import  $ from 'jquery';

let dragJ = $("#todrag");
let dragTarget = dragJ[0];

let mousedowns = Rx.Observable.fromEvent(dragTarget, 'mousedown');
let mouseups = Rx.Observable.fromEvent(dragTarget, 'mouseup');
let mousemoves = Rx.Observable.fromEvent(document, 'mousemove');

let transform = mousedowns.flatMap(mousedown => {
    let startX = mousedown.offsetX, startY = mousedown.offsetY;
    return mousemoves.map(mm => {
        mm.preventDefault();
        return { left: mm.clientX - startX, top: mm.clientY - startY };
    }).takeUntil(mouseups);
});

transform.filter(offs => {
    return offs.left > 0 && offs.left < window.innerWidth &&
        offs.top > 0 && offs.top < window.innerHeight;
}).forEach(offsets => {
    dragJ.css("left", offsets.left);
    dragJ.css("top", offsets.top);
});
