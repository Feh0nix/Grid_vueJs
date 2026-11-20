declare module 'x-data-spreadsheet/src/index.js' {
  interface Cell { text?: string; editable?: boolean }
  export default class Spreadsheet {
    static locale(language: string, messages: Record<string, unknown>): void
    constructor(element: HTMLElement | string, options?: Record<string, unknown>)
    loadData(data: Record<string, unknown>[]): this
    getData(): Record<string, unknown>[]
    reRender(): this
    on(event: string, callback: () => void): this
    sheet: {
      toolbar: { reset(): void }
      data: {
        selector: { ri: number; ci: number; range: { sri: number; sci: number; eri: number; eci: number } }
        rows: { _: Record<number, { cells: Record<number, Cell> }> }
        sortedRowMap: Map<number, number>
        exceptRowSet: Set<number>
        getCellTextOrDefault(row: number, col: number): string
        getSelectedCell(): Cell | null
        changeData(callback: () => void): void
        setSelectedCellText(text: string): void
      }
    }
  }
}



declare module 'x-data-spreadsheet/src/core/cell.js' {
  const engine: { render(text: string, formulas: unknown, getText: (row: number, col: number) => string): unknown }
  export default engine
}

declare module 'x-data-spreadsheet/src/core/formula.js' {
  export const formulam: unknown
}
