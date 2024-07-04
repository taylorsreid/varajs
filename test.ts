import { VaraBindings } from "./index.js";

const vb: VaraBindings = await VaraBindings.create('127.0.0.1', 8300)

vb.on('command', (c) => {
    console.log(c)
})

vb.on('data', (d) => {
    console.log(d)
})

console.time('test');
await vb.myCall('KO4LCM', 'KO4LCM-1', 'KO4LCM-2')
console.timeEnd('test')

await vb.disconnect()
vb.close()