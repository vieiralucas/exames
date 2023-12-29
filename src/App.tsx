import React, { useCallback, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
// @ts-ignore
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs'
import FileDrop from './FileDrop'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const items = [
  ['HEMOGLOBINA', 'Hb'],
  ['LEUCÓCITOS', 'Leuco'],
  ['PLAQUETAS', 'Plaq'],
  ['SÓDIO', 'Na'],
  ['POTÁSSIO', 'K'],
  ['URÉIA', 'U'],
  ['CREATININA', 'Cr'],
  ['TGO', 'TGO'],
  ['TGP', 'TGP'],
  ['GAMA GLUTAMIL TRANSFERASE', 'GGT'],
  ['FOSFATASE ALCALINA', 'FA'],
  ['BILIRRUBINA TOTAL', 'BT'],
  ['BILIRRUBINA DIRETA', 'BD'],
  ['AMILASE', 'Amilase'],
  ['LIPASE', 'Lipase'],
  ['INR', 'INR'],
  ['RELAÇÃO', 'RN'],
  ['PROTEÍNA C REATIVA', 'PCR'],
]

const subItems: [string, string[]][] = [
  ['Leuco', ['Bastonetes', 'Segmentados']],
]

// function searchItem(content: string, search: string): string | undefined {
//   console.log('searching for', search)
//
//   let regex = new RegExp(`${search}.*?([0-9]+,[0-9]+)`, 'gi')
//   let match = Array.from(content.matchAll(regex)).map((match) => match[1])[0]
//   if (match) return match
//
//   regex = new RegExp(`${search}.*?([0-9]+)`, 'gi')
//   match = Array.from(content.matchAll(regex)).map((match) => match[1])[0]
//   if (match) return match
//
//   regex = new RegExp(`${search}.*?resultado.*?([0-9]+)`, 'gi')
//   match = Array.from(content.matchAll(regex)).map((match) => match[1])[0]
//   if (match) return match
//
//   regex = new RegExp(`${search}.*?resultado.*?([0-9]+,[0-9]+)`, 'gi')
//   match = Array.from(content.matchAll(regex)).map((match) => match[1])[0]
//   if (match) return match
//
//   return undefined
// }

function searchItem(content: string, search: string): string | undefined {
  console.log('searching for', search)

  const regexPatterns = [
    new RegExp(`${search}.*?([0-9]+,[0-9]+)`, 'gi'), // Matches "1,23"
    new RegExp(`${search}.*?([0-9]+)`, 'gi'), // Matches "1"
    new RegExp(`${search}.*?([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]+)`, 'gi'), // Matches "1.234,56" and "1.234.567,89"

    new RegExp(`${search}.*?resultado.*?([0-9]+,[0-9]+)`, 'gi'), // Matches "1,23"
    new RegExp(`${search}.*?resultado.*?([0-9]+)`, 'gi'), // Matches "1"
    new RegExp(
      `${search}.*?resultado.*?([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]+)`,
      'gi'
    ), // Matches "1.234,56" and "1.234.567,89"
  ]

  let earliestMatch = {
    index: Infinity,
    value: undefined as string | undefined,
  }

  regexPatterns.forEach((regex) => {
    const matches = Array.from(content.matchAll(regex))

    matches.forEach((match) => {
      // Calculate the index of the capture group
      const captureGroupIndex =
        match.index !== undefined
          ? match.index + match[0].indexOf(match[1])
          : undefined

      if (
        captureGroupIndex !== undefined &&
        captureGroupIndex < earliestMatch.index
      ) {
        earliestMatch = { index: captureGroupIndex, value: match[1] }
      }
    })
  })

  return earliestMatch.value
}

const App: React.FC = () => {
  const [results, setResults] = useState<Map<string, string>>(new Map())
  const [showNotFound, setShowNotFound] = useState(false)

  const handleFileDrop = useCallback((file: File) => {
    const fileReader = new FileReader()

    fileReader.onload = async (event) => {
      if (!event.target) {
        return
      }

      let content = ''

      const typedArray = new Uint8Array(event.target.result as ArrayBuffer)
      const pdfDoc = await pdfjsLib.getDocument({ data: typedArray }).promise

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum)
        const textContent = await page.getTextContent()
        const textItems = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .toLowerCase()

        content += ' ' + textItems
      }

      console.log('finished reading content', content.length)

      const results = new Map<string, string>()
      for (const [search, key] of items) {
        const match = searchItem(content, search)
        if (match) {
          results.set(key, match)
        }
      }

      for (const [, searches] of subItems) {
        for (const search of searches) {
          const match = searchItem(content, search)
          if (match) {
            results.set(search, match)
          }
        }
      }

      setResults(results)
    }

    fileReader.readAsArrayBuffer(file)
  }, [])

  console.log('rendering', results)

  const asStr = items
    .map(([_, key]) => {
      let val = results.get(key)
      if (!showNotFound && !val) return ''

      if (val) {
        const subItem = subItems.find(([k]) => key === k)?.[1]
        if (subItem) {
          const vals: string[] = []
          for (const key of subItem) {
            const subVal = results.get(key)
            if (subVal) {
              vals.push(subVal)
            } else {
              vals.push('N/A')
            }
          }
          val += ` (${vals.join('/')})`
        }
      }

      return `${key} ${val || 'N/A'}`
    })
    .filter(Boolean)
    .join(' // ')

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex' }}>
        <FileDrop onFileDrop={handleFileDrop} />
        <div style={{ marginLeft: 20 }}>
          {results.size > 0 &&
            Array.from(items).map(([_, key]) => {
              const value = results.get(key)
              const subItem = subItems.find(([k]) => key === k)?.[1]

              return (
                <>
                  <div key={key} style={{ color: value ? 'inherit' : 'red' }}>
                    {key}: {value}
                  </div>
                  {subItem && (
                    <div style={{ marginLeft: 20 }}>
                      {subItem.map((key) => {
                        const value = results.get(key)
                        return (
                          <div
                            key={key}
                            style={{ color: value ? 'inherit' : 'red' }}
                          >
                            {key}: {value}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            })}
        </div>
      </div>
      {results.size > 0 && <pre>{asStr}</pre>}
      <div style={{ marginTop: 20 }}>
        <input
          id="showNotFound"
          type="checkbox"
          value={showNotFound ? 'checked' : undefined}
          onChange={(e) => setShowNotFound(e.target.checked)}
        />
        <label htmlFor="showNotFound">
          Incluir valores não encotrados no texto de saida
        </label>
      </div>
    </div>
  )
}

export default App
