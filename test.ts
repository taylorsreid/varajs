import { VaraBindings } from "./index.js";

const vb: VaraBindings = await VaraBindings.open('127.0.0.1', 8300)

vb.on('command', (c) => {
    console.log(c)
})

vb.on('data', (d) => {
    console.log(d)
})

await vb.cqFrame('KO4LCM')

vb.disconnect()
vb.close()