'use strict'; // Override original $.val so that we get notified when the original playground
// script modifies the textarea

var originalVal = $.fn.val;

$.fn.val = function () {
  var result = originalVal.apply(this, arguments);

  if (arguments.length > 0) {
    var event = document.createEvent('Event');
    event.initEvent('val-change', true, true);
    this.get(0).dispatchEvent(event);
  }

  return result;
};