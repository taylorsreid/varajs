import { setTimeout } from "timers/promises";
import { ConnectionData, VaraJS } from "../index.js";

const vjs: VaraJS = VaraJS.bindModem({
    varaType: 'FM',
    encoding: 'utf8',
    concatenateData: true
})

await vjs.myCall(config.serverCallsign)
await vjs.listenOn()

console.log(`Listening for ${config.serverCallsign}`)

vjs.on('CONNECTED', async (cd: ConnectionData) => {
    if (cd.source === config.clientCallsign) {
        const rx: string = await (vjs.promise('data') as Promise<string>)
        if (rx === config.clientString) {
            vjs.send(config.serverString)
            await setTimeout(30_000)
            if (!vjs.disconnected) {
                vjs.disconnect()
            }
        }
        else {
            console.log(`Received: ${rx}\nExpected: ${config.clientString}`)
            vjs.send(`Received: ${rx}\nExpected: ${config.clientString}`)
            vjs.disconnect()
        }
    }
    else {
        vjs.disconnect()
    }
})

// test(`listening for ${config.serverCallsign}`, async () => {
//     const cd: ConnectionData = await vb.promise('CONNECTED')
//     const rx: string | Buffer = await vb.promise('data')
//     expect(cd.source).toBe(config.clientCallsign)
//     expect(cd.destination).toBe(config.serverCallsign)
//     expect(vb.connection?.source).toBe(config.clientCallsign)
//     expect(vb.connection?.destination).toBe(config.serverCallsign)
//     expect(vb.disconnected).toBeFalse()
//     expect(vb.pending).toBeTrue()
//     expect(rx).toBeString()
//     expect(rx).toBe(config.clientString)
//     if (rx === config.clientString) {
//         vb.send(config.serverString)
//     }
// })