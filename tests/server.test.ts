import { afterAll, beforeAll, expect, test } from "bun:test";
import type { ConnectionData, VaraJS } from "../index.js";
import config from "./config.test.js";
import { spawnVara } from "./setup.test.js";

let vb: VaraJS

beforeAll(async () => {
    vb = await spawnVara()
    await vb.myCall(config.serverCallsign)
    await vb.chatOn()
})

afterAll(() => {
    vb.end()
})

test(`listening for ${config.serverCallsign}`, async () => {
    const cd: ConnectionData = await vb.promise('CONNECTED')
    const rx: string | Buffer = await vb.promise('data')
    expect(cd.source).toBe(config.clientCallsign)
    expect(cd.destination).toBe(config.serverCallsign)
    expect(vb.connection?.source).toBe(config.clientCallsign)
    expect(vb.connection?.destination).toBe(config.serverCallsign)
    expect(vb.disconnected).toBeFalse()
    expect(vb.pending).toBeTrue()
    expect(rx).toBeString()
    expect(rx).toBe(config.clientString)
    if (rx === config.clientString) {
        vb.write(config.serverString)
    }
})