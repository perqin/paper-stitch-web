import receiptTop from './assets/receipt-top.png'
import receiptBottom from './assets/receipt-bottom.png'

// Presentation fixtures only; these are not imported images or a stitch result.
export const demoImages = [
  { id: 'receipt-top', name: 'Image_20261107_0023.png', width: 672, height: 3375, src: receiptTop },
  { id: 'receipt-bottom', name: 'Image_20261107_0024.png', width: 670, height: 3282, src: receiptBottom },
]

export type DemoImage = (typeof demoImages)[number]
