import { setTimeout } from "timers/promises";
import { VaraBindings } from "./index.js";

const vb: VaraBindings = new VaraBindings('127.0.0.1', 8300, 'FM', 'utf8')

vb.on('command', (c) => {
    console.log(c)
    // console.log(typeof vb.state.toJSON())
})
vb.on('data', (d: string) => {
    d.trimEnd().split('\r').forEach((s) => {
        console.log(s.includes('\r'))
    })
    console.log(d.trimEnd().split('\r'))
})
await vb.connect('KO4LCM', 'WH6CMO')
// await setTimeout(10_000)
// await vb.disconnect()
