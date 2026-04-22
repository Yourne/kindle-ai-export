import {
  // mkdir,
  readdir,
  readFile
  // writeFile
} from 'node:fs/promises'
import path from 'node:path'

// import { SingleBar } from 'cli-progress';
import { type ChatResponse } from 'openai-fetch'

import { assert, getEnv } from './utils'

/*
 * read files from texts directory
 * optimize context window
 * send text to open llama server
 */

// average page length is 250 words
// average english word is 4.7 char
// maybe minimize the number of calls to the API?
// it really depends on the user's hardware, but large is better
const PAGE_LENGTH = Math.round(250 * 4.7) * 3

async function appendText(
  i: number,
  text: string,
  pages: string[],
  textDir: string
): Promise<[number, string]> {
  if (!pages[i]) {
    return [i, text]
  }
  if (text.length > PAGE_LENGTH) {
    return [i, text]
  }
  const nextPage = await readFile(path.join(textDir, pages[i]))
  text = `${text}\n${nextPage}`
  return appendText(i + 1, text, pages, textDir)
}

await main()
async function main() {
  const asin = getEnv('ASIN')
  assert(asin, 'ASIN is required')
  const outDir = path.join('out', asin)
  const textDir = path.join(outDir, 'texts')
  const pages = await readdir(textDir)
  let i = 0
  // let text = '';
  console.time('pagination')
  // const progressBar = new SingleBar({})
  // progressBar.start(pages.length, 0)
  // while (i < pages.length) {
  // const client = new OpenAIClient({
  //   apiKey: '',
  //   baseUrl: 'http://localhost:8080/v1/chat/completion'
  // });
  while (i < 1) {
    const [newIdx, text] = await appendText(i, '', pages, textDir)
    i = newIdx
    const prompt = `Extract and format the following text into clean Markdown. ### INPUT: \n'''\n${text}\n'''\n`
    // const res = await client.createChatCompletion({
    const baseUrl = 'http://localhost:8080/v1/chat/completions'
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'fdgsgqaegt/ReaderLM-v2-Q4_K_M-GGUF',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })
    const chatRes = (await res.json()) as ChatResponse
    const markdown = chatRes?.choices[0]?.message.content
    assert(typeof markdown === 'string')
    // if (markdown.startsWith('```markdown')) {
    //   console.log('begins with ```markdown')
    //   markdown = markdown.slice('```markdown'.length)
    // }
    // if (markdown.endsWith('```\\n')) {
    //   console.log('ends with ```')
    //   markdown = markdown.slice(0, - '```'.length)
    // }
    console.log(markdown)
    // progressBar.update(i)
    // console.log(i)
  }
  // progressBar.stop()
  console.timeEnd('pagination')
  // 1000 char, 10 s
  // 2000 char, 15 s, 30s, 20s
}
