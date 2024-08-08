import { setTimeout } from "timers/promises";
import { VaraBindings } from "../index.js";

// bind to running VARA instance's TCP port
const vb: VaraBindings = new VaraBindings('127.0.0.1', 8300, 'FM')

// wait until connection is made
// await vb.connect('MYCALL', 'THEIRCALL')
await vb.connect('KO4LCM', 'WH6CMO')

// add listeners to do stuff upon events firing, here's a few randomly selected examples
vb.on('command', (c) => {
    console.log(`Command: ${c}`)
})
vb.on('data', (d) => {
    console.log(`Data: ${d}`)
})

// stay connected for 30 seconds (not required, only for demonstration purposes)
await setTimeout(30_000)

// send disconnect command to remote static
await vb.disconnect()

// unbind/disconnect from VARA
vb.close()