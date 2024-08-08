import { VaraBindings } from "../index.js";

// bind to running VARA instance's TCP port
const vb: VaraBindings = new VaraBindings('127.0.0.1', 8300, 'FM')

// wait until connection is made, this time using a digipeater
// await vb.connect('MYCALL', 'THEIRCALL', 'DIGPTR')
await vb.connect('KO4LCM', 'KH6COM-10')

// let's pretend we want to get the propagation data
// you should use Promise.all if you're not sure of the order that the results will be received in
const all = await Promise.all([
    vb.bitrate(),
    vb.sn()
])

console.log(`Connection bitrate: ${all[0].bitsPerSecond}`)
console.log(`Connection speed level: ${all[0].speedLevel}`)
console.log(`Connection signal to noise ration: ${all[1]}`)

await vb.disconnect()
vb.close()