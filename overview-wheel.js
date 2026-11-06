'use strict';

(() => {
  const sections = [
    ['Ideas & copy', '/classic#ideas', '✎'],
    ['Post templates', '/classic#templates', '▦', '400'],
    ['Design studio', '/classic#studio', '▧'],
    ['Animation studio', '#animation', '✧'],
    ['AI creation', '/classic#creation', '✦'],
    ['Calendar', '/classic#calendar', '▦'],
    ['Saved archive', '/classic#archive', '▣'],
    ['The agents', '#agents', '⌘'],
    ['Brand & settings', '/classic#settings', '⚙'],
  ];
  const colors = [['#075985','#7edfff'],['#164785','#a8d5ff'],['#4c318c','#c6adff'],['#80315e','#ffaccb'],['#914424','#ffc297'],['#765215','#ffe096'],['#16634d','#9af0cf'],['#115c69','#8ce3e4']];
  const wheel = document.querySelector('#studioWheel');
  const point = (radius, angle) => {
    const radians = angle * Math.PI / 180;
    return [220 + radius * Math.cos(radians), 220 + radius * Math.sin(radians)].map(n => n.toFixed(2)).join(' ');
  };

  const sector = 360 / sections.length;
  wheel.innerHTML = `<defs>${colors.map(([dark, light], index) => `
    <linearGradient id="water-segment-${index}" x2="0.72" y2="1">
      <stop stop-color="${light}"/><stop offset=".42" stop-color="${dark}"/><stop offset="1" stop-color="${dark}"/>
    </linearGradient>`).join('')}</defs><g class="wheel-rotor">${sections.map(([name, href, icon, count], index) => {
      const middle = -90 + index * sector;
      const start = middle - sector / 2 + 0.55;
      const end = middle + sector / 2 - 0.55;
      const [x, y] = point(150, middle).split(' ');
      const shape = `M ${point(205, start)} A 205 205 0 0 1 ${point(205, end)} L ${point(75, end)} A 75 75 0 0 0 ${point(75, start)} Z`;
      const words = name.split(' ');
      const lines = words.length > 1 ? [words.slice(0, -1).join(' '), words.at(-1)] : words;
      return `<a href="${href}" aria-label="Open ${name}${count?' '+count:''}"><title>${name}</title><path d="${shape}" fill="url(#water-segment-${index % colors.length})"/><g transform="translate(${x} ${y})"><g class="wheel-label"><text y="-8" class="wheel-icon">${icon}</text>${lines.map((line, n) => `<text y="${7 + n * 12}">${line}</text>`).join('')}${count?`<text y="31" class="wheel-number">${count}</text>`:''}</g></g></a>`;
    }).join('')}</g>`;

  const control = document.querySelector('#wheelMotion');
  control.addEventListener('click', () => {
    const paused = wheel.classList.toggle('rotation-paused');
    control.setAttribute('aria-pressed', String(paused));
    control.textContent = paused ? 'Resume rotation' : 'Pause rotation';
  });
})();
