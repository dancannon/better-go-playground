'use strict';

// Reload client for Chrome Apps & Extensions.
// The reload client has a compatibility with livereload.
// WARNING: only supports reload command.

var LIVERELOAD_HOST = 'localhost:';
var LIVERELOAD_PORT = 35729;
var connection = new WebSocket('ws://' + LIVERELOAD_HOST + LIVERELOAD_PORT + '/livereload');

connection.onerror = function (error) {
  console.log('reload connection got error:', error);
};

connection.onmessage = function (e) {
  if (e.data) {
    var data = JSON.parse(e.data);
    if (data && data.command === 'reload') {
      chrome.runtime.reload();
    }
  }
};

chrome.commands.onCommand.addListener(function (command) {

  if (command === "run-code") {
    executeOnActiveTab(runCode);
  }
  if (command === "format-code") {
    executeOnActiveTab(formatCode);
  }
  if (command === "reset-code") {
    executeOnActiveTab(resetCode);
  }
});

function runCode() {
  document.getElementById("run").click();
  console.log("runCode executed!");
}

function formatCode() {
  document.getElementById("fmt").click();
  console.log("formatCode executed!");
}

function resetCode() {
  document.getElementById("reset").click();
  console.log("resetCode executed!");
}

function executeOnActiveTab(method) {
  chrome.tabs.executeScript({
    code: '(' + method + ')();'
  }, (results) => {

    console.log("executed" + method)
  });
}