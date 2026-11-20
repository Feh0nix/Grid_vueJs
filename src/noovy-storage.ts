interface LocalWorkbook {
  title: string
  sheets: Record<string, unknown>[]
}

function accessWorkbook<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('noovy-grid', 1)
    open.onupgradeneeded = () => open.result.createObjectStore('workbooks')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      try {
        const transaction = db.transaction('workbooks', mode)
        const request = operation(transaction.objectStore('workbooks'))
        transaction.oncomplete = () => { db.close(); resolve(request.result) }
        transaction.onabort = () => { db.close(); reject(transaction.error) }
      } catch (error) {
        db.close()
        reject(error)
      }
    }
  })
}

export function readWorkbook(): Promise<LocalWorkbook | undefined> {
  return accessWorkbook('readonly', store => store.get('current'))
}

export function writeWorkbook(workbook: LocalWorkbook) {
  return accessWorkbook('readwrite', store => store.put(workbook, 'current'))
}
