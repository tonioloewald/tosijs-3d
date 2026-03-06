import { StyleSheet, XinStyleSheet, vars, Color, invertLuminance } from 'tosijs'
import * as tosijs from 'tosijs'
import * as tosijs3d from '../../src/index'
import { createDocBrowser, applyTheme, createThemeWithLegacy } from 'tosijs-ui'
import docs from '../docs.json'

// Apply the tosijs-ui theme with legacy variable aliases so the doc browser
// components pick up colors via both --tosi-* and legacy --brand-color etc.
const themeColors = {
  accent: Color.fromCss('#EE257B'),
  background: Color.fromCss('#fafafa'),
  text: Color.fromCss('#222222'),
}
applyTheme(createThemeWithLegacy(themeColors), 'tosi3d-theme')

const brandColor = themeColors.accent

const colors: Record<string, any> = {
  _textColor: '#222',
  _brandColor: brandColor,
  _background: '#fafafa',
  _buttonBg: '#fdfdfd',
  _inputBg: '#fdfdfd',
  _backgroundShaded: '#f5f5f5',
  _navBg: brandColor.rotate(30).desaturate(0.5).brighten(0.9),
  _barColor: brandColor.opacity(0.4),
  _focusColor: brandColor.opacity(0.7),
  _placeholderColor: brandColor.opacity(0.4),
  _brandTextColor: brandColor.rotate(30).brighten(0.9),
  _insetBg: brandColor.rotate(45).brighten(0.8),
  _codeBg: brandColor.rotate(-15).desaturate(0.5).brighten(0.9),
  _linkColor: brandColor.rotate(-30).darken(0.5),
  _shadowColor: '#0004',
  _scrollThumbColor: '#0006',
  _scrollBarColor: '#0001',
  _inputBorderShadow: 'inset 0 0 2px #0006',
}

const styleSpec: XinStyleSheet = {
  '@import':
    'https://fonts.googleapis.com/css2?family=Aleo:ital,wght@0,100..900;1,100..900&family=Spline+Sans+Mono:ital,wght@0,300..700;1,300..700&display=swap',
  ':root': {
    _fontFamily: "'Aleo', sans-serif",
    _codeFontFamily: "'Spline Sans Mono', monospace",
    _fontSize: '16px',
    _codeFontSize: '14px',
    ...colors,
    _spacing: '10px',
    _lineHeight: 'calc(var(--font-size) * 1.6)',
    _h1Scale: '2',
    _h2Scale: '1.5',
    _h3Scale: '1.25',
    _touchSize: '32px',
    _headerHeight:
      'calc( var(--line-height) * var(--h2-scale) + var(--spacing) * 2 )',
  },
  '@media (prefers-color-scheme: dark)': {
    body: {
      _darkmode: 'true',
    },
  },
  '.darkmode': {
    ...invertLuminance(colors),
    _shadowColor: brandColor.opacity(0.5),
  },
  '.high-contrast': {
    filter: 'contrast(2)',
  },
  '*': {
    boxSizing: 'border-box',
    scrollbarColor: `${vars.scrollThumbColor} ${vars.scrollBarColor}`,
    scrollbarWidth: 'thin',
  },
  body: {
    fontFamily: vars.fontFamily,
    fontSize: vars.fontSize,
    margin: '0',
    lineHeight: vars.lineHeight,
    background: vars.background,
    color: vars.textColor,
  },
  'input, button, select, textarea': {
    fontFamily: vars.fontFamily,
    fontSize: vars.fontSize,
    color: 'currentColor',
    background: vars.inputBg,
  },
  header: {
    background: vars.brandColor,
    color: vars.brandTextColor,
    _textColor: vars.brandTextColor,
    display: 'flex',
    alignItems: 'center',
    padding: '0 var(--spacing)',
    lineHeight: 'calc(var(--line-height) * var(--h1-scale))',
    height: vars.headerHeight,
    whiteSpace: 'nowrap',
  },
  h1: {
    color: vars.brandColor,
    fontSize: 'calc(var(--font-size) * var(--h1-scale))',
    lineHeight: 'calc(var(--line-height) * var(--h1-scale))',
    fontWeight: '400',
    borderBottom: `4px solid ${vars.barColor}`,
    margin: `${vars.spacing} 0`,
    padding: 0,
  },
  'header h2': {
    color: vars.brandTextColor,
    whiteSpace: 'nowrap',
  },
  h2: {
    color: vars.brandColor,
    fontSize: 'calc(var(--font-size) * var(--h2-scale))',
    lineHeight: 'calc(var(--line-height) * var(--h2-scale))',
    margin: 'calc(var(--spacing) * var(--h2-scale)) 0',
  },
  h3: {
    fontSize: 'calc(var(--font-size) * var(--h3-scale))',
    lineHeight: 'calc(var(--line-height) * var(--h3-scale))',
    margin: 'calc(var(--spacing) * var(--h3-scale)) 0',
  },
  main: {
    alignItems: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '100vw',
    height: '100vh',
    overflow: 'hidden',
  },
  'main > tosi-sidenav': {
    height: 'calc(100vh - var(--header-height))',
  },
  'main > tosi-sidenav::part(nav)': {
    background: vars.navBg,
  },
  blockquote: {
    position: 'relative',
    background: vars.insetBg,
    margin: '0 0 var(--spacing) 0',
    borderRadius: vars.spacing,
    padding: 'var(--spacing) calc(var(--spacing) * 2)',
    filter: `drop-shadow(0px 1px 1px ${vars.shadowColor})`,
  },
  'blockquote > :first-child': {
    marginTop: '0',
  },
  'blockquote > :last-child': {
    marginBottom: '0',
  },
  a: {
    textDecoration: 'none',
    color: vars.linkColor,
    opacity: '0.9',
    borderBottom: '1px solid var(--brand-color)',
  },
  'button, select, .clickable': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'ease-out 0.2s',
    _textColor: vars.brandColor,
    color: vars.textColor,
    textDecoration: 'none',
    background: vars.buttonBg,
    padding: '0 calc(var(--spacing) * 1.25)',
    border: 'none',
    borderRadius: 'calc(var(--spacing) * 0.5)',
  },
  'button, select, .clickable, input': {
    lineHeight: 'calc(var(--line-height) + var(--spacing))',
  },
  'input, textarea': {
    border: 'none',
    outline: 'none',
    borderRadius: 'calc(var(--spacing) * 0.5)',
    boxShadow: vars.inputBorderShadow,
  },
  input: {
    padding: '0 calc(var(--spacing) * 1.5)',
  },
  '::placeholder': {
    color: vars.placeholderColor,
  },
  'button:hover, .clickable:hover': {
    boxShadow: 'inset 0 0 0 2px var(--brand-color)',
  },
  'button:active, .clickable:active': {
    background: vars.brandColor,
    color: vars.brandTextColor,
  },
  label: {
    display: 'inline-flex',
    gap: 'calc(var(--spacing) * 0.5)',
    alignItems: 'center',
  },
  '.elastic': {
    flex: '1 1 auto',
    overflow: 'hidden',
    position: 'relative',
  },
  '.doc-link': {
    cursor: 'pointer',
    borderBottom: 'none',
    transition: '0.15s ease-out',
    marginLeft: '20px',
    padding: 'calc(var(--spacing) * 0.5) calc(var(--spacing) * 1.5)',
  },
  '.doc-link:not(.current):hover': {
    background: vars.background,
  },
  '.doc-link:not(.current)': {
    opacity: '0.8',
    marginLeft: 0,
  },
  'tosi-example': {
    margin: 'var(--spacing) 0',
  },
  'tosi-example [part=editors]': {
    background: vars.insetBg,
  },
  ':disabled': {
    opacity: '0.5',
    filter: 'saturate(0)',
    pointerEvents: 'none',
  },
  pre: {
    background: vars.codeBg,
    padding: vars.spacing,
    borderRadius: 'calc(var(--spacing) * 0.25)',
    overflow: 'auto',
    fontSize: vars.codeFontSize,
    lineHeight: 'calc(var(--font-size) * 1.2)',
  },
  'pre, code': {
    fontFamily: vars.codeFontFamily,
    _textColor: vars.brandColor,
  },
  table: {
    borderCollapse: 'collapse',
  },
  thead: {
    background: vars.brandColor,
    color: vars.brandTextColor,
  },
  tbody: {
    background: vars.background,
  },
  'tr:nth-child(2n)': {
    background: vars.backgroundShaded,
  },
  'th, td': {
    padding: 'calc(var(--spacing) * 0.5) var(--spacing)',
  },
  '.current': {
    background: vars.background,
  },
}

StyleSheet('demo-style', styleSpec)

const browser = createDocBrowser({
  docs,
  context: { tosijs, 'tosijs-3d': tosijs3d },
  projectName: 'tosijs-3d',
  projectLinks: {
    github: 'https://github.com/tonioloewald/xinjs-3d',
    npm: 'https://www.npmjs.com/package/tosijs-3d',
  },
})

document.querySelector('main')!.append(browser)
