'use strict';

$(function() {
  var runEl = document.getElementById('run');
  var fmtEl = document.getElementById('fmt');
  var shareEl = document.getElementById('share');

  runEl.parentNode.replaceChild(runEl.cloneNode(true), runEl);
  fmtEl.parentNode.replaceChild(fmtEl.cloneNode(true), fmtEl);
  shareEl.parentNode.replaceChild(shareEl.cloneNode(true), shareEl);

  runEl = document.getElementById('run');
  fmtEl = document.getElementById('fmt');
  shareEl = document.getElementById('share');

  var wrapEl = $('<div id="better-wrap"></div>');
  var codeEl = $('<div id="better-code"></div>');
  var oldCodeEl = $('#code');
  var oldWrapEl = $('#wrap');

  codeEl.html(oldCodeEl.html());
  wrapEl.html(codeEl);
  $(wrapEl).insertAfter(oldWrapEl);

  ace.require('ace/ext/language_tools');
  ace.require('ace/snippets/golang');
  var editor = ace.edit('better-code');
  editor.setTheme('ace/theme/solarized_light');
  editor.getSession().setMode('ace/mode/golang');
  editor.setOptions({
    fontSize: '11pt',
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: false
  });

  editor.focus();

  playground({
    'editor':       editor,
    'codeEl':       '#better-code',
    'outputEl':     '#output',
    'runEl':        '#run',
    'fmtEl':        '#fmt',
    'fmtImportEl':  '#imports',
    'shareEl':      '#share',
    'shareURLEl':   '#shareURL',
    'autosave':      true,
    'enableHistory': true
  });
});
