// import { createWorker } from 'tesseract.js'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { ChatResponse } from 'openai-fetch'
import { SingleBar } from 'cli-progress'

import { assert, getEnv } from './utils'

await main()
async function main() {
  const asin = getEnv('ASIN')
  assert(asin, 'ASIN is required')
  const outDir = path.join('out', asin)
  const pagesDir = path.join(outDir, 'pages')
  const textDir = path.join(outDir, 'texts')
  await mkdir(textDir, { recursive: true })
  console.log('Extracting text from images')
  const progressBar = new SingleBar({})
  const pagesCount = await readdir(pagesDir).then((pages) => pages.length)

  const baseUrl = 'http://localhost:8080/v1/chat/completions'

  progressBar.start(pagesCount, 0)
  console.time('ocr')
  let text = ''
  for (const fileName of await readdir(pagesDir)) {
    const filePath = path.join(pagesDir, fileName)
    const base64Data = await readFile(filePath, { encoding: 'base64' })
    const dataUrl = `data:image/png;base64,${base64Data}`

    // console.log('BUFFER')
    // console.log(dataUrl.slice(0, 50))
    const res = (await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'ggml-org/GLM-OCR-GGUF',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: dataUrl } },
              { type: 'text', text: 'Text Recognition: ' }
            ]
          }
        ]
      })
    }).then((x) => x.json())) as ChatResponse
    console.dir(res?.choices?.[0]?.message.content)
    text = `${text}\n${res?.choices?.[0]?.message.content}}`
    progressBar.increment()
  }

  const bookName = 'esp32'
  const outFile = path.join(textDir, bookName)
  await writeFile(outFile, text)
  // worker.terminate()
  progressBar.stop()
  console.timeEnd('ocr')
}
