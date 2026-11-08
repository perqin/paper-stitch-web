import test from 'node:test'
import assert from 'node:assert/strict'
import { createImageResources } from './resources.ts'

const file = (name: string) => new File(['image'], name, { type: 'image/png' })
const source = { width: 100, height: 200 } as CanvasImageSource

test('acquires retained decoded sources synchronously', async () => {
  const resources = createImageResources(() => ({ appendImages: () => true, removeImage: () => {} }),
    async () => ({ url: 'blob:one', width: 100, height: 200, source, release: () => {} }), () => 'one')
  await resources.importFiles([file('one.png')])
  const lease = resources.acquire(['one'])
  assert.equal(lease.getSource('one'), source)
  assert.throws(() => lease.getSource('other'))
  lease.release()
  lease.release()
  assert.throws(() => lease.getSource('one'))
  resources.dispose()
})

test('browser decoder retains the decoded image as its source', async t => {
  let decoded = false
  class BrowserImage {
    src = ''
    naturalWidth = 10
    naturalHeight = 20
    async decode() { decoded = true }
  }
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Image')
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: BrowserImage })
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'Image', descriptor)
    else Reflect.deleteProperty(globalThis, 'Image')
  })
  const resources = createImageResources(() => ({ appendImages: () => true, removeImage: () => {} }), undefined, () => 'browser')
  await resources.importFiles([file('one.png')])
  const lease = resources.acquire(['browser'])
  const image = lease.getSource('browser') as unknown as BrowserImage
  assert.equal(decoded, true)
  assert.ok(image instanceof BrowserImage)
  assert.equal(image.src, resources.getUrl('browser'))
  lease.release()
  resources.dispose()
})

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
    return { url: `blob:${input.name}`, width: 100, height: 200, source, release: () => released.push(input.name) }
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

test('removal retains a source until the last export lease releases it', async () => {
  const { resources, records, released } = setup()
  await resources.importFiles([file('one.png')])
  const id = records[0].id
  const first = resources.acquire([id, id])
  const second = resources.acquire([id])
  resources.removeImage(id)
  assert.deepEqual(records, [])
  assert.equal(resources.getUrl(id), undefined)
  assert.throws(() => resources.acquire([id]))
  assert.equal(first.getSource(id), source)
  assert.deepEqual(released, [])
  first.release()
  first.release()
  assert.equal(second.getSource(id), source)
  assert.deepEqual(released, [])
  second.release()
  second.release()
  resources.dispose()
  assert.deepEqual(released, ['one.png'])
})

test('disposal retires active sources but preserves existing leases and stops new work', async () => {
  const { resources, records, released } = setup()
  await resources.importFiles([file('one.png'), file('two.png')])
  const id = records[0].id
  const lease = resources.acquire([id])
  resources.dispose()
  resources.dispose()
  assert.equal(resources.getUrl(id), undefined)
  assert.equal(lease.getSource(id), source)
  assert.deepEqual(released, ['two.png'])
  assert.throws(() => resources.acquire([id]))
  assert.throws(() => resources.acquire([]))
  assert.deepEqual(await resources.importFiles([file('three.png')]), [])
  assert.equal(records.length, 2)
  lease.release()
  lease.release()
  assert.deepEqual(released, ['two.png', 'one.png'])
})

test('failed acquisition is atomic for missing IDs and missing decoded sources', async () => {
  for (const unavailable of ['missing', 'no-source']) {
    const released: string[] = []
    const resources = createImageResources(() => ({ appendImages: () => true, removeImage: () => {} }),
      async input => ({ url: `blob:${input.name}`, width: 10, height: 10,
        source: input.name === 'valid' ? source : undefined, release: () => { released.push(input.name) } }),
      (() => { let id = 0; return () => ++id === 1 ? 'valid' : 'no-source' })())
    await resources.importFiles([file('valid'), file('no-source')])
    assert.throws(() => resources.acquire(['valid', unavailable]))
    resources.removeImage('valid')
    assert.deepEqual(released, ['valid'])
    resources.dispose()
    assert.deepEqual(released, ['valid', 'no-source'])
  }
})

test('document callbacks can acquire registered sources before rejection retires them', async () => {
  let lease: ReturnType<ReturnType<typeof createImageResources>['acquire']> | undefined
  let reject = true
  let releases = 0
  let id = 0
  const resources = createImageResources(() => ({
    appendImages: images => {
      assert.equal(resources.getUrl(images[0].id), 'blob:one')
      lease = resources.acquire([images[0].id])
      if (reject) throw new Error('Rejected metadata')
      return true
    },
    removeImage: imageId => {
      assert.equal(resources.getUrl(imageId), 'blob:one')
      assert.equal(releases, 1)
    },
  }), async () => ({ url: 'blob:one', width: 10, height: 10, source, release: () => { releases++ } }), () => `id-${++id}`)
  assert.deepEqual(await resources.importFiles([file('one.png')]), ['Rejected metadata'])
  assert.equal(resources.getUrl('id-1'), undefined)
  assert.equal(lease!.getSource('id-1'), source)
  assert.equal(releases, 0)
  lease!.release()
  assert.equal(releases, 1)
  reject = false
  assert.deepEqual(await resources.importFiles([file('two.png')]), [])
  lease!.release()
  resources.removeImage('id-2')
  assert.equal(releases, 2)
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
