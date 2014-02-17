chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('browsepass.html', {
    'bounds': {
      'width': 640,
      'height': 800,
    }
  });
});
