import { createConnection, VaraBindings } from "../index.js";

// bind to running VARA instance's TCP port
const vb: VaraBindings = await createConnection({
    host: '127.0.0.1',
    commandPort: 8300,
    encoding: 'ascii',
})

console.log(`Registered ${await vb.myCall('KO4LCM')}`)
await vb.listenOn()
console.log('Listening...')

vb.on('CONNECTED', (cd) => {

    console.log('Connected:')
    console.log(cd)

    vb.on('data', (data: any) => {
        console.log(data)
    })
    
    vb.on('command', (command: string) => {
        console.log('Command: ' + command)
    })

})