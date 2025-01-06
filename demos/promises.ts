import { VaraBindings } from "../index.js";

// bind to running VARA instance's TCP port
const vb: VaraBindings = new VaraBindings('127.0.0.1', 8300, 'FM', 'ascii', '\r')

// wait until connection is made
// await vb.connect('MYCALL', 'THEIRCALL')
await vb.connect('KO4LCM', 'WH6CMO')

//
const data: string = await vb.data()
const command: string = await vb.command()

console.log('data: ' + data)
console.log('command: ' + command)

await vb.disconnect()
vb.end()