// Bing Wallpaper Fetcher — pulls daily wallpapers from Bing
// Usage: node fetch-wallpapers.js

var https = require('https');
var fs = require('fs');
var path = require('path');

var postsDir = path.join(__dirname, 'source', '_posts');

function fetchBing(idx) {
  return new Promise(function (resolve) {
    var url = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=' + idx + '&n=8&mkt=zh-CN';
    https.get(url, function (res) {
      var data = '';
      res.on('data', function (chunk) { data += chunk; });
      res.on('end', function () {
        try {
          var json = JSON.parse(data);
          resolve(json.images || []);
        } catch (e) {
          console.error('  [ERROR] Bing idx=' + idx + ': ' + e.message);
          resolve([]);
        }
      });
    }).on('error', function (e) {
      console.error('  [ERROR] Bing idx=' + idx + ': ' + e.message);
      resolve([]);
    });
  });
}

function slugify(text) {
  return text
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

function loadExistingUrls() {
  var urls = new Set();
  if (!fs.existsSync(postsDir)) return urls;
  var files = fs.readdirSync(postsDir).filter(function (f) { return f.endsWith('.md'); });
  files.forEach(function (file) {
    var content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
    var match = content.match(/^source_url:\s*(.+)$/m);
    if (match) urls.add(match[1].trim());
  });
  return urls;
}

function parseDate(dateStr) {
  // Bing date format: 20260604
  if (!dateStr || dateStr.length < 8) return dateStr;
  var y = dateStr.substring(0, 4);
  var m = dateStr.substring(4, 6);
  var d = dateStr.substring(6, 8);
  return y + '-' + m + '-' + d;
}

async function main() {
  console.log('开始抓取 Bing 每日壁纸...\n');

  var existingUrls = loadExistingUrls();
  var allImages = []; // { title, url, date, copyright }

  // Fetch up to ~1 year back (idx 0 to ~340, 8 per request = ~45 requests)
  // Bing API supports idx going back quite far
  var totalFetched = 0;
  var idx = 0;
  var maxRequests = 50; // 50 * 8 = 400 days, ~1 year+
  var emptyStreak = 0;

  while (idx < maxRequests) {
    var images = await fetchBing(idx);
    if (images.length === 0) {
      emptyStreak++;
      if (emptyStreak > 3) break; // No more data
      idx++;
      continue;
    }
    emptyStreak = 0;

    for (var i = 0; i < images.length; i++) {
      var img = images[i];
      var imageUrl = 'https://www.bing.com' + img.url;
      if (existingUrls.has(imageUrl)) continue;

      allImages.push({
        title: img.copyright || img.title || 'Bing 每日壁纸',
        url: imageUrl,
        date: parseDate(img.fullstartdate || img.startdate),
        copyright: img.copyright || ''
      });
      existingUrls.add(imageUrl);
    }

    totalFetched += images.length;
    process.stdout.write('\r  已抓取 ' + totalFetched + ' 张，idx=' + idx + '     ');
    idx++;
  }
  console.log('\n');

  if (allImages.length === 0) {
    console.log('无新壁纸。');
    return;
  }

  // Group by date
  var grouped = {};
  allImages.forEach(function (img) {
    if (!grouped[img.date]) grouped[img.date] = [];
    grouped[img.date].push(img);
  });

  var dates = Object.keys(grouped).sort().reverse();
  var totalPosts = 0;

  // Generate one post per day
  for (var d = 0; d < dates.length; d++) {
    var date = dates[d];
    var items = grouped[date];
    var imageUrls = items.map(function (item) { return item.url; });
    var title = items[0].copyright || 'Bing 每日壁纸';

    var safeTitle = title.replace(/"/g, '\\"').substring(0, 80);
    var isoDate = date + ' 08:00:00';

    var tags = ['Bing', '壁纸', '风景', '每日壁纸'];
    var tagStr = tags.map(function (t) { return '"' + t + '"'; }).join(', ');

    var frontMatter = [
      '---',
      'title: "' + safeTitle + '"',
      'date: ' + isoDate,
      'categories: [风景]',
      'tags: [' + tagStr + ']',
      'source_url: ' + imageUrls[0],
      'source_name: Bing',
      '---'
    ].join('\n');

    var body = [
      '',
      '> Bing 每日壁纸 · ' + date,
      '',
      '## 预览',
      ''
    ];

    imageUrls.forEach(function (url) {
      body.push('![' + safeTitle + '](' + url + ')');
      body.push('');
    });

    body.push('## 下载链接');
    body.push('');
    imageUrls.forEach(function (url, i) {
      body.push('- [下载壁纸 ' + (i + 1) + '](' + url + ')');
    });

    var filename = slugify('bing-' + date) + '.md';
    var filepath = path.join(postsDir, filename);

    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, frontMatter + body.join('\n'), 'utf-8');
      totalPosts++;
      console.log('  + ' + filename + ' (' + imageUrls.length + ' 张)');
    }
  }

  console.log('\n完成！共新增 ' + totalPosts + ' 篇壁纸合集。');
  if (totalPosts > 0) {
    console.log('运行 hexo generate 构建站点。');
  }
}

main().catch(function (e) { console.error(e); process.exit(1); });