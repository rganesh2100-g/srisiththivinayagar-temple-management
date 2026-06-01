export const setFontSize = (size) => {
  const sizeMap = {
    'small': '14px',
    'normal': '16px',
    'large': '20px'
  };
  
  const pxSize = sizeMap[size] || '16px';
  document.documentElement.style.fontSize = pxSize;
  localStorage.setItem('fontSizePreference', size);
};

export const getFontSize = () => {
  return localStorage.getItem('fontSizePreference') || 'normal';
};

export const initializeFontSize = () => {
  const size = getFontSize();
  setFontSize(size);
};