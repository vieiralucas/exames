import React, { useCallback, useMemo, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
// @ts-ignore
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs'
import FileDrop from './FileDrop'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const items: [string, string, number, number?][] = [
  ['HEMOGLOBINA', 'Hb', 0],
  ['LEUCÓCITOS', 'Leuco', 0],
  ['PLAQUETAS', 'Plaq', 0],
  ['SÓDIO', 'Na', 1],
  ['POTÁSSIO', 'K', 1, 0],
  ['URÉIA', 'U', 1],
  ['CREATININA', 'Cr', 1, 0],
  ['TGO', 'TGO', 1],
  ['TGP', 'TGP', 1],
  ['GAMA GLUTAMIL TRANSFERASE', 'GGT', 1],
  ['FOSFATASE ALCALINA', 'FA', 1],
  ['BILIRRUBINA TOTAL', 'BT', 0],
  ['BILIRRUBINA DIRETA', 'BD', 0],
  ['AMILASE', 'Amilase', 1],
  ['LIPASE', 'Lipase', 1], // ask strategy
  ['INR', 'INR', 0],
  ['RELAÇÃO', 'RN', 0],
  ['PROTEÍNA C REATIVA', 'PCR', 0, 0],
]

const subItems: [string, string[], number][] = [
  ['Leuco', ['Bastonetes', 'Segmentados'], 0],
]

function searchItem(
  content: string,
  search: string,
  strategy: number,
  subStrategy?: number
): string | undefined {
  content = content.toLowerCase()

  console.log('searching for', search)

  // match the string "amilase" then any character or white spaces until finding a integer
  let regexPatterns = [
    [
      new RegExp(`${search.toLowerCase()}[\\s|\\S]*?([0-9]+,[0-9]+)`, 'gmi'), // Matches "1,23"
      new RegExp(`${search.toLowerCase()}[\\s|\\S]*?([0-9]+)`, 'gmi'), // Matches "1"
      new RegExp(
        `${search.toLowerCase()}[\\s|\\S]*?([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]+)`,
        'gmi'
      ), // Matches "1.234,56" and "1.234.567,89"
      new RegExp(
        `${search.toLowerCase()}[\\s|\\S]*?([0-9]{1,3}(?:\\.[0-9]{3})+)`,
        'gmi'
      ), // Matches "1.234" and "1.234.567"
    ],
    [
      new RegExp(
        `${search.toLowerCase()}[\\s|\\S]*?resultado.*?([0-9]+,[0-9]+)`,
        'gmi'
      ), // Matches "1,23"
      new RegExp(
        `${search.toLowerCase()}[\\s|\\S]*?resultado[\\s|\\S]*?([0-9]+)`,
        'gmi'
      ), // Matches "1"
      new RegExp(
        `${search.toLowerCase()}[\\s|\\S]*?resultado[\\s|\\S]*?([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]+)`,
        'gmi'
      ), // Matches "1.234,56" and "1.234.567,89"
      new RegExp(
        `${search.toLowerCase()}[\\s|\\S]*?resultado[\\s|\\S]*?([0-9]{1,3}(?:\\.[0-9]{3})+)`,
        'gmi'
      ), // Matches "1.234" and "1.234.567"
    ],
  ][strategy]

  if (subStrategy !== undefined) {
    regexPatterns = [regexPatterns[subStrategy]]
  }

  let earliestMatch = {
    index: Infinity,
    value: undefined as string | undefined,
  }

  for (const regex of regexPatterns) {
    const matches = Array.from(content.matchAll(regex))
    if (matches.length === 0) {
      console.log(regex)
      console.log(search)
      console.log(content.indexOf(search))
      console.log(
        content.length,
        content.split(' ').find((w) => w.includes(search))
      )
    }

    for (const match of matches) {
      // Calculate the index of the capture group
      const captureGroupIndex =
        match.index !== undefined
          ? match.index + match[0].indexOf(match[1])
          : undefined

      console.log(
        search,
        'match',
        match[1],
        'regex',
        regex,
        'captureGroupIndex',
        captureGroupIndex,
        'earliestMatch',
        earliestMatch.index,
        earliestMatch.value,
        content.substring(captureGroupIndex! - 5, captureGroupIndex! + 50)
      )

      if (
        captureGroupIndex !== undefined &&
        captureGroupIndex <= earliestMatch.index
      ) {
        if (
          captureGroupIndex === earliestMatch.index &&
          match[1].length < (earliestMatch.value?.length ?? -Infinity)
        ) {
          continue
        }

        earliestMatch = { index: captureGroupIndex, value: match[1] }
      }
    }
  }

  return earliestMatch.value
}

const App: React.FC = () => {
  const [showNotFound, setShowNotFound] = useState(false)
  const [rawContent, setRawContent] = useState('')
  const onChangeRawContent = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setRawContent(e.target.value.toLowerCase())
    },
    [setRawContent]
  )

  console.log(rawContent)

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
      setRawContent(content)
    }

    fileReader.readAsArrayBuffer(file)
  }, [])

  const results = useMemo(() => {
    const content = rawContent

    const results = new Map<string, string>()
    for (const [search, key, strategy, subStrategy] of items) {
      const match = searchItem(content, search, strategy, subStrategy)
      if (match) {
        results.set(key, match)
      }
    }

    for (const [, searches, strategy] of subItems) {
      for (const search of searches) {
        const match = searchItem(content, search, strategy)
        if (match) {
          results.set(search, match)
        }
      }
    }

    return results
  }, [rawContent])

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
    .join(' ')

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(asStr)
    } catch (err) {
      alert(`Falha ao copiar: ${err}`)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex' }}>
        <textarea
          style={{ width: 400, height: 300 }}
          value={rawContent}
          onChange={onChangeRawContent}
          onPaste={(e) => {
            console.log(e.clipboardData.getData('text/plain').length)
          }}
        />
        <FileDrop onFileDrop={handleFileDrop} />
        <div style={{ marginLeft: 20 }}>
          {results.size > 0 &&
            Array.from(items).map(([search, key]) => {
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
      {results.size > 0 && (
        <>
          <p>{asStr}</p>
          <button onClick={copyToClipboard}>Copiar</button>
        </>
      )}
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
