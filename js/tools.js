// Tools Page Script

(function () {
  // Tab switching
  var tabs = document.querySelectorAll('.tools-tab');
  var panels = document.querySelectorAll('.tools-panel');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = this.dataset.tab;
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      this.classList.add('active');
      var panel = document.getElementById('panel-' + target);
      if (panel) panel.classList.add('active');
    });
  });

  // ==========================================
  // Image Compression
  // ==========================================

  var dropzone = document.getElementById('dropzone');
  var imgInput = document.getElementById('imgInput');

  if (dropzone && imgInput) {
    var compressControls = document.getElementById('compressControls');
    var qualitySlider = document.getElementById('qualitySlider');
    var qualityValue = document.getElementById('qualityValue');
    var maxWidth = document.getElementById('maxWidth');
    var compressAll = document.getElementById('compressAll');
    var compressResults = document.getElementById('compressResults');

    var imageFiles = [];
    var compressedResults = [];

    var selectBtn = document.getElementById('selectBtn');

    qualitySlider.addEventListener('input', function () {
      qualityValue.textContent = this.value + '%';
    });

    // Button click opens file dialog
    selectBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      imgInput.click();
    });

    // Drag & drop
    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      this.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', function () {
      this.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('drag-over');
      handleFiles(e.dataTransfer.files);
    });

    imgInput.addEventListener('change', function () {
      handleFiles(this.files);
      this.value = '';
    });

    function handleFiles(files) {
      imageFiles = Array.from(files).filter(function (f) { return f.type.startsWith('image/'); });
      if (imageFiles.length === 0) return;

      compressControls.style.display = 'block';

      imageFiles.forEach(function (file, i) {
        var reader = new FileReader();
        reader.onload = function (e) {
          compressImage(e.target.result, file, i);
        };
        reader.readAsDataURL(file);
      });
    }

    function compressImage(dataUrl, file, index) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var width = img.width;
        var height = img.height;
        var targetWidth = parseInt(maxWidth.value) || 1920;

        if (width > targetWidth) {
          height = Math.round((targetWidth / width) * height);
          width = targetWidth;
        }

        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        var quality = parseInt(qualitySlider.value) / 100;
        var compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        var originalSize = file.size;

        var base64Len = compressedDataUrl.length - compressedDataUrl.indexOf(',') - 1;
        var compressedSize = Math.round(base64Len * 0.75);

        var result = {
          name: file.name,
          originalSize: originalSize,
          compressedSize: compressedSize,
          originalUrl: dataUrl,
          compressedUrl: compressedDataUrl,
          index: index
        };
        compressedResults[index] = result;
        renderResult(result, index);
      };
      img.src = dataUrl;
    }

    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(2) + ' MB';
    }

    function renderResult(r, index) {
      var existing = compressResults.querySelector('[data-index="' + index + '"]');
      if (existing) existing.remove();

      var saved = r.originalSize - r.compressedSize;
      var percent = r.originalSize > 0 ? Math.round((saved / r.originalSize) * 100) : 0;

      var div = document.createElement('div');
      div.className = 'result-item';
      div.dataset.index = index;
      div.innerHTML =
        '<div class="result-preview"><img src="' + r.compressedUrl + '" alt=""></div>' +
        '<div class="result-info">' +
          '<div class="result-name">' + escapeHtml(r.name) + '</div>' +
          '<div class="result-stats">' +
            '<span>' + formatSize(r.originalSize) + ' → ' + formatSize(r.compressedSize) + '</span>' +
            '<span class="saved">- ' + percent + '% (' + formatSize(saved) + ')</span>' +
          '</div>' +
        '</div>' +
        '<div class="result-actions">' +
          '<button class="download-one">下载</button>' +
        '</div>';

      div.querySelector('.download-one').addEventListener('click', function () {
        downloadFile(r.compressedUrl, r.name.replace(/\.\w+$/, '') + '_compressed.jpg');
      });

      compressResults.appendChild(div);
    }

    compressAll.addEventListener('click', function () {
      compressResults.innerHTML = '';
      compressedResults = [];

      imageFiles.forEach(function (file, i) {
        var reader = new FileReader();
        reader.onload = function (e) {
          compressImage(e.target.result, file, i);
        };
        reader.readAsDataURL(file);
      });
    });

    function downloadFile(dataUrl, filename) {
      var a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    function escapeHtml(str) {
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }

  // ==========================================
  // HTML to PDF
  // ==========================================

  var htmlInput = document.getElementById('htmlInput');
  var previewFrame = document.getElementById('previewFrame');
  var previewPaper = document.getElementById('previewPaper');
  var exportPdf = document.getElementById('exportPdf');
  var pageSize = document.getElementById('pageSize');
  var clearHtml = document.getElementById('clearHtml');
  var toggleBtns = document.querySelectorAll('.toggle-btn');

  if (htmlInput && previewFrame && exportPdf) {
    var currentOrient = 'portrait';

    var pageStyles = {
      a4: { width: '210mm', minHeight: '297mm' },
      letter: { width: '216mm', minHeight: '279mm' },
      legal: { width: '216mm', minHeight: '357mm' }
    };

    var updateTimer = null;

    htmlInput.addEventListener('input', function () {
      clearTimeout(updateTimer);
      updateTimer = setTimeout(updatePreview, 400);
    });

    pageSize.addEventListener('change', updatePreview);

    toggleBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleBtns.forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        currentOrient = this.dataset.orient;
        updatePreview();
      });
    });

    clearHtml.addEventListener('click', function () {
      htmlInput.value = '';
      updatePreview();
    });

    function getPageCSS() {
      var size = pageStyles[pageSize.value] || pageStyles.a4;
      if (currentOrient === 'landscape') {
        return 'size: ' + size.minHeight + ' ' + size.width + ';';
      }
      return 'size: ' + size.width + ' ' + size.minHeight + ';';
    }

    function updatePreview() {
      var html = htmlInput.value || '<p style="color:#999;text-align:center;margin-top:80px;">在左侧输入 HTML 代码即可预览</p>';
      var pageCSS = getPageCSS();

      var doc =
        '<!DOCTYPE html><html><head><meta charset="utf-8">' +
        '<style>' +
        '@page { ' + pageCSS + ' margin: 20mm; }' +
        'body{' +
        'font-family:"Noto Serif SC",Georgia,"Songti SC",serif;' +
        'font-size:13px;line-height:1.8;color:#1a1a1a;' +
        'max-width:100%;margin:0;padding:0;' +
        '}' +
        'h1{font-size:26px;font-weight:900;margin:0 0 16px;letter-spacing:1px;page-break-after:avoid;}' +
        'h2{font-size:20px;font-weight:700;margin:28px 0 12px;page-break-after:avoid;}' +
        'h3{font-size:16px;font-weight:700;margin:20px 0 8px;page-break-after:avoid;}' +
        'p{margin:0 0 12px;}' +
        'img{max-width:100%;height:auto;margin:12px 0;}' +
        'table{border-collapse:collapse;width:100%;margin:12px 0;font-size:12px;}' +
        'td,th{border:1px solid #ddd;padding:8px 12px;text-align:left;}' +
        'th{background:#f5f5f5;font-weight:600;}' +
        'code{font-family:"DM Mono",monospace;background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:12px;}' +
        'pre{background:#f8f8f8;padding:16px;overflow-x:auto;border-radius:4px;font-size:12px;line-height:1.5;}' +
        'pre code{background:none;padding:0;}' +
        'blockquote{border-left:3px solid #b84040;margin:12px 0;padding:4px 16px;color:#555;font-style:italic;}' +
        'hr{border:none;border-top:1px solid #e5e3da;margin:24px 0;}' +
        'a{color:#b84040;text-decoration:none;}' +
        '@media print{' +
        'body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}' +
        '}' +
        '</style></head><body>' + html + '</body></html>';

      var blob = new Blob([doc], { type: 'text/html' });
      previewFrame.src = URL.createObjectURL(blob);

      // Update paper preview style
      if (previewPaper) {
        previewPaper.classList.toggle('landscape', currentOrient === 'landscape');
      }
    }

    exportPdf.addEventListener('click', function () {
      updatePreview();
      setTimeout(function () {
        previewFrame.contentWindow.focus();
        previewFrame.contentWindow.print();
      }, 600);
    });

    // Init with sample
    htmlInput.value =
      '<h1>示例文档</h1>\n' +
      '<p>在这里粘贴你的 <strong>HTML 代码</strong>，右侧会实时预览渲染效果。</p>\n' +
      '<p>调整上方 <strong>页面尺寸</strong>和<strong>方向</strong>，点击「导出 PDF」按钮，在打印对话框中选择 <strong>"另存为 PDF"</strong> 即可保存。</p>\n' +
      '<hr>\n' +
      '<h2>支持的 HTML 元素</h2>\n' +
      '<ul>\n' +
      '  <li>标题 h1 ～ h6</li>\n' +
      '  <li>段落、图片、链接</li>\n' +
      '  <li>表格、列表</li>\n' +
      '  <li>代码块、引用</li>\n' +
      '  <li>加粗、斜体等文本格式</li>\n' +
      '</ul>\n' +
      '<hr>\n' +
      '<h2>表格示例</h2>\n' +
      '<table>\n' +
      '  <tr><th>名称</th><th>说明</th></tr>\n' +
      '  <tr><td>A4</td><td>210 × 297mm</td></tr>\n' +
      '  <tr><td>Letter</td><td>216 × 279mm</td></tr>\n' +
      '  <tr><td>Legal</td><td>216 × 357mm</td></tr>\n' +
      '</table>';
    updatePreview();
  }

  // ==========================================
  // Video BGM Extraction
  // ==========================================

  var videoDropzone = document.getElementById('videoDropzone');
  var videoInput = document.getElementById('videoInput');
  var videoSelectBtn = document.getElementById('videoSelectBtn');

  if (videoDropzone && videoInput && videoSelectBtn) {
    var videoPlayer = document.getElementById('videoPlayer');
    var videoPreview = document.getElementById('videoPreview');
    var videoFilename = document.getElementById('videoFilename');
    var videoDuration = document.getElementById('videoDuration');
    var videoSize = document.getElementById('videoSize');
    var videoFormat = document.getElementById('videoFormat');
    var extractAudio = document.getElementById('extractAudio');
    var extractProgress = document.getElementById('extractProgress');
    var progressFill = document.getElementById('progressFill');
    var progressText = document.getElementById('progressText');
    var extractResult = document.getElementById('extractResult');
    var audioPreview = document.getElementById('audioPreview');
    var downloadAudio = document.getElementById('downloadAudio');

    var currentVideoFile = null;
    var extractedAudioBlob = null;

    // File selection via button
    videoSelectBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      videoInput.click();
    });

    // Drag & drop for video
    videoDropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      this.classList.add('drag-over');
    });

    videoDropzone.addEventListener('dragleave', function () {
      this.classList.remove('drag-over');
    });

    videoDropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('drag-over');
      var files = e.dataTransfer.files;
      if (files.length > 0) loadVideo(files[0]);
    });

    videoInput.addEventListener('change', function () {
      if (this.files.length > 0) loadVideo(this.files[0]);
      this.value = '';
    });

    function loadVideo(file) {
      if (!file.type.startsWith('video/')) return;
      currentVideoFile = file;

      var url = URL.createObjectURL(file);
      videoPlayer.src = url;
      videoPreview.style.display = 'block';
      videoDropzone.style.display = 'none';
      extractResult.style.display = 'none';
      extractProgress.style.display = 'none';
      extractedAudioBlob = null;

      videoFilename.textContent = file.name;
      videoSize.textContent = formatFileSize(file.size);
      videoFormat.textContent = file.type.replace('video/', '').toUpperCase();

      videoPlayer.onloadedmetadata = function () {
        var dur = videoPlayer.duration;
        var mins = Math.floor(dur / 60);
        var secs = Math.floor(dur % 60);
        videoDuration.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
      };
    }

    extractAudio.addEventListener('click', function () {
      if (!currentVideoFile) return;
      extractProgress.style.display = 'block';
      extractResult.style.display = 'none';
      progressFill.style.width = '10%';
      progressText.textContent = '正在解码视频音频...';

      var audioContext = null;
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        progressText.textContent = '错误：无法创建音频上下文';
        return;
      }

      var source = audioContext.createMediaElementSource(videoPlayer);

      // Simulate progress since OfflineAudioContext doesn't give real-time feedback
      var progressInterval = setInterval(function () {
        var w = parseFloat(progressFill.style.width) || 10;
        if (w < 90) {
          w += 2;
          progressFill.style.width = w + '%';
        }
      }, 200);

      progressText.textContent = '正在渲染音频...';

      // Use OfflineAudioContext for fast rendering
      var sampleRate = audioContext.sampleRate;
      var duration = videoPlayer.duration;
      var offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

      var offlineSource = offlineCtx.createMediaElementSource(videoPlayer);
      offlineSource.connect(offlineCtx.destination);

      offlineCtx.startRendering().then(function (buffer) {
        clearInterval(progressInterval);
        progressFill.style.width = '95%';

        setTimeout(function () {
          progressFill.style.width = '100%';
          progressText.textContent = '正在生成 WAV 文件...';

          setTimeout(function () {
            var wav = audioBufferToWav(buffer);
            extractedAudioBlob = new Blob([wav], { type: 'audio/wav' });

            var audioUrl = URL.createObjectURL(extractedAudioBlob);
            audioPreview.src = audioUrl;

            extractProgress.style.display = 'none';
            extractResult.style.display = 'flex';

            // Scroll to result
            extractResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 200);
        }, 300);
      }).catch(function (err) {
        clearInterval(progressInterval);
        progressText.textContent = '提取失败：' + err.message;
        console.error(err);
      });
    });

    downloadAudio.addEventListener('click', function () {
      if (!extractedAudioBlob || !currentVideoFile) return;
      var name = currentVideoFile.name.replace(/\.\w+$/, '') + '_bgm.wav';
      var a = document.createElement('a');
      a.href = URL.createObjectURL(extractedAudioBlob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    function audioBufferToWav(buffer) {
      var numChannels = buffer.numberOfChannels;
      var sampleRate = buffer.sampleRate;
      var format = 1; // PCM
      var bitsPerSample = 16;
      var data = [];

      for (var ch = 0; ch < numChannels; ch++) {
        data.push(buffer.getChannelData(ch));
      }

      var blockAlign = numChannels * bitsPerSample / 8;
      var byteRate = sampleRate * blockAlign;
      var dataSize = data[0].length * blockAlign;

      var headerSize = 44;
      var totalSize = headerSize + dataSize;
      var arrayBuffer = new ArrayBuffer(totalSize);
      var view = new DataView(arrayBuffer);

      // RIFF header
      writeString(view, 0, 'RIFF');
      view.setUint32(4, totalSize - 8, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, format, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitsPerSample, true);
      writeString(view, 36, 'data');
      view.setUint32(40, dataSize, true);

      var offset = 44;
      for (var i = 0; i < data[0].length; i++) {
        for (var ch = 0; ch < numChannels; ch++) {
          var sample = Math.max(-1, Math.min(1, data[ch][i]));
          sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          view.setInt16(offset, sample, true);
          offset += 2;
        }
      }

      return arrayBuffer;
    }

    function writeString(view, offset, str) {
      for (var i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    function formatFileSize(bytes) {
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(2) + ' MB';
    }
  }
})();