import { setTimeout } from "timers/promises";
import { createConnection, VaraBindings } from "../index.js";
import { error } from "console";

// bind to running VARA instance's TCP port
const vb: VaraBindings = await createConnection({
    host: '127.0.0.1',
    commandPort: 8300,
    encoding: 'ascii',
})

vb.on('data', (data: string) => {
    console.log('Data: ' + data)
})

vb.on('command', (command: string) => {
    console.log('Command: ' + command)
})

await vb.myCall('KO4LCM-1')
console.log('Connecting...')
await vb.connect('KO4LCM-1', 'KO4LCM', 'WH6CMO')
console.log('Connected, sending test data...')
vb.write('This is some test data!\r', 'ascii')
await setTimeout(10_000)
// await vb.disconnect()