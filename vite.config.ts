import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'


export default defineConfig({
  optimizeDeps: { exclude: ['x-data-spreadsheet'] },
  plugins: [
    vue(),
    {
      name: 'noovy-grid-theme',
      transform(source, id) {
        const path = id.replaceAll('\\', '/')
        if (!path.includes('/x-data-spreadsheet/src/')) return
        if (path.endsWith('/src/index.js')) {
          return source.replace('sheet${this.sheetIndex}', 'Feuille ${this.sheetIndex}')
        }
        if (path.endsWith('/component/toolbar/index.js')) {
          return source.replace(/function moreResize\(\) \{[\s\S]*?\n\}/, 'function moreResize() { this.moreEl.hide(); }')
        }
        if (path.endsWith('/component/bottombar.js')) {
          return source.replace("new Icon('add').on('click',", "h('button', 'noovy-add-sheet').attr('type', 'button').attr('aria-label', 'Ajouter une feuille').child(new Icon('add')).on('click',")
            .replace("super(icon, 'auto', false, 'top-left');", "super(icon, 'auto', false, 'top-left'); this.headerEl.attr('aria-label', 'Toutes les feuilles');")
        }
        if (path.endsWith('/component/toolbar/item.js')) {
          return source.replace('element() {', "element(tag = 'div') {")
            .replace("h('div',", "h(tag,")
            .replace(".attr('data-tooltip', tip);", ".attr('data-tooltip', tip).attr('aria-label', tip).attr('type', 'button');")
        }
        if (/\/toolbar\/(icon_item|toggle_item)\.js$/.test(path)) {
          return source.replace('super.element()', "super.element('button')")
        }
        if (path.endsWith('/component/toolbar/dropdown_item.js')) {
          return source.replace('this.dd = this.dropdown();', "this.dd = this.dropdown(); this.dd.headerEl.attr('aria-label', this.tip);")
        }
        if (path.endsWith('/component/dropdown.js')) {
          return source.replace("this.headerEl = h('div',", "this.headerEl = h('button',")
            .replace("-dropdown-header\`);", "-dropdown-header\`).attr('type', 'button');")
            .replace("this.headerEl.on('click'", "this.headerEl.on('focus', () => { const label = this.parent().attr('data-tooltip'); if (label) this.headerEl.attr('aria-label', label); }).on('click'")
            .replace('    contentEl.show();', `    contentEl.show();
    if (this.el.closest('.x-spreadsheet-toolbar')) {
      const anchor = this.headerEl.el.getBoundingClientRect();
      const panel = contentEl.el.getBoundingClientRect();
      Object.assign(contentEl.el.style, {
        position: 'fixed',
        top: anchor.bottom + 4 + 'px',
        left: Math.max(4, Math.min(anchor.left, window.innerWidth - panel.width - 4)) + 'px',
        right: 'auto',
        zIndex: 100,
      });
    }`)
        }
        if (path.endsWith('/core/data_proxy.js')) {
          return source.replace('toolbarHeight = 41', 'toolbarHeight = 52')
            .replace('bottombarHeight = 41', 'bottombarHeight = 44')
        }
        if (path.endsWith('/component/table.js')) {
          const palette = {
            '#f4f5f8': '--surface-muted',
            '#e6e6e6': '--grid-line',
            '#585757': '--ink-muted',
            '#fff': '--surface',
            'rgba(75, 137, 255, 0.08)': '--accent-soft',
          }
          return 'const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();\n'
            + source.replace(/'(#[\da-f]+|rgba\(75, 137, 255, 0\.08\))'/g, (match, color: keyof typeof palette) =>
              palette[color] ? 'token(' + JSON.stringify(palette[color]) + ')' : match,
            ).replace('Source Sans Pro', 'Inter').replace('cellPaddingWidth = 5', 'cellPaddingWidth = 10')
              .replace('align: style.align,', "align: cell.style === undefined && cellText !== '' && Number.isFinite(Number(cellText)) ? 'right' : style.align,")
        }
      },
    },
  ],
})
