// Web-specific configuration to fix clickability issues
if (typeof document !== 'undefined') {
  // Add global styles for web to ensure all touchable elements are clickable
  const style = document.createElement('style');
  style.textContent = `
    * {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    
    button, a, [role="button"], [onclick] {
      cursor: pointer !important;
      pointer-events: auto !important;
    }
    
    input, textarea {
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
    }
  `;
  document.head.appendChild(style);
}
