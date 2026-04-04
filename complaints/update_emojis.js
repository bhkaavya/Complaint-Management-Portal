const fs = require('fs');
const path = require('path');

const files = ['admin.html', 'authenticator.html', 'student.html', 'app.js', 'update_ui.js'];

files.forEach(file => {
  const fp = path.join(__dirname, file);
  if (fs.existsSync(fp)) {
    let content = fs.readFileSync(fp, 'utf8');
    
    // Quick CDN injection for HTML files if missing
    if (fp.endsWith('.html') && !content.includes('unpkg.com/@phosphor-icons/web')) {
      content = content.replace('<link rel="stylesheet" href="styles.css" />', '<script src="https://unpkg.com/@phosphor-icons/web"></script>\\n    <link rel="stylesheet" href="styles.css" />');
    }

    // Replace native emojis using regex global replacements
    content = content.replace(/🏫/g, '<i class="ph ph-buildings"></i>');
    content = content.replace(/>☀️</g, '><i class="ph ph-sun" id="theme-icon"></i><');
    content = content.replace(/🔔/g, '<i class="ph ph-bell"></i>');
    content = content.replace(/📊/g, '<i class="ph ph-chart-bar"></i>');
    content = content.replace(/📥/g, '<i class="ph ph-tray-arrow-down"></i>');
    
    // Some tags have specific colors that were applied via UI classes, 
    // replacing the core icons while allowing those classes to map the colors
    content = content.replace(/❌/g, '<i class="ph ph-x-circle"></i>');
    content = content.replace(/✅/g, '<i class="ph ph-check-circle"></i>');
    content = content.replace(/⏳/g, '<i class="ph ph-hourglass"></i>');
    content = content.replace(/🎉/g, '<i class="ph ph-check-circle"></i>');

    // Headers & Specific Icons
    content = content.replace(/🍩([^<]*)/g, '<i class="ph ph-chart-pie-slice"></i>$1');
    content = content.replace(/🏛️([^<]*)/g, '<i class="ph ph-bank"></i>$1');
    content = content.replace(/📝([^<]*)/g, '<i class="ph ph-note-pencil"></i>$1');
    content = content.replace(/📋([^<]*)/g, '<i class="ph ph-list-clipboard"></i>$1');
    content = content.replace(/📭([^<]*)/g, '<i class="ph ph-envelope-simple-open" style="font-size:2rem;"></i>$1');
    content = content.replace(/🎯([^<]*)/g, '<i class="ph ph-target" style="font-size:2rem;"></i>$1');
    content = content.replace(/📍/g, '<i class="ph ph-map-pin"></i>');
    
    // Clean string replacements mapping arrays
    content = content.replace(/👥([^<]*)/g, '<i class="ph ph-users"></i>$1');
    content = content.replace(/📸([^<]*)/g, '<i class="ph ph-camera"></i>$1');
    content = content.replace(/🕵️/g, '<i class="ph ph-detective"></i>');
    content = content.replace(/⏱/g, '<i class="ph ph-clock"></i>');
    content = content.replace(/⚠️/g, '<i class="ph ph-warning"></i>');
    content = content.replace(/ℹ️/g, '<i class="ph ph-info"></i>');
    content = content.replace(/👍/g, '<i class="ph ph-thumbs-up"></i>');

    // Clean up empty emojis in lists
    content = content.replace(/🍽️ /g, '');
    content = content.replace(/📚 /g, '');
    content = content.replace(/🏠 /g, '');
    content = content.replace(/📖⚽ /g, '');
    content = content.replace(/🛡️ /g, '');
    content = content.replace(/🚌 /g, '');
    content = content.replace(/🏗️ /g, '');
    content = content.replace(/🧹 /g, '');

    fs.writeFileSync(fp, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
