'use strict';

$(function() {
  var controlEl = document.getElementById('controls');
  var aboutControlsEl = document.getElementById('aboutControls');
  var runEl = document.getElementById('run');
  var fmtEl = document.getElementById('fmt');
  var fmtEl = document.getElementById('fmt');
  var importsEl = document.getElementById('importsBox');

  runEl.parentNode.replaceChild(runEl.cloneNode(true), runEl);
  fmtEl.parentNode.replaceChild(fmtEl.cloneNode(true), fmtEl);

  runEl = document.getElementById('run');
  fmtEl = document.getElementById('fmt');

  var wrapEl = $('<div id="better-wrap"></div>');
  var codeEl = $('<div id="better-code"></div>');
  var oldCodeEl = $('#code');
  var oldWrapEl = $('#wrap');
  var resetEl = $('<input type="button" value="Reset" id="reset">')
  var themeEl = $('<input type="button" value="Dark" id="reset">')

  var shareEl = document.getElementById('share');
  // Sometimes the share button is not shown
  if (shareEl) {
    shareEl.parentNode.replaceChild(shareEl.cloneNode(true), shareEl);
    shareEl = document.getElementById('share');
  }

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

  // Add reset button
  resetEl.click(function(e) {
    editor.setValue(oldCodeEl.html(), -1);
  });
  controlEl.insertBefore(resetEl[0], importsEl);

  // Setup theme and toggle button
  function setTheme(theme) {
    if (theme === 'ace/theme/solarized_light') {
      editor.setTheme('ace/theme/solarized_light')
      themeEl.attr('value', 'Dark')
      $('body').attr('class', 'theme-light')
    } else {
      editor.setTheme('ace/theme/tomorrow_night')
      themeEl.attr('value', 'Light')
      $('body').attr('class', 'theme-dark')
    }
    localStorage.setItem('ace_theme', theme)
  }

  function toggleTheme() {
    if (editor.getTheme() === 'ace/theme/solarized_light') {
      setTheme('ace/theme/tomorrow_night')
    } else {
      setTheme('ace/theme/solarized_light')
    }
  }

  var theme = localStorage.getItem('ace_theme')
  if (theme) {
    setTheme(theme)
  }

  themeEl.click(toggleTheme);
  aboutControlsEl.insertBefore(themeEl[0], aboutControlsEl.firstChild);

  // Create editor and playground
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

  document.getElementById("run").title = "Press ALT+R to run quickly.";
  document.getElementById("fmt").title = "Press ALT+W to format quickly.";
  document.getElementById("reset").title = "Press ALT+T to reset quickly.";
});
