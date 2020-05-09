'use strict';


// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this,
      args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
}
// Don't load if localStorage isn't supported
function localStorageSupported() {
  try {
    return !!localStorage.getItem;
  } catch (e) {
    return false;
  }
}

// setItem wrapper to fix some localStorage issues in *le* iPad
// More info: http://stackoverflow.com/questions/2603682/
function setLocalStorageKey(key, val) {
  localStorage.removeItem(key);
  localStorage.setItem(key, val);
}

// Insert the val override script into the page. This is done by creating a
// script to ensure it overrides the jQuery used by the original playground JS
var s = document.createElement('script');
s.src = chrome.extension.getURL('scripts/val_with_change.js');
(document.head || document.documentElement).appendChild(s);
var defaultFileBase64 = 'cGFja2FnZSBtYWluCgppbXBvcnQgKAoJImZtdCIKKQoKZnVuYyBtYWluKCkgewoJZm10LlByaW50bG4oIkhlbGxvLCBwbGF5Z3JvdW5kIikKfQo=';

$(function () {

  var dirty = {};
  var dataRestored = false;

  function getAutosaveID(name) {
    return 'textareas-autosave/' + (name || 'new');
  }

  // Load text for the textarea if clicked and it's empty
  function loadTextarea(name) {
    var id = getAutosaveID(name),
      should_restore;
    // Only attempt to restore if there's saved content
    // and we haven't restored it yet.
    if (localStorage.getItem(id) && !dataRestored) {
      should_restore =
        // Empty..
        editor.getValue().length === 0 ||
        // ..or different that what we have saved
        (editor.getValue() !== localStorage.getItem(id));
      if (should_restore) {
        editor.setValue(localStorage.getItem(id));
        dataRestored = true;
        dirty[getAutosaveID(window.location.href)] = true;
      } else {
        // Remove saved content if user does not wish to restore
        localStorage.removeItem(id);
      }
    }
  }

  // Iterate over all textareas to see if they should be cleared
  // from the DOM
  function resetEmptyTextareas(id) {
    var _id = getAutosaveID(id),
      is_saved = localStorage.getItem(_id),
      is_empty = editor.getValue() ? editor.getValue().length === 0 : true,
      is_dirty = dirty[_id];

    if (is_saved && is_empty && is_dirty) {
      localStorage.removeItem(_id);
    }
  }

  function addResetButton(editor) {
    var bannerEl = document.getElementById('banner');
    var importsEl = document.getElementById('importsBox');
    var resetEl = $('<input type="button" value="Reset" id="reset">');
    resetEl.click(function (e) {
      editor.setValue(originalContents, -1);
      oldCodeEl.val(originalContents);

      var event = document.createEvent('Event');
      event.initEvent('input', true, true);
      oldCodeEl.get(0).dispatchEvent(event);
    });
    bannerEl.insertBefore(resetEl[0], importsEl);
}

  function setTheme(editor, themeEl, theme) {
    if (theme === 'ace/theme/solarized_light') {
      editor.setTheme('ace/theme/solarized_light');
      themeEl.attr('value', 'Dark');
      $('body').attr('class', 'theme-light');
    } else {
      editor.setTheme('ace/theme/tomorrow_night');
      themeEl.attr('value', 'Light');
      $('body').attr('class', 'theme-dark');
    }

    localStorage.setItem('ace_theme', theme);
  }

  function toggleTheme(editor) {
    if (editor.getTheme() === 'ace/theme/solarized_light') {
      setTheme('ace/theme/tomorrow_night');
    } else {
      setTheme('ace/theme/solarized_light');
    }
  }

  function addThemeButton(editor) {
    var bannerEl = document.getElementById('banner');
    var themeEl = $('<input type="button" value="Dark" id="toggleTheme">');
    themeEl.click(toggleTheme);
    var theme = localStorage.getItem('ace_theme');

    if (theme) {
      setTheme(editor, themeEl, theme);
    }

    var aboutEl = document.getElementById('aboutButton');
    bannerEl.insertBefore(themeEl[0], aboutEl);
  }

  // Insert the new textarea
  var wrapEl = $('<div id="better-wrap"></div>');
  var codeEl = $('<div id="better-code"></div>');
  var oldCodeEl = $('#code');
  var oldWrapEl = $('#wrap');

  // Save original contents for reset functionality
  var originalContents = oldCodeEl.val();

  wrapEl.html(codeEl);
  $(wrapEl).insertAfter(oldWrapEl);

  ace.require('ace/ext/language_tools');
  ace.require('ace/snippets/golang');
  var editor = ace.edit('better-code');
  editor.$blockScrolling = Infinity
  editor.setTheme('ace/theme/solarized_light');
  editor.getSession().setMode('ace/mode/golang');
  editor.setOptions({
    fontSize: '11pt',
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: false
  });

  // Register keyboard shortcuts
  editor.commands.addCommand({
    name: 'run',
    bindKey: {
      win: 'Shift-Enter',
      mac: 'Shift-Enter'
    },
    exec: function(editor) {
      $('#run').click()
    },
    readOnly: true // false if this command should not apply in readOnly mode
  });
  editor.commands.addCommand({
    name: 'fmt',
    bindKey: {
      win: 'Ctrl-Enter',
      mac: 'Command-Enter'
    },
    exec: function(editor) {
      $('#fmt').click()
    },
    readOnly: true // false if this command should not apply in readOnly mode
  });
  editor.commands.addCommand({
    name: 'share',
    bindKey: {
      win: 'Ctrl-S',
      mac: 'Command-Shift-S'
    },
    exec: function(editor) {
      $('#share').click()
      return false
    },
    readOnly: true // false if this command should not apply in readOnly mode
  });

  // Keep the textareas in sync
  editor.getSession().setValue(oldCodeEl.val());
  editor.getSession().on('change', function () {
    oldCodeEl.val(editor.getSession().getValue());

    var event = document.createEvent('Event');
    event.initEvent('input', true, true);
    oldCodeEl.get(0).dispatchEvent(event);
  });
  oldCodeEl.on('val-change', function () {
    var currPos = editor.getCursorPosition();
    editor.getSession().setValue(oldCodeEl.val());
    editor.navigateTo(currPos.row, currPos.column);
  });

  // Detect changes to output and update error annotations if required
  $('#output').bind('DOMSubtreeModified', function(){
    var error = $(this).find('.stderr').text();
    var annotations = [];

    var regex = /[a-z]+.go:([0-9]+):(([0-9]+):)?(.*)/gm;
    var r = regex.exec(error);
    while (r) {
      annotations.push({
        row: parseInt(r[1] - 1),
        column: parseInt(r[3]),
        text: r[4],
        type: 'error'
      });

      r = regex.exec(error);
    }

    editor.getSession().setAnnotations(annotations);
  })

  // Add support for local history
  var saveTextarea = debounce(function(event) {
    setLocalStorageKey(getAutosaveID(window.location.href), editor.getValue());
    dataRestored = true;
    dirty[getAutosaveID(window.location.href)] = true;
  }, 200);

  editor.getSession().on('change', saveTextarea);
  loadTextarea(window.location.href);

  // If the editor contains the default script then move cursor to the main func
  if (window.btoa(editor.getSession().getValue()) === defaultFileBase64) {
    editor.navigateTo(7, 33);
  }

  editor.focus();

  addResetButton(editor)
  addThemeButton(editor)
});
