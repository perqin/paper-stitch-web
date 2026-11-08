import test from 'node:test'
import assert from 'node:assert/strict'
import { createImageResources } from './resources.ts'

const file = (name: string) => new File(['image'], name, { type: 'image/png' })

test('default image IDs work when crypto.randomUUID is unavailable', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(crypto, 'randomUUID')
  Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined })
  try {
    const records: { id: string }[] = []
    const resources = createImageResources(() => ({
      appendImages: images => { records.push(...images); return true },
      removeImage: () => {},
    }), async () => ({ url: 'blob:test', width: 100, height: 200, release: () => {} }))
    assert.deepEqual(await resources.importFiles([file('one.png'), file('two.png')]), [])
    assert.equal(records.length, 2)
    for (const record of records) assert.match(record.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    assert.notEqual(records[0].id, records[1].id)
    resources.dispose()
  } finally {
    if (descriptor) Object.defineProperty(crypto, 'randomUUID', descriptor)
    else Reflect.deleteProperty(crypto, 'randomUUID')
  }
})

function setup() {
  const records: { id: string; name: string }[] = []
  const released: string[] = []
  let id = 0
  const resources = createImageResources(() => ({
    appendImages: images => { records.push(...images); return true },
    removeImage: imageId => { const index = records.findIndex(image => image.id === imageId); if (index >= 0) records.splice(index, 1) },
  }), async input => {
    if (input.name === 'broken.png') throw new Error('Cannot decode image')
    return { url: `blob:${input.name}`, width: 100, height: 200, release: () => released.push(input.name) }
  }, () => `id-${++id}`)
  return { resources, records, released }
}

test('imports valid files in selection order and reports individual failures', async () => {
  const { resources, records } = setup()
  const errors = await resources.importFiles([file('one.png'), file('broken.png'), file('two.png')])
  assert.deepEqual(records.map(record => record.name), ['one.png', 'two.png'])
  assert.equal(errors.length, 1)
  assert.match(errors[0], /broken.png/)
  assert.equal(resources.getUrl(records[0].id), 'blob:one.png')
})

test('removal detaches the record and releases its image URL exactly once', async () => {
  const { resources, records, released } = setup()
  await resources.importFiles([file('one.png')])
  const id = records[0].id
  resources.removeImage(id)
  resources.removeImage(id)
  assert.equal(records.length, 0)
  assert.equal(resources.getUrl(id), undefined)
  assert.deepEqual(released, ['one.png'])
})

test('serializes import batches without interleaving their records', async () => {
  const { resources, records } = setup()
  await Promise.all([
    resources.importFiles([file('one.png'), file('two.png')]),
    resources.importFiles([file('three.png')]),
  ])
  assert.deepEqual(records.map(record => record.name), ['one.png', 'two.png', 'three.png'])
})

test('disposal during decode releases late resources without publishing records', async () => {
  let finish!: (value: { url: string; width: number; height: number; release: () => void }) => void
  const records: unknown[] = []
  let releases = 0
  const resources = createImageResources(() => ({
    appendImages: images => { records.push(...images); return true },
    removeImage: () => {},
  }), () => new Promise(resolve => { finish = resolve }), () => 'id')
  const importing = resources.importFiles([file('one.png')])
  await Promise.resolve()
  resources.dispose()
  finish({ url: 'blob:one', width: 100, height: 100, release: () => { releases++ } })
  await importing
  assert.deepEqual(records, [])
  assert.equal(releases, 1)
})
