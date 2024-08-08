import { VaraBindings } from "../index.js";

// bind to running VARA instance's TCP port
const vb: VaraBindings = new VaraBindings('127.0.0.1', 8300, 'FM')

// wait until connection is made
// await vb.connect('MYCALL', 'THEIRCALL')
await vb.connect('KO4LCM', 'KH6COM-10')

// 
console.log(await vb.data())