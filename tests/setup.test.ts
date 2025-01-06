import { setTimeout } from "timers/promises"
import { createConnection, type VaraBindings } from "../index.js"
import config from "./config.test.js"

export async function spawnVara(): Promise<VaraBindings> {
    let vb: VaraBindings
    Bun.spawn([config.varaPath])
    await setTimeout(config.varaStartupTimeout)
    vb = await createConnection({
        host: config.host,
        commandPort: config.port,
        encoding: config.encoding as BufferEncoding
    })
    if (config.verbose) {
        vb.on('command', (c: string) => {
            console.log('Command: ' + c)
        })
        vb.on('data', (data: Buffer | string) => {
            console.log('Data: ' + data)
        })
    }
    return vb
}