const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

// Set tighter corporate radiuses
css = css.replace('--radius-sm: 8px;', '--radius-sm: 6px;');
css = css.replace('--radius-md: 12px;', '--radius-md: 8px;');
css = css.replace('--radius-lg: 16px;', '--radius-lg: 12px;');
css = css.replace('--radius-xl: 20px;', '--radius-xl: 16px;');

// Inject precise vector class rules
if (!css.includes('.ph {')) {
  css += `
.ph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
}`;
}

// Decrease button box shadows
css = css.replace('box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);', 'box-shadow: 0 4px 14px rgba(99, 102, 241, 0.15);');
css = css.replace('box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);', 'box-shadow: 0 6px 16px rgba(99, 102, 241, 0.25);');

css = css.replace('box-shadow: 0 4px 14px rgba(244, 63, 94, 0.3);', 'box-shadow: 0 4px 14px rgba(244, 63, 94, 0.15);');
css = css.replace('box-shadow: 0 8px 20px rgba(244, 63, 94, 0.4);', 'box-shadow: 0 6px 16px rgba(244, 63, 94, 0.25);');

css = css.replace('box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);', 'box-shadow: 0 4px 14px rgba(16, 185, 129, 0.15);');
css = css.replace('box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);', 'box-shadow: 0 6px 16px rgba(16, 185, 129, 0.25);');

fs.writeFileSync('styles.css', css, 'utf8');
console.log("CSS Tokens & Utilities Refined.");
