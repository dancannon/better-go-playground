// Copyright 2012 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
/*
In the absence of any formal way to specify interfaces in JavaScript,
here's a skeleton implementation of a playground transport.
        function Transport() {
                // Set up any transport state (eg, make a websocket connnection).
                return {
                        Run: function(body, output, options) {
                                // Compile and run the program 'body' with 'options'.
        // Call the 'output' callback to display program output.
                                return {
                                        Kill: function() {
                                                // Kill the running program.
                                        }
                                };
                        }
                };
        }
  // The output callback is called multiple times, and each time it is
  // passed an object of this form.
        var write = {
                Kind: 'string', // 'start', 'stdout', 'stderr', 'end'
                Body: 'string'  // content of write or end status message
        }
  // The first call must be of Kind 'start' with no body.
  // Subsequent calls may be of Kind 'stdout' or 'stderr'
  // and must have a non-null Body string.
  // The final call should be of Kind 'end' with an optional
  // Body string, signifying a failure ("killed", for example).
  // The output callback must be of this form.
  // See PlaygroundOutput (below) for an implementation.
        function outputCallback(write) {
        }
*/
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

function HTTPTransport() {

  // TODO(adg): support stderr

  function playback(output, events) {
    var timeout;
    output({
      Kind: 'start'
    });

    function next() {
      if (events.length === 0) {
        output({
          Kind: 'end'
        });
        return;
      }
      var e = events.shift();
      if (e.Delay === 0) {
        output({
          Kind: 'stdout',
          Body: e.Message
        });
        next();
        return;
      }
      timeout = setTimeout(function() {
        output({
          Kind: 'stdout',
          Body: e.Message
        });
        next();
      }, e.Delay / 1000000);
    }
    next();
    return {
      Stop: function() {
        clearTimeout(timeout);
      }
    };
  }

  function error(output, msg) {
    output({
      Kind: 'start'
    });
    output({
      Kind: 'stderr',
      Body: msg
    });
    output({
      Kind: 'end'
    });

    lineHighlight(msg);
  }

  var seq = 0;
  return {
    Run: function(body, output, options) {
      seq++;
      var cur = seq;
      var playing = null;
      $.ajax('/compile', {
        type: 'POST',
        data: {
          'version': 2,
          'body': body
        },
        dataType: 'json',
        success: function(data) {
          if (seq !== cur) return;
          if (!data) return;
          if (playing != null) playing.Stop();
          if (data.Errors) {
            error(output, data.Errors);
            return;
          }
          playing = playback(output, data.Events);
        },
        error: function() {
          error(output, 'Error communicating with remote server.');
        }
      });
      return {
        Kill: function() {
          if (playing !== null) {
            playing.Stop();
          }

          output({
            Kind: 'end',
            Body: 'killed'
          });
        }
      };
    }
  };
}

function SocketTransport() {
  'use strict';

  var id = 0;
  var outputs = {};
  var started = {};
  var websocket = new WebSocket('ws://' + window.location.host + '/socket');

  websocket.onclose = function() {
    console.log('websocket connection closed');
  };

  websocket.onmessage = function(e) {
    var m = JSON.parse(e.data);
    var output = outputs[m.Id];
    if (output === null) {
      return;
    }
    if (!started[m.Id]) {
      output({
        Kind: 'start'
      });
      started[m.Id] = true;
    }
    output({
      Kind: m.Kind,
      Body: m.Body
    });
  }

  function send(m) {
    websocket.send(JSON.stringify(m));
  }

  return {
    Run: function(body, output, options) {
      var thisID = id + '';
      id++;
      outputs[thisID] = output;
      send({
        Id: thisID,
        Kind: 'run',
        Body: body,
        Options: options
      });
      return {
        Kill: function() {
          send({
            Id: thisID,
            Kind: 'kill'
          });
        }
      };
    }
  };
}

function PlaygroundOutput(el) {
  'use strict';

  return function(write) {
    if (write.Kind == 'start') {
      el.innerHTML = '';
      return;
    }

    var cl = 'system';
    if (write.Kind == 'stdout' || write.Kind == 'stderr')
      cl = write.Kind;

    var m = write.Body;
    if (write.Kind == 'end')
      m = '\nProgram exited' + (m ? (': ' + m) : '.');

    if (m.indexOf('IMAGE:') === 0) {
      // TODO(adg): buffer all writes before creating image
      var url = 'data:image/png;base64,' + m.substr(6);
      var img = document.createElement('img');
      img.src = url;
      el.appendChild(img);
      return;
    }

    // ^L clears the screen.
    var s = m.split('\x0c');
    if (s.length > 1) {
      el.innerHTML = '';
      m = s.pop();
    }

    m = m.replace(/&/g, '&amp;');
    m = m.replace(/</g, '&lt;');
    m = m.replace(/>/g, '&gt;');

    var needScroll = (el.scrollTop + el.offsetHeight) == el.scrollHeight;

    var span = document.createElement('span');
    span.className = cl;
    span.innerHTML = m;
    el.appendChild(span);

    if (needScroll) {
      el.scrollTop = el.scrollHeight - el.offsetHeight;
    }
  }
}

function lineHighlight(error) {
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
}

function highlightOutput(wrappedOutput) {
  return function(write) {
    if (write.Body) lineHighlight(write.Body);
    wrappedOutput(write);
  }
}

var editor;

// opts is an object with these keys
//  codeEl - code editor element
//  outputEl - program output element
//  runEl - run button element
//  fmtEl - fmt button element (optional)
//  fmtImportEl - fmt "imports" checkbox element (optional)
//  shareEl - share button element (optional)
//  shareURLEl - share URL text input element (optional)
//  shareRedirect - base URL to redirect to on share (optional)
//  toysEl - toys select element (optional)
//  enableHistory - enable using HTML5 history API (optional)
//  transport - playground transport to use (default is HTTPTransport)
function playground(opts) {
  editor = opts.editor;
  var code = $(opts.codeEl);
  var transport = opts['transport'] || new HTTPTransport();
  var running;

  editor.commands.addCommand({
    name: 'run',
    bindKey: {
      win: 'Shift-Enter',
      mac: 'Shift-Enter'
    },
    exec: function(editor) {
      run();
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
      fmt();
    },
    readOnly: true // false if this command should not apply in readOnly mode
  });
  editor.commands.addCommand({
    name: 'share',
    bindKey: {
      win: 'Ctrl-Shift-S',
      mac: 'Command-Shift-S'
    },
    exec: function(editor) {
      share();
    },
    readOnly: true // false if this command should not apply in readOnly mode
  });
  editor.commands.addCommand({
    name: 'share',
    bindKey: {
      win: 'Ctrl-Shift-F',
      mac: 'Command-Shift-F'
    },
    exec: function(editor) {
      share();
      return false;
    },
    readOnly: true // false if this command should not apply in readOnly mode
  });

  var outdiv = $(opts.outputEl).empty();
  var output = $('<pre/>').appendTo(outdiv);

  function body() {
    return opts.editor.getValue();
  }

  function setBody(text) {
    var currPos = editor.getCursorPosition();
    editor.setValue(text);
    editor.navigateTo(currPos.row, currPos.column);
  }

  function origin(href) {
    return ("" + href).split("/").slice(0, 3).join("/");
  }

  var pushedEmpty = (window.location.pathname == "/");

  function inputChanged() {
    if (pushedEmpty) {
      return;
    }
    pushedEmpty = true;
    $(opts.shareURLEl).hide();
    window.history.pushState(null, "", "/");
  }

  function popState(e) {
    if (e === null) {
      return;
    }
    if (e && e.state && e.state.code) {
      setBody(e.state.code);
    }
  }
  var rewriteHistory = false;
  if (window.history && window.history.pushState && window.addEventListener && opts.enableHistory) {
    rewriteHistory = true;
    editor.getSession().on('change', inputChanged);
    window.addEventListener('popstate', popState);
  }

  function setError(error) {
    if (running) running.Kill();
    editor.getSession().clearAnnotations();
    lineHighlight(error);
    output.empty().addClass("error").text(error);
  }

  function loading() {
    editor.getSession().clearAnnotations();
    if (running) running.Kill();
    output.removeClass("error").text('Waiting for remote server...');
  }

  function run() {
    loading();
    running = transport.Run(body(), highlightOutput(PlaygroundOutput(output[0])));
  }

  function fmt() {
    loading();
    var data = {
      "body": body()
    };
    if ($(opts.fmtImportEl).is(":checked")) {
      data["imports"] = "true";
    }
    $.ajax("/fmt", {
      data: data,
      type: "POST",
      dataType: "json",
      success: function(data) {
        if (data.Error) {
          setError(data.Error);
        } else {
          setBody(data.Body);
          output.removeClass("error").text('Formatted');
        }
      }
    });
  }

  function share() {
    if (sharing) return;
    sharing = true;
    var sharingData = body();
    $.ajax("/share", {
      processData: false,
      data: sharingData,
      type: "POST",
      complete: function(xhr) {
        sharing = false;
        if (xhr.status != 200) {
          alert("Server error; try again.");
          return;
        }
        if (opts.shareRedirect) {
          window.location = opts.shareRedirect + xhr.responseText;
        }
        if (shareURL) {
          var path = "/p/" + xhr.responseText;
          var url = origin(window.location) + path;
          shareURL.show().val(url).focus().select();

          if (rewriteHistory) {
            var historyData = {
              "code": sharingData
            };
            window.history.pushState(historyData, "", path);
            pushedEmpty = false;
          }

          resetEmptyTextareas(url);
        }
      }
    });
  }

  var dirty = {};
  var dataRestored = false;

  function getId(name) {
    return "textareas-autosave/" + (name || 'new');
  }

  // setItem wrapper to fix some localStorage issues in *le* iPad
  // More info: http://stackoverflow.com/questions/2603682/
  function setkey(key, val) {
    localStorage.removeItem(key);
    localStorage.setItem(key, val);
  }

  // Load text for the textarea if clicked and it's empty
  function loadTextarea(name) {
    var id = getId(name),
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
        dirty[getId(window.location.href)] = true;
      } else {
        // Remove saved content if user does not wish to restore
        localStorage.removeItem(id);
      }
    }
  }

  // Iterate over all textareas to see if they should be cleared
  // from the DOM
  function resetEmptyTextareas(id) {
    var _id = getId(id),
      is_saved = localStorage.getItem(_id),
      is_empty = editor.getValue() ? editor.getValue().length === 0 : true,
      is_dirty = dirty[_id];

    if (is_saved && is_empty && is_dirty) {
      localStorage.removeItem(_id);
    }
  }

  var saveTextarea = debounce(function(event) {
    setkey(getId(window.location.href), editor.getValue());
    dataRestored = true;
    dirty[getId(window.location.href)] = true;
  }, 200);

  $(opts.runEl).click(run);
  $(opts.fmtEl).click(fmt);

  if (opts.autosave) {
    editor.getSession().on('change', saveTextarea);
    loadTextarea(window.location.href);
  }

  if (opts.shareEl !== null && (opts.shareURLEl !== null || opts.shareRedirect !== null)) {
    var shareURL;
    if (opts.shareURLEl) {
      shareURL = $(opts.shareURLEl).hide();
    }
    var sharing = false;
    $(opts.shareEl).click(share);
  }
}
