'use strict';

var wrapEl = document.getElementById('wrap');
var oldCodeEl = document.getElementById('code');

var codeEl = document.createElement('div');
codeEl.id = 'better-code';
codeEl.innerHTML = oldCodeEl.value;

// wrapEl.id = 'better-wrap';
wrapEl.innerHTML = codeEl.outerHTML;

ace.require('ace/ext/language_tools');
ace.require('ace/snippets/golang');
var editor = ace.edit('better-code');
editor.setTheme('ace/theme/solarized_light');
editor.getSession().setMode('ace/mode/golang');
editor.setOptions({
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
  'enableHistory': true
});
