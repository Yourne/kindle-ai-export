import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { SingleBar } from 'cli-progress'
import { createWorker } from 'tesseract.js'

import { assert, getEnv } from './utils'

await main()

async function main() {
  const asin = getEnv('ASIN')
  assert(asin, 'ASIN is required')
  const outDir = path.join('out', asin)
  const pagesDir = path.join(outDir, 'pages')
  const textDis = path.join(outDir, 'texts')
  await mkdir(textDis, { recursive: true })
  let lang = getEnv('BOOK_LANG')
  if (!lang) {
    lang = 'eng'
    console.log(
      'no BOOK_LANG env var found, setting ocr engine language to english'
    )
  }
  const worker = await createWorker(lang)
  console.log('Extracting text from images')
  const progressBar = new SingleBar({})
  const pages = await readdir(pagesDir)

  progressBar.start(pages.length, 0)
  console.time('ocr')
  for (const fileName of await readdir(pagesDir)) {
    const filePath = path.join(pagesDir, fileName)
    const buffer = await readFile(filePath)
    const res = await worker.recognize(buffer)
    const outFile = path.join(textDis, fileName)
    await writeFile(outFile, res.data.text)
    progressBar.increment()
  }
  await worker.terminate()
  progressBar.stop()
  console.timeEnd('ocr')
}
