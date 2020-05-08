'use strict';

// Insert the val override script into the page. This is done by creating a
// script to ensure it overrides the jQuery used by the original playground JS
var s = document.createElement('script');
s.src = chrome.extension.getURL('scripts/val_with_change.js');
(document.head||document.documentElement).appendChild(s);

var defaultFileBase64 = 'cGFja2FnZSBtYWluCgppbXBvcnQgKAoJImZtdCIKKQoKZnVuYyBtYWluKCkgewoJZm10LlByaW50bG4oIkhlbGxvLCBwbGF5Z3JvdW5kIikKfQo='

$(function () {
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

  // Insert the new textarea
  var wrapEl = $('<div id="better-wrap"></div>');
  var codeEl = $('<div id="better-code"></div>');
  var oldCodeEl = $('#code');
  var oldWrapEl = $('#wrap');
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

  // Keep the textareas in sync
  editor.getSession().setValue(oldCodeEl.val());
  editor.getSession().on('change', function(){
    oldCodeEl.val(editor.getSession().getValue(), true);
  });
  oldCodeEl.on('val-change', function() {
    editor.getSession().setValue(oldCodeEl.val());
  })

  // If the editor contains the default script then move cursor to the main func
  if (window.btoa(editor.getSession().getValue()) === defaultFileBase64) {
    editor.navigateTo(7, 33)
  }
  editor.focus();

  // Add reset button
  var originalContents = oldCodeEl.val()
  var bannerEl = document.getElementById('banner');
  var importsEl = document.getElementById('importsBox');
  var resetEl = $('<input type="button" value="Reset" id="reset">')
  resetEl.click(function(e) {
    editor.setValue(originalContents, -1);
  });
  bannerEl.insertBefore(resetEl[0], importsEl)

  // Setup theme and toggle button
  var themeEl = $('<input type="button" value="Dark" id="toggleTheme">')
  themeEl.click(toggleTheme);
  var theme = localStorage.getItem('ace_theme')
  if (theme) {
    setTheme(theme)
  }
  var aboutEl = document.getElementById('aboutButton');
  bannerEl.insertBefore(themeEl[0], aboutEl);
});
