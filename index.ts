/**
 * @author Taylor Reid - KO4LCM
 */

import { EventEmitter, once } from "events";
import { createConnection, type Socket } from "net";

export type VaraEvent = 'command' | 'data' | 'connected' | 'disconnected' | 'ptt off' | 'ptt on' | 'buffer' | 'pending' | 'cancel pending' | 'busy off' | 'busy on' | 'registered' | 'link registered' | 'link unregistered' | 'i am alive' | 'missing soundcard' | 'cq frame' | 'sn' | 'bitrate' | 'clean tx buffer' | 'version' | 'encryption disabled' | 'encryption ready' | 'unencrypted link' | 'encrypted link' | 'ok' | 'wrong'
type VaraEventWithoutData = 'disconnected' | 'ptt off' | 'ptt on' | 'pending' | 'cancel pending' | 'busy off' | 'busy on' | 'link registered' | 'link unregistered' | 'encryption disabled' | 'encryption ready' | 'unencrypted link' | 'encrypted link' | 'ok'

/**
 * An object representing the details of a new connection that has been made.
 */
export interface ConnectionData {
    /**
     * The callsign and SSID of the initiating station.
     */
    source: string,
    /**
     * The callsign and SSID of the receiving station.
     */
    destination: string,
    /**
     * The bandwidth that the connection was made at or the CQ frame was sent at.
     * 
     * For VARA HF: 500, 2300, or 2750
     * 
     * For VARA FM: 'NARROW' or 'WIDE'
     * 
     * For VARA SAT: undefined
     */
    bw?: 500 | 2300 | 2750 | 'narrow' | 'wide',
    /**
     * The first digipeater (if applicable) in the path between stations.
     */
    digi1?: string,
    /**
     * The second digipeater (if applicable) in the path between stations.
     */
    digi2?: string
}

/**
 * An object representing the details of CQ frame that was received.
 */
export interface CQFrameData extends Omit<ConnectionData, 'destination'> { }

/**
 * An object representing bitrate and speed information about a connection to a remote station.
 */
export interface BitrateData {
    /**
     * The current VARA speed level that is in use.
     */
    sl: number,
    /**
     * The current bitrate between the stations in bits per second.
     */
    bps: number
}

/**
 * TODO:
 */
export class VaraJS extends EventEmitter {

    private _connection: ConnectionData | undefined;
    /**
     * Information about the current connection. If there is no active connection then it is undefined.
     * 
     * Use the asynchronous connect() and disconnect() methods to change this.
     * @see {@link ConnectionData}
     * @see {@link connect()}
     * @see {@link disconnect()}
     */
    public get connection(): ConnectionData | undefined {
        return this._connection;
    }
    private set connection(value: ConnectionData | undefined) {
        this._connection = value;
    }

    private _listening: boolean = false;
    /**
     * Whether vara is currently listening for incoming connections or not.
     * 
     * To change this value, use the asynchronous listenOn() and listenOff() methods.
     * @see {@link listenOn()}
     * @see {@link listenOff()}
     */
    public get listening(): boolean {
        return this._listening
    }
    private set listening(value: boolean) {
        this._listening = value;
    }

    /**
     * If VARA is currently disconnected.
     * 
     * To disconnect, use the asynchronous disconnect() method.
     * @see {@link disconnect()}
     * @see {@link connect()}
     */
    public get disconnected(): boolean {
        return !this.connection
    }

    private _compression: 'off' | 'text' | 'files' = 'text';
    /**
     * The compression setting that is currently enabled. Default is TEXT.
     * 
     * Use the asynchronous compressionOff(), compressionText(), and compressionFiles() methods to change this.
     * @see {@link compressionOff()}
     * @see {@link compressionText()}
     * @see {@link compressionFiles()}
     */
    public get compression(): 'off' | 'text' | 'files' {
        return this._compression
    }
    private set compression(value: 'off' | 'text' | 'files') {
        this._compression = value;
    }

    private _bw: 500 | 2300 | 2750 | 'narrow' | 'wide' | undefined;
    /**
      * The bandwidth setting that is currently in use. Will be undefined if using VARA SAT, or if using VARA FM and a connection has not been made.
      * 
      * If using VARA HF, use the asynchronous bw500(), bw2300(), and bw2750() methods to change this. If using VARA FM, this is set automatically.
      * @see {@link bw500()}
      * @see {@link bw2300()}
      * @see {@link bw2750()}
      */
    public get bw(): 500 | 2300 | 2750 | 'narrow' | 'wide' | undefined {
        return this._bw
    }
    private set bw(value: 500 | 2300 | 2750 | 'narrow' | 'wide' | undefined) {
        this._bw = value;
    }

    private _chat: boolean = false;
    /**
     * Whether or not VARA is currently set to chat mode. Default is false.
     * 
     * Use the asynchronous chatOn() and chatOff() methods to change this.
     * @see {@link chatOn()}
     * @see {@link chatOff()}
     */
    public get chat(): boolean {
        return this._chat
    }
    private set chat(value: boolean) {
        this._chat = value;
    }

    private _session: 'winlink' | 'p2p' | undefined;
    /**
     * What session type is in use (VARA HF and VARA SAT only). WINLINK is default. Undefined if using VARA FM.
     * 
     * Use the asynchronous p2pSession() and winlinkSession() methods to change this.
     * @see {@link p2pSession()}
     * @see {@link winlinkSession()}
     */
    public get session(): 'winlink' | 'p2p' | undefined {
        if (this.varaType !== 'fm') {
            return this._session
        }
        return undefined
    }
    private set session(value: 'winlink' | 'p2p' | undefined) {
        this._session = value;
    }

    private _ptt: boolean = false;
    /**
     * Whether PTT is currently on if using VARA FM, or should be in the turned on state by the client if using VARA HF or VARA SAT.
     * 
     * This value is updated automatically.
     */
    public get ptt(): boolean {
        return this._ptt
    }
    private set ptt(value: boolean) {
        this._ptt = value;
    }

    private _buffer: number = 0;
    /**
     * The most recent amount of bytes that VARA stated was in the transmit buffer queue. 0 on startup.
     * 
     * This value is updated automatically. Use the asynchronous cleanTxBuffer() method if you wish to clear this.
     * @see {@link cleanTxBuffer()}
     */
    public get buffer(): number {
        return this._buffer
    }
    private set buffer(value: number) {
        this._buffer = value;
    }

    private _pending: boolean = false;
    /**
     * If a pending connect request has been detected.
     * 
     * This provides an early warning to the host that a connection may be in process so it can hold any scanning activity. 
     * 
     * This value is updated automatically.
     */
    public get pending(): boolean {
        return this._pending;
    }
    private set pending(value: boolean) {
        this._pending = value;
    }

    private _busy: boolean = false;
    /**
     * If the current channel is busy or not.
     * 
     * This value is updated automatically.
     */
    public get busy(): boolean {
        return this._busy
    }
    private set busy(value: boolean) {
        this._busy = value;
    }

    private _registered: string[] = [];
    /**
     * Callsigns that are currently registered in the VARA modem.
     * 
     * Use the asynchronous myCall() method to change this.
     * @see {@link myCall()}
     */
    public get registered(): string[] {
        return this._registered
    }
    private set registered(value: string[]) {
        this._registered = value;
    }

    private _linkRegistered: boolean = false;
    /**
     * If the current client station is registered in VARA, and therefore supports higher speeds.
     * 
     * This value is updated automatically.
     */
    public get linkRegistered(): boolean {
        return this._linkRegistered
    }
    private set linkRegistered(value: boolean) {
        this._linkRegistered = value;
    }

    private _sn: number | undefined;
    /**
     * The most recent signal to noise value.
     * VARA sends these periodically and they are cached in this property for convenience.
     * Undefined if not currently connected to a remote station.
     * 
     * This value is updated automatically.
     */
    public get sn(): number | undefined {
        return this._sn
    }
    private set sn(value: number | undefined) {
        this._sn = value;
    }

    private _bitrate: BitrateData | undefined;
    /**
     * An object containing the most recent bitrate information emitted by VARA, cached in this property for convenience.
     * Contains an sl (speed level) property and a bps (bits per second) property.
     * Undefined if not currently connected to a remote station.
     * 
     * This value is updated automatically.
     */
    public get bitrate(): BitrateData | undefined {
        return this._bitrate
    }
    private set bitrate(value: BitrateData | undefined) {
        this._bitrate = value;
    }

    private _encryption: boolean = false;
    /**
     * Whether encryption is currently enabled or not. Only for commercial use, not for amateur use.
     * 
     * This value is updated automatically and depends on the callsign that you have entered in the modem's settings.
     */
    public get encryption(): boolean {
        return this._encryption
    }
    private set encryption(value: boolean) {
        this._encryption = value;
    }

    private _encryptedLink: boolean = false;
    /**
     * Whether data flow is currently being encrypted. True if encryption is in use, false if not.
     * Only for commercial use, not for amateur use.
     * 
     * This value is updated automatically.
     */
    public get encryptedLink(): boolean {
        return this._encryptedLink
    }
    private set encryptedLink(value: boolean) {
        this._encryptedLink = value;
    }

    private _varaType!: 'hf' | 'fm' | 'sat'
    /**
     * Which version of the VARA modem you are using. Certain functions are only available to specific VARA modem types.
     * 
     * For example, bandwidth setting functions are only applicable to VARA HF.
     * 
     * You can change this value if it was improperly set in the constructor. Otherwise, it's not usually necessary to change.
     * This can be avoided entirely by simply not defining the varaType property in the factory function and awaiting the result.
     */
    public get varaType(): 'hf' | 'fm' | 'sat' {
        return this._varaType;
    }
    public set varaType(value: 'hf' | 'fm' | 'sat') {
        if (value === 'hf' && (this.bw === 'narrow' || this.bw === 'wide' || typeof this.bw === 'undefined')) {
            this.bw = 2300
        }
        if ((value === 'hf' || value === 'sat') && typeof this.session === 'undefined') {
            this.session = 'winlink'
        }
        else if (value === 'fm') {
            this.session = undefined
        }
        this._varaType = value;
    }

    /**
     * The Socket object that is connected to the command port in use by VARA. Usually 8300. 
     * 
     * In most cases you can simply use the built in functions and event listeners of this class instead of interacting with the command socket directly,
     * but it is left exposed in case you need it.
     */
    public commandSocket: Socket

    /**
     * The Socket object that is connected to the data port in use by VARA. Its port number is the port number of the command port + 1, usually 8301.
     * 
     * Data sent between stations is written to and read from this socket. The end of an individual transmission or complete "thought"
     * by many programs such as Winlink is usually marked by an "\r" aka carriage return. Note that when writing directly to this socket,
     * you must remember to add the "\r" yourself. The send() method appends it automatically if necessary for convenience.
     */
    public dataSocket: Socket;

    /**
     * Many applications like Winlink use an "\r" aka a carriage return to signify the end of an individual transmission or a complete "thought".
     * Setting this to true and setting an encoding (usually utf8) will cause 'data' events on the VaraJS instance that are of a string type to only be emitted fully assembled
     * after a carriage return has been received. This makes working with small amounts of data much easier but should be used with caution
     * as it can be more memory intensive. If memory is a concern, consider working with the dataSocket directly using Node's streams API instead.
     */
    public concatenateData: boolean

    /**
     * @privateRemarks
     * used for building concatenated strings from the data port
     */
    private tempData: string = ''

    private lastFunc: Function
    private lastArgs: IArguments

    /**
     * Factory function to bind to a VARA software modem.
     * 
     * All properties are optional, but if you don't specify varaType, a promise is returned while the varaType is determined automatically.
     */
    public static new(args: {
        /**
         * The IP address or domain name of the VARA modem.
         * @default 'localhost'
         */
        host?: string
        /**
         * The port number of the VARA modem's command port.
         * @default 8300
         */
        commandPort?: number
        /**
         * Which type of VARA modem is in use.
         * While this property is optional, if you choose not to specify it then a promise is returned while the type is requested from the modem.
         */
        varaType: 'hf' | 'fm' | 'sat'
        /**
         * Which BufferEncoding type is being used on the dataSocket.
         * Specifying the type will cause data on the socket and emitted in the events to be string type.
         * Not specifying will cause data on the socket, emitted in events, and returned by promises to be Buffer objects.
         * @default undefined
         */
        encoding?: BufferEncoding
        /**
         * Many applications like Winlink use an "\r" aka a carriage return to signify the end of an individual transmission or a complete "thought".
         * Setting this to true and setting an encoding (usually utf8) will cause data that is in string format to only be emitted fully assembled
         * after a carriage return has been received. This makes working with small amounts of data much easier but should be used with caution
         * as it can be more memory intensive. If memory is a concern, consider working with the dataSocket directly using Node's streams API instead.
         * @default true
         */
        concatenateData?: boolean
    }): VaraJS
    public static async new(args?: {
        /**
         * The IP address or domain name of the VARA modem.
         * @default 'localhost'
         */
        host?: string
        /**
         * The port number of the VARA modem's command port.
         * @default 8300
         */
        commandPort?: number
        /**
         * Which type of VARA modem is in use.
         * While this property is optional, if you choose not to specify it then a promise is returned while the type is requested from the modem.
         */
        varaType?: 'hf' | 'fm' | 'sat'
        /**
         * Which BufferEncoding type is being used on the dataSocket.
         * Specifying the type will cause data on the socket and emitted in the events to be string type.
         * Not specifying will cause data on the socket, emitted in events, and returned by promises to be Buffer objects.
         * @default undefined
         */
        encoding?: BufferEncoding
        /**
         * Many applications like Winlink use an "\r" aka a carriage return to signify the end of an individual transmission or a complete "thought".
         * Setting this to true and setting an encoding (usually utf8) will cause data that is in string format to only be emitted fully assembled
         * after a carriage return has been received. This makes working with small amounts of data much easier but should be used with caution
         * as it can be more memory intensive. If memory is a concern, consider working with the dataSocket direcly using Node's streams API instead.
         * @default true
         */
        concatenateData?: boolean
    }): Promise<VaraJS>
    public static new(args?: {
        /**
         * The IP address or domain name of the VARA modem.
         * @default 'localhost'
         */
        host?: string
        /**
         * The port number of the VARA modem's command port.
         * @default 8300
         */
        commandPort?: number
        /**
         * Which type of VARA modem is in use.
         * While this property is optional, if you choose not to specify it then a promise is returned while the type is requested from the modem.
         */
        varaType?: 'hf' | 'fm' | 'sat'
        /**
         * Which BufferEncoding type is being used on the dataSocket.
         * Specifying the type will cause data on the socket and emitted in the events to be string type.
         * Not specifying will cause data on the socket, emitted in events, and returned by promises to be Buffer objects.
         * @default undefined
         */
        encoding?: BufferEncoding
        /**
         * Many applications like Winlink use an "\r" aka a carriage return to signify the end of an individual transmission or a complete "thought".
         * Setting this to true and setting an encoding (usually utf8) will cause data that is in string format to only be emitted fully assembled
         * after a carriage return has been received. This makes working with small amounts of data much easier but should be used with caution
         * as it can be more memory intensive. If memory is a concern, consider working with the dataSocket directly using Node's streams API instead.
         * @default true
         */
        concatenateData?: boolean
    }): VaraJS | Promise<VaraJS> {
        args ??= {}
        const vj: VaraJS = new VaraJS(args.host ?? 'localhost', args.commandPort ?? 8300, args.concatenateData ?? true, args.encoding)

        if (args.varaType) {
            vj.varaType = args.varaType
            return vj
        }

        return vj.version().then(() => { // calling version() has the side effect of updating the internal varaType
            return vj
        })
    }

    // private static errorMessage(message: string): string
    // private static errorMessage(lastFunction: Function, lastFunctionArgs: IArguments): string
    // private static errorMessage(messageOrLastFunction: string | Function, lastFunctionArgs?: IArguments): string {
    //     if (typeof messageOrLastFunction === 'string') {
    //         return messageOrLastFunction
    //     }
    //     return `VARA returned wrong for ${messageOrLastFunction.name}(${Array.from(lastFunctionArgs ?? [])}).\nCheck your arguments, the order of your function calls, and that this command is compatible with the currently running version of VARA.`
    // }

    private constructor(host: string, commandPort: number, concatenateData: boolean, encoding?: BufferEncoding) {

        super()

        this.lastFunc = this.constructor
        this.lastArgs = arguments

        this.setMaxListeners(27) // raise the warning threshold to the number of emitted events from this class, which is 27

        this.concatenateData = concatenateData

        this.dataSocket = createConnection({
            host,
            port: commandPort + 1
        }).setEncoding(encoding)

        this.dataSocket.on('data', (rawData: string | Buffer) => {
            if (this.concatenateData && typeof rawData === 'string') {
                const dataArray: string[] = rawData.split('\r').filter((e) => { return e !== '' }) // remove empty strings, they serve no purpose

                // if temp data is awaiting concatenation or the current raw data doesn't contain the delimiter
                if (this.tempData.length > 0 || !rawData.includes('\r')) {
                    this.tempData += dataArray.shift() // pop it out of the array and concatenate it to the temp data holder
                    if (rawData.includes('\r')) { // if it does contain the delimiter emit it
                        this.emit('data', this.tempData)
                        this.tempData = ''
                    }
                }

                // check for greater than 0 length because we used shift earlier, if the final command doesn't end with the delimiter then add it to the temp data holder
                if (dataArray.length > 0 && !rawData.endsWith('\r')) {
                    this.tempData += dataArray.pop()
                }

                // if there's any remaining elements after possibly removing the first and last elements, then emit them
                dataArray.map((d: string) => {
                    this.emit('data', d)
                })
            }
            // otherwise just emit whatever we got
            else {
                this.emit('data', rawData)
            }
        })

        this.commandSocket = createConnection({
            host,
            port: commandPort
        }).setEncoding('utf8').on('data', (rawCommands: string) => {

            rawCommands.trim().split('\r').map((command) => {

                const asArray: string[] = command.split(' ')

                if (asArray[0] === 'IAMALIVE') {
                    this.emit('i am alive', Date.now())
                }
                else if (asArray[0] === 'WRONG') {
                    this.emit('wrong', new Error(`VARA returned "WRONG" for ${this.lastFunc}(${Array.from(this.lastArgs)}).\nCheck your arguments, the order of your function calls, and that this command is compatible with the currently running version of VARA.`))
                }
                else if (command === 'MISSING SOUNDCARD') {
                    this.emit('missing soundcard', new Error('Vara has detected that the soundcard is missing. Please check your settings and hardware connections and reconnect.'))
                }
                else if (asArray[0] === 'CONNECTED') {
                    this.connection = {
                        source: asArray[1],
                        destination: asArray[2]
                    }
                    if (asArray.length === 4) { // VARA HF and VARA FM with no digipeaters
                        if (!isNaN(parseInt(asArray[3]))) {
                            this.connection.bw = parseInt(asArray[3]) as 500 | 2300 | 2750
                        }
                        else {
                            this.connection.bw = asArray[3].toLowerCase() as 'narrow' | 'wide'
                        }
                    }
                    else if (asArray.length === 6) { // VARA FM with one digipeater
                        this.connection.bw = asArray[5].toLowerCase() as 'narrow' | 'wide'
                        this.connection.digi1 = asArray[4]
                    }
                    else if (asArray.length === 7) { // VARA FM with two digipeaters
                        this.connection.bw = asArray[6].toLowerCase() as 'narrow' | 'wide'
                        this.connection.digi1 = asArray[4]
                        this.connection.digi2 = asArray[5]
                    }
                    this.bw = this.connection.bw
                    this.emit('connected', this.connection)
                }
                else if (asArray[0] === 'BUFFER') {
                    this.buffer = parseInt(asArray[1])
                    this.emit('buffer', this.buffer)
                }
                else if (asArray[0] === 'REGISTERED') {
                    this.registered = asArray.slice(1)
                    this.emit('registered', this.registered)
                }
                else if (asArray[0] === 'CQFRAME') {
                    const cq: CQFrameData = {
                        source: asArray[1],
                        digi2: asArray[3] // possibly undefined but that's ok
                    }
                    if (!isNaN(parseInt(asArray[2]))) { // if it's numeric then it's bandwidth
                        cq.bw = parseInt(asArray[2]) as 500 | 2300 | 2750
                    }
                    else {
                        cq.digi1 = asArray[2] // possibly undefined but that's ok
                    }
                    this.emit('cq frame', cq)
                }
                else if (asArray[0] === 'SN') {
                    this.sn = parseFloat(asArray[1])
                    this.emit('sn', this.sn)
                }
                else if (asArray[0] === 'BITRATE') {
                    this.bitrate = {
                        sl: parseInt(asArray[1].substring(1, asArray[1].length - 1)), // remove the surrounding parentheses
                        bps: parseInt(asArray[3]) // VARA adds an extra space between speed level and bps value for some reason which messes up the array split by ' '
                    }
                    this.emit('bitrate', this.bitrate)
                }
                else if (asArray[0] === 'CLEANTXBUFFER') {
                    if (asArray[1] === 'BUFFEREMPTY') {
                        this.emit('clean tx buffer', 'buffer empty')
                    }
                    else {
                        this.emit('clean tx buffer', asArray[1].toLowerCase() as 'ok' | 'failed')
                    }
                }
                else if (asArray[0] === 'VERSION') {
                    this.varaType = asArray[2].toLowerCase() as 'hf' | 'fm' | 'sat'
                    this.emit('version', asArray.slice(1).join(' '))
                }
                else if (command === 'DISCONNECTED') {
                    this.connection = undefined
                    this.sn = undefined
                    this.bitrate = undefined
                    this.buffer = 0
                    this.linkRegistered = false
                    this.encryptedLink = false
                    this.emit('disconnected')
                }
                else if (command === 'PTT OFF') {
                    this.ptt = false
                    this.emit('ptt off')
                }
                else if (command === 'PTT ON') {
                    this.ptt = true
                    this.emit('ptt on')
                }
                else if (command === 'PENDING') {
                    this.pending = true
                    this.emit('pending')
                }
                else if (command === 'CANCELPENDING') {
                    this.pending = false
                    this.emit('cancel pending')
                }
                else if (command === 'BUSY OFF') {
                    this.busy = false
                    this.emit('busy off')
                }
                else if (command === 'BUSY ON') {
                    this.busy = true
                    this.emit('busy on')
                }
                else if (command === 'LINK REGISTERED') {
                    this.linkRegistered = true
                    this.emit('link registered')
                }
                else if (command === 'LINK UNREGISTERED') {
                    this.linkRegistered = false
                    this.emit('link unregistered')
                }
                else if (command === 'ENCRYPTION DISABLED') {
                    this.encryption = false
                    this.emit('encryption disabled')
                }
                else if (command === 'ENCRYPTION READY') {
                    this.encryption = true
                    this.emit('encryption ready')
                }
                else if (command === 'UNENCRYPTED LINK') {
                    this.encryptedLink = false
                    this.emit('unencrypted link')
                }
                else if (command === 'ENCRYPTED LINK') {
                    this.encryptedLink = true
                    this.emit('encrypted link')
                }
            })
        })
    }

    /**
     * Connect to a remote VARA station.
     * @param source Your station's callsign and optional SSID.
     * @param destination The remote station's callsign and optional SSID.
     * @param digi1 An optional first digipeater in your path. Only for VARA FM, will be ignored if varaType property is not set to FM.
     * @param digi2 An optional second digipeater in your path. Only for VARA FM, will be ignored if varaType property is not set to FM.
     * @returns A Promise\<void\> that resolves upon successful connection to the remote station, or rejects if connection was unsuccessful.
     */
    public async connect(source: string, destination: string, digi1?: string, digi2?: string): Promise<ConnectionData> {
        this.lastFunc = this.connect
        this.lastArgs = arguments
        if (this.varaType === 'fm' && digi1 && digi2) {
            this.commandSocket.write(`CONNECT ${source} ${destination} VIA ${digi1} ${digi2}\r`)
        }
        else if (this.varaType === 'fm' && digi1) {
            this.commandSocket.write(`CONNECT ${source} ${destination} VIA ${digi1}\r`)
        }
        else {
            this.commandSocket.write(`CONNECT ${source} ${destination}\r`)
        }
        const result = await Promise.race([
            once(this, 'wrong'),
            once(this, 'connected'),
            once(this, 'disconnected')
        ])
        if ('source' in result && 'destination' in result) {
            return result as ConnectionData
        }
        else if (result instanceof Error) {
            return Promise.reject(result)        }
        return Promise.reject(new Error(`VARA was unable to make a connection from ${source} to ${destination}.`))
    }

    /**
     * Set incoming connections to enabled.
     * 
     * This command will cause a disconnection if it is received in the middle of a VARA connection
     * @returns a \<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async listenOn(): Promise<void> {
        this.lastFunc = this.listenOn
        this.lastArgs = arguments
        this.commandSocket.write('LISTEN ON\r')
        await once(this, 'ok')
        this.listening = true
    }

    /**
     * Incomming connections disabled.
     * 
     * This command will cause a disconnection if it is received in the middle of a VARA connection.
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async listenOff(): Promise<void> {
        this.lastFunc = this.listenOff
        this.lastArgs = arguments
        this.commandSocket.write('LISTEN OFF\r')
        await once(this, 'ok')
        this.listening = false
    }

    /**
     * Set current call sign (maximum 5 call signs).
     * 
     * Legitimate call signs include from 3 to 7 ASCII characters (A-Z, 0-9) followed by an optional “-“ and an SSID of -1 to -15, -T, and -R. 
     * @param upToFiveCallsigns a string or array of strings containing the callsign(s) to set.
     * @returns a Promise\<string\> that resolves to the callsigns that were registered.
     */
    public async myCall(upToFiveCallsigns: string | string[]): Promise<string[]> {

        // convert string to array to make it easier to work with
        if (typeof upToFiveCallsigns === 'string') {
            upToFiveCallsigns = upToFiveCallsigns.split(' ')
        }

        // check that no more than 5 callsigns were passed
        if (upToFiveCallsigns.length > 5) {
            return Promise.reject(new Error(`${upToFiveCallsigns.length} callsigns were passed to myCall(). VARA supports a maximum of 5 callsigns.`))
        }

        // errors handled internally
        // not using that global error handler and attempting to catch all things that could cause a wrong event before it happens
        const error: Error = new Error()

        // check each callsign
        upToFiveCallsigns.map((cs: string) => {
            const csArr: string[] = cs.split('-')
            if (csArr[0].length < 3) {
                error.message += `Callsign "${cs}" is invalid. The minimum amount of characters is 3, not including the SSID, only ${csArr[0].length} characters were found.`
            }
            else if (cs.length > 7) {
                error.message += `Callsign "${cs}" is invalid. The maximum amount of characters is 7, ${cs.length} characters were found.\n`
            }
            else if (!csArr[0].match(/^[a-z0-9]+$/i)) {
                error.message += `Callsign "${cs}" contains illegal characters.\n`
            }
            else if (isNaN(parseInt(csArr[1])) && csArr[1] !== 'T' && csArr[1] !== 'R') {
                error.message += `Callsign "${cs}" is invalid. ${csArr[1]} is not a valid SSID.\n`
            }
            else if (parseInt(csArr[1]) < 0 || parseInt(csArr[1]) > 15) {
                error.message += `Callsign "${cs}" is invalid. ${csArr[1]} is not a valid SSID.\n`
            }
        })
        if (error.message !== '') {
            // TODO:
            // this.emit('WRONG', error)
            return Promise.reject(error)
        }
        return once(this, 'registered')
    }

    /**
     * Disconnect the link, once the TX buffer is empty. 
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async disconnect(): Promise<void> {
        this.lastFunc = this.disconnect
        this.lastArgs = arguments
        this.commandSocket.write('DISCONNECT\r')
        // interal state is reset by event handlers defined in the constructor
        await once(this, 'disconnected')
    }

    /**
     * Disconnect the link immediately. (dirty disconnect)
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async abort(): Promise<void> {
        this.lastFunc = this.abort
        this.lastArgs = arguments
        this.commandSocket.write('ABORT\r')
        await once(this, 'ok')
        this.connection = undefined
        this.sn = undefined
        this.bitrate = undefined
        this.buffer = 0
    }

    /**
     * Set compression to disabled.
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async compressionOff(): Promise<void> {
        this.lastFunc = this.compressionOff
        this.lastArgs = arguments
        this.commandSocket.write('COMPRESSION OFF\r')
        await once(this, 'ok')
        this.compression = 'off'
    }

    /**
     * Huffman compression enabled, designed for text type information. Recommended for Winlink.
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async compressionText(): Promise<void> {
        this.lastFunc = this.compressionText
        this.lastArgs = arguments
        this.commandSocket.write('COMPRESSION TEXT\r')
        await once(this, 'ok')
        this.compression = 'text'
    }

    /**
     * Compression designed for file transfers
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async compressionFiles(): Promise<void> {
        this.lastFunc = this.compressionFiles
        this.lastArgs = arguments
        this.commandSocket.write('COMPRESSION FILES\r')
        await once(this, 'ok')
        this.compression = 'files'
    }

    /**
     * Set VARA HF to 500Hz Narrow mode
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async bw500(): Promise<void> {
        this.lastFunc = this.bw500
        this.lastArgs = arguments
        this.commandSocket.write('BW500\r')
        await once(this, 'ok')
        this.bw = 500
    }

    /**
     * Set VARA HF to 2300Hz Standard mode (default)
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async bw2300(): Promise<void> {
        this.lastFunc = this.bw2300
        this.lastArgs = arguments
        this.commandSocket.write('BW2300\r')
        await once(this, 'ok')
        this.bw = 2300
    }

    /**
     * Set VARA HF to 2750Hz Tactical mode 
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async bw2750(): Promise<void> {
        this.lastFunc = this.bw2750
        this.lastArgs = arguments
        this.commandSocket.write('BW2750\r')
        await once(this, 'ok')
        this.bw = 2750
    }

    /**
     * Optimizes VARA timing for using with chat type apps like VARA Chat, VarAC, vARIM ....
     * 
     * Support high latency to connect two FlexRadio: SDR<->SDR
     * 
     * Infinite Idle loop. Allows both stations to be in sync forever, until the path dies
     * 
     * Optimize the handover interchange for keyboard to keyboard.
     * 
     * This command should not be used with Winlink or B2F protocol apps.
     * 
     * Includes the LISTEN ON command 
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async chatOn(): Promise<void> {
        this.lastFunc = this.chatOn
        this.lastArgs = arguments
        this.commandSocket.write('CHAT ON\r')

        /**
         * @privateRemarks
         * Vara HF doesn't return ok like it's supposed to. Vara FM and Vara Sat do though.
         * This seems to be an upstream bug since the dev doc states that all Vara versions should return ok.
         * It does seem to return BUSY OFF when given the command, but I can't actually test this with a radio because I'm only a technician class operator.
         * 
         * Hoping that a future version of Vara HF fixes this and to avoid breaking the JS API when it does,
         * and in order to provide a consistent experience with all of the functions returning a promise,
         * we'll just return a resolved promise for now.
         */
        if (this.varaType === 'hf') {
            this.chat = true
            return
        }
        await once(this, 'ok')
        this.chat = true
    }

    /**
     * Optimize the handover interchange for Winlink, B2F protocol, BBS, etc...
     * 
     * Limited Idle Loops. Avoids the stations staying connected forever in a loop.
     * 
     * Latency limited according Trimode Scan time of 4 seconds. Only one Flexradio can be used in
     * the link: SDR<->Analog Rig or Analog Rig<->SDR 
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async chatOff(): Promise<void> {
        this.lastFunc = this.chatOff
        this.lastArgs = arguments
        this.commandSocket.write('CHAT OFF\r')
        await once(this, 'ok')
        this.chat = false
    }

    /**
     * Send a CQ frame via VARA FM (without digipeaters) or via VARA SAT.
     * @param source The callsign and optional SSID that you wish the frame to be from.
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     * @overload
     */
    public async cqFrame(source: string): Promise<void>
    /**
     * Send a CQ frame via VARA HF.
     * @param source The callsign and optional SSID that you wish the frame to be from.
     * @param bandwidth The bandwidth that you wish to chat at.
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     * @overload
     */
    public async cqFrame(source: string, bandwidth: 500 | 2300 | 2750): Promise<void>
    /**
     * Send a CQ frame via VARA FM with up to 2 optional digipeaters.
     * @param source The callsign and optional SSID that you wish the frame to be from.
     * @param digi1 The first digipeater's callsign and optional SSID that you wish to use in your path.
     * @param digi2 The second digipeater's callsign and optional SSID that you wish to use in your path.
     * @returns a Promise<\void\> that resolves upon VARA's acknowledgment of the command.
     * @overload
     */
    public async cqFrame(source: string, digi1?: string, digi2?: string): Promise<void> // send a cq frame with vara fm
    public async cqFrame(source: string, bandwidthOrDigi1?: 500 | 2300 | 2750 | string, digi2?: string): Promise<void> {
        this.lastFunc = this.cqFrame
        this.lastArgs = arguments
        if (bandwidthOrDigi1 && digi2) {
            this.commandSocket.write(`CQFRAME ${source} ${bandwidthOrDigi1} ${digi2}\r`)
        }
        else if (bandwidthOrDigi1) {
            this.commandSocket.write(`CQFRAME ${source} ${bandwidthOrDigi1}\r`)
        }
        else {
            this.commandSocket.write(`CQFRAME ${source}\r`)
        }
        await once(this, 'ptt off') // final command after ok and pending that indicates that you're free to queue/send more data
    }

    /**
     * VARA HF and VARA SAT only
     * 
     * VARA sends retries following a 4.0 second cycle, necessary to connect with the RMS Gateways (DWELL time 4s) (DEFAULT)
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async winlinkSession(): Promise<void> {
        this.lastFunc = this.winlinkSession
        this.lastArgs = arguments
        this.commandSocket.write('WINLINK SESSION\r')
        await once(this, 'ok')
        this.session = 'winlink'
    }

    /**
     * VARA HF and VARA SAT only
     * 
     * Set the retry cycle to 4.6 seconds to allow connecting two SDR's at maximum latency (worst case)
     * 
     * This command must be used for P2P connections, not for gateway connections. 
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async p2pSession(): Promise<void> {
        this.lastFunc = this.p2pSession
        this.lastArgs = arguments
        this.commandSocket.write('P2P SESSION\r')
        await once(this, 'ok')
        this.session = 'p2p'
    }

    /**
     * VARA HF and VARA SAT only
     * 
     * Get the drive level value.
     * @returns a Promise<number> that resolves to a drive level number between -30 and 0, inclusive.
     * @overload
     */
    public async tune(): Promise<number>
    /**
     * VARA HF and VARA SAT only
     * 
     * Set TUNE Button to ON and drive level to X dB. The tune button will only be set to ON if at least one callsign is registered.
     * @param negativeDecibels The amount of decibles to set the drive level to. Must be between -30 and 0, inclusive.
     * @returns A Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     * @overload
     */
    public async tune(negativeDecibels: number): Promise<void>
    public async tune(negativeDecibels?: number): Promise<number | void> {
        return new Promise(async (resolve, reject) => {
            this.lastFunc = this.tune
            this.lastArgs = arguments
            if (this.varaType === 'fm') {
                reject(new Error('Tune functions can only be called when using VARA HF and VARA SAT'))
            }
            else if (typeof negativeDecibels !== 'undefined' && (negativeDecibels < -30 || negativeDecibels > 0)) {
                reject(new Error(`Valid tune values are between -30 and 0, inclusive. Received ${negativeDecibels}`))
            }
            else if (typeof negativeDecibels !== 'undefined') {
                this.commandSocket.write(`TUNE ${negativeDecibels}\r`)
                await once(this, 'ok')
                return
            }

            this.commandSocket.write('TUNE ?\r')

            const isTune = (command: string) => {
                if (command.startsWith('TUNE')) {
                    resolve(parseInt(command.substring(5)))
                    this.removeListener('command', isTune)
                }
            }
            this.on('command', isTune)
        })
    }

    /**
     * VARA HF and VARA SAT only
     * 
     * Set TUNE button to OFF
     * @returns a Promise\<void\> that resolves upon VARA's acknowledgment of the command.
     */
    public async tuneOff(): Promise<void> {
        this.lastFunc = this.tuneOff
        this.lastArgs = arguments
        if (this.varaType === 'fm') {
            throw new Error('Tune functions can only be called when using VARA HF and VARA SAT')
        }
        this.commandSocket.write('TUNE OFF\r')
        await once(this, 'ok')
    }

    /**
     * Erase the transmission buffer, in case transmission has not started yet. 
     * @returns a Promise\<'BUFFEREMPTY' | 'OK' | 'FAILED'\> that resolves to 'OK' or 'BUFFEREMPTY', or rejects if the status is 'FAILED'
     */
    public async cleanTxBuffer(): Promise<'bufferEmpty' | 'ok' | 'failed'> {
        this.lastFunc = this.cleanTxBuffer
        this.lastArgs = arguments
        this.commandSocket.write('CLEANTXBUFFER\r')
        // return new Promise((resolve, reject) => {
        //     this.once('CLEANTXBUFFER', (status) => {
        //         if (status === 'OK' || status === 'BUFFEREMPTY') {
        //             resolve(status)
        //             this.buffer = 0
        //         }
        //         else if (status === 'FAILED') {
        //             reject('Unable to erase the TX Buffer at the moment.')
        //         }
        //     })
        // })

        // TODO: TEST THIS MORE CONCISE VERSION AND SEE IF IT WORKS
        const status: 'failed' | 'bufferEmpty' | 'ok' = (await once(this, 'clean tx buffer'))[0]
        if (status === 'failed') {
            return Promise.reject('Unable to erase the TX Buffer at the moment.')
        }
        this.buffer = 0
        return status
    }

    /**
     * Get the VARA version.
     * @returns a Promise<string> that resolves to a string containing the current version of VARA.
     */
    public async version(): Promise<string> {
        this.lastFunc = this.version
        this.lastArgs = arguments
        this.commandSocket.write('VERSION\r')
        return (await once(this, 'version'))[0]
    }


    /**
     * Writes data to the VARA dataSocket. The second parameter specifies the encoding in the case of a string. It defaults to UTF8 encoding.
     * 
     * Returns true if the entire data was flushed successfully to the kernel buffer. Returns false if all or part of the data was queued in user memory.
     * 
     * The optional callback parameter will be executed when the data is finally written out, which may not be immediately.
     * 
     * If an error occurs, the callback will be called with the error as its first argument. The callback is called asynchronously.
     * 
     * See Writable stream write() method for more information.
     * 
     * In addition to the usual stream behavior, this method also appends a "\r" aka carriage return to the end of strings passed to it if necessary.
     * To avoid this behavior, write directly to the dataSocket object, or pass a Buffer to this method instead of a string.
     * @param buffer the data to write to the socket either as a string or a Uint8Array
     * @param encoding the encoding if using a string. Default is 'utf8'
     * @param cb an optional callback to execute after finishing writing the data. If an error occurs, it will be the first argument.
     */
    public send(buffer: Uint8Array | string, encoding?: BufferEncoding, cb?: (err?: Error) => void): boolean {
        this.lastFunc = this.send
        this.lastArgs = arguments
        if (typeof buffer === 'string' && !buffer.endsWith('\r')) {
            buffer += '\r'
        }
        return this.dataSocket.write(buffer, encoding, cb)
    }

    /**
     * Half-closes the commandSocket and dataSocket. i.e., it sends a FIN packet. It is possible the server will still send some data.
     * @see Writable.end() in the streams API for further details.
     */
    public end(): void {
        this.lastFunc = this.end
        this.lastArgs = arguments
        this.commandSocket.end()
        this.dataSocket.end()
    }

    /**
     * Alias for the end() method.
     * @alias {@link end()}
     */
    public close(): void {
        return this.end()
    }

    /**
     * Adds an event listener for data being received by the modem.
     * @param listener a callback function that provides the data received in the form of a Buffer.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('data', (data: Buffer) => {
     *     console.log(data.toString('utf8'))
     * })
     * ```
     */
    public on(eventName: 'data', listener: (data: Buffer) => void): this
    /**
     * Adds an event listener for data being received by the modem.
     * @param listener a callback function that provides the data received in the form of a string.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('data', (data: string) => {
     *     console.log(data)
     * })
     * ```
     * @overload
     */
    public on(eventName: 'data', listener: (data: string) => void): this
    /**
     * Adds an event listener for a command or status change being announced by the modem.
     * @param listener a callback function that provides the command or status change received in the form of a string.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('command', (command: string) => {
     *     console.log(command)
     * })
     * ```
     */
    public on(eventName: 'command', listener: (command: string) => void): this
    /**
     * Adds an event listener for a WRONG event. VARA emits these when an unprocessable command is issued to it.
     * Error handling style is left up to the individual developer and errors are not thrown automatically when this event is emitted.
     * @param listener a callback function that provides a standard Error object with the cause of the error.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('wrong', (err: Error) => {
     *     throw err
     * })
     * ```
     */
    public on(eventName: 'wrong', listener: (err: Error) => void): this
    /**
     * Adds an event listener for the event. 
     * @param listener a callback function to execute every time the event happens.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     */
    public on(eventName: VaraEventWithoutData, listener: () => void): this
    /**
     * Adds an event listener for the IAMALIVE event, which is emitted by VARA approximately every 60 seconds.
     * @param listener a callback function that provides the unix time in milliseconds of when the command was received from VARA.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('iAmAlive', (timestamp: number) => {
     *     console.log(`VARA alive and well @ ${new Date(timestamp).toLocaleTimeString()}`)
     * })
     * ```
     */
    public on(eventName: 'i am alive', listener: (timestamp: number) => void): this
    /**
     * Adds an event listener for the missing soundcard event, you should check your settings and hardware.
     * @param listener a callback function that provides a standard Error object.
     * @return a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('missingSoundcard', (err: Error) => {
     *     throw err
     * })
     * ```
     */
    public on(eventName: 'missing soundcard', listener: (err: Error) => void): this
    /**
     * Adds an event listener for the cleantxbuffer event, which is emitted as a response to the cleanTxBuffer() method.
     * @see {@link cleanTxBuffer()}
     * @param listener a callback function that provides the status of the tx buffer.
     * @return a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('cleanTxBuffer', (status: 'bufferEmpty' | 'ok' | 'failed') => {
     *     if (status === 'failed') {
     *         console.log('Failed to clean the tx buffer.')
     *     }
     * })
     * 
     * vj.cleanTxBuffer()
     * ```
     */
    public on(eventName: 'clean tx buffer', listener: (status: 'buffer empty' | 'ok' | 'failed') => void): this
    /**
     * Adds an event listener for the VERSION event, which is emitted as a response to calling the version() method.
     * @see {@link version()}
     * @param listener a callback function that provides the current version of VARA as a string.
     * @return a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('version', (version: string) => {
     *     console.log(`${version} is currently running.`)
     * })
     * 
     * vj.version()
     * ```
     */
    public on(eventName: 'version', listener: (version: string) => void): this
    /**
     * Adds an event listener for the CONNECTED event, which is emitted upon a successful inbound or outbound connection to a remote station.
     * @param listener a callback function that provides a ConnectionData object containing address, bandwidth, and routing information. 
     * @see {@link ConnectionData}
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type ConnectionData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('connected', (cd: ConnectionData) => {
     *     console.log('Connection made from ' + cd.source + (cd.digi1 ? ' via ' + cd.digi1 : '') + (cd.digi2 ? ', ' + cd.digi2 : ''))
     * })
     * 
     * vj.listenOn()
     * ```
     */
    public on(eventName: 'connected', listener: (cd: ConnectionData) => void): this
    /**
     * Adds an event listener for the BUFFER event, which is emitted by VARA when VARA adds data to queue or VARA removes acked bytes from queue.
     * @param listener a callback function that provides a number representing the amount of bytes currently in the transmit buffer queue.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('buffer', (bytes: number) => {
     *     if (bytes > 10_000_000) {
     *         console.log('There are currently over 10 MB of data in the transfer buffer queue. Consider reducing file sizes prior to sending them.')
     * })
     * ```
     */
    public on(eventName: 'buffer', listener: (bytes: number) => void): this
    /**
     * Adds an event listener for the REGISTERED event, which is emitted by VARA when callsigns have successfully been registered in VARA.
     * @param listener a callback function that provides an array of callsigns that were successfully registered in VARA.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('registered', (calls: string[]) => {
     *     console.log(`Successfully registered callsigns ${calls.join(', ')} in VARA ${vj.varaType}.`)
     * })
     * 
     * vj.myCall(['KO4LCM', 'KO4LCM-1'])
     * vj.myCall('KO4LCM KO4LCM-1') // also acceptable
     * ```
     */
    public on(eventName: 'registered', listener: (calls: string[]) => void): this
    /**
     * Adds an event listener for the CQFRAME event, which is emitted by VARA when it has received a CQ from another station.
     * @param listener a callback function that provides a CQFrameData object containing address, bandwidth, and routing information.
     * @see {@link CQFrameData}
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type CQFrameData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('cqFrame', (cq: CQFrameData) => {
     *     if (vj.varaType !== 'SAT') {
     *         console.log(`Received a CQ from ${cq.source} at ${cq.bw} bandwidth.`)
     *     }
     *     else {
     *         console.log(`Received a CQ from ${cq.source}.`) // bandwidth is undefined on VARA SAT
     *     }
     * })
     * ```
     */
    public on(eventName: 'cq frame', listener: (cq: CQFrameData) => void): this
    /**
     * Adds an event listener for the SN event, which is emitted by VARA when it has received a frame.
     * @param listener a callback function that provides a number representing the signal to noise ratio of the most recently received frame.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('sn', (sn: number) => {
     *     console.log(`The current signal to noise ratio is ${sn}`)
     * })
     * ```
     */
    public on(eventName: 'sn', listener: (sn: number) => void): this
    /**
     * Adds an event listener for the BITRATE event, which is emitted by VARA when it has an updated current bitrate and/or speed level.
     * @param listener a callback function that provides a BitrateData object, containing an sl and bps property representing the current speed level and bits per second, respectively.
     * @see {@link BitrateData}
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type BitrateData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.on('bitrate', (br: BitrateData) => {
     *     console.log(`Data is currently being transferred at ${br.bps} bits per second, speed level ${br.sl}.`)
     * })
     * ```
     */
    public on(eventName: 'bitrate', listener: (br: BitrateData) => void): this
    public on(eventName: VaraEvent, listener: (...args: any) => void): this {
        return super.on(eventName, listener)
    }

    /**
     * Adds **one-time** event listener for data being received by the modem.
     * @param listener a callback function that provides the data received in the form of a Buffer.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('data', (data: Buffer) => {
     *     console.log(data.toString('utf8'))
     * })
     * ```
     */
    public once(eventName: 'data', listener: (data: Buffer) => void): this
    /**
     * Adds a **one-time** event listener for data being received by the modem.
     * @param listener a callback function that provides the data received in the form of a string.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('data', (data: string) => {
     *     console.log(data)
     * })
     * ```
     */
    public once(eventName: 'data', listener: (data: string) => void): this
    /**
     * Adds a **one-time** event listener for a command or status change being announced by the modem.
     * @param listener a callback function that provides the command or status change received in the form of a string.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('command', (command: string) => {
     *     console.log(command)
     * })
     * ```
     */
    public once(eventName: 'command', listener: (command: string) => void): this
    /**
     * Adds a **one-time** event listener for a WRONG event. VARA emits these when an unprocessable command is issued to it.
     * Error handling style is left up to the individual developer and errors are not thrown automatically when this event is emitted.
     * @param listener a callback function that provides a standard Error object with the cause of the error.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('wrong', (err: Error) => {
     *     throw err
     * })
     * ```
     */
    public once(eventName: 'wrong', listener: (err: Error) => void): this
    /**
     * Adds a **one-time** event listener for the event. 
     * @param listener a callback function to execute every time the event happens.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     */
    public once(eventName: VaraEventWithoutData, listener: () => void): this
    /**
     * Adds a **one-time** event listener for the IAMALIVE event, which is emitted by VARA approximately every 60 seconds.
     * @param listener a callback function that provides the unix time in milliseconds of when the command was received from VARA.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('iAmAlive', (timestamp: number) => {
     *     console.log(`VARA alive and well @ ${new Date(timestamp).toLocaleTimeString()}`)
     * })
     * ```
     */
    public once(eventName: 'i am alive', listener: (timestamp: number) => void): this
    /**
     * Adds a **one-time** event listener for the missing soundcard event, you should check your settings and hardware.
     * @param listener a callback function that provides a standard Error object.
     * @return a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('missingSoundcard', (err: Error) => {
     *     throw err
     * })
     * ```
     */
    public once(eventName: 'missing soundcard', listener: (err: Error) => void): this
    /**
     * Adds a **one-time** event listener for the CLEANTXBUFFER event, which is emitted as a response to the cleanTxBuffer() method.
     * @param listener a callback function that provides the status of the tx buffer.
     * @return a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('cleanTxBuffer', (status: 'bufferEmpty' | 'ok' | 'failed') => {
     *     if (status === 'FAILED') {
     *         console.log('Failed to clean the tx buffer.')
     *     }
     * })
     * 
     * vj.cleanTxBuffer()
     * ```
     */
    public once(eventName: 'clean tx buffer', listener: (status: 'buffer empty' | 'ok' | 'failed') => void): this
    /**
     * Adds a **one-time** event listener for the VERSION event, which is emitted as a response to calling the version() method.
     * @param listener a callback function that provides the current version of VARA as a string.
     * @return a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('version', (version: string) => {
     *     console.log(`${version} is currently running.`)
     * })
     * 
     * vj.version()
     * ```
     */
    public once(eventName: 'version', listener: (version: string) => void): this
    /**
     * Adds a **one-time** event listener for the CONNECTED event, which is emitted upon a successful inbound or outbound connection to a remote station.
     * @param listener a callback function that provides a ConnectionData object containing address, bandwidth, and routing information. 
     * @see {@link ConnectionData}
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type ConnectionData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('CONNECTED', (cd: ConnectionData) => {
     *     console.log('Connection made from ' + cd.source + (cd.digi1 ? ' via ' + cd.digi1 : '') + (cd.digi2 ? ', ' + cd.digi2 : ''))
     * })
     * 
     * vj.listenOn()
     * ```
     */
    public once(eventName: 'connected', listener: (cd: ConnectionData) => void): this
    /**
     * Adds a **one-time** event listener for the BUFFER event, which is emitted by VARA when VARA adds data to queue or VARA removes acked bytes from queue.
     * @param listener a callback function that provides a number representing the amount of bytes currently in the transmit buffer queue.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('BUFFER', (bytes: number) => {
     *     if (bytes > 10_000_000) {
     *         console.log('There are currently over 10 MB of data in the transfer buffer queue. Consider slowing down the rate at which you are sending data or reduce file sizes.')
     * })
     * ```
     */
    public once(eventName: 'buffer', listener: (bytes: number) => void): this
    /**
     * Adds a **one-time** event listener for the REGISTERED event, which is emitted by VARA when callsigns have successfully been registered in VARA.
     * @param listener a callback function that provides an array of callsigns that were successfully registered in VARA.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('REGISTERED', (calls: string[]) => {
     *     console.log(`Successfully registered callsigns ${calls.join(', ')} in VARA ${vj.varaType}.`)
     * })
     * 
     * vj.myCall(['KO4LCM', 'KO4LCM-1'])
     * vj.myCall('KO4LCM KO4LCM-1') // also acceptable
     * ```
     */
    public once(eventName: 'registered', listener: (calls: string[]) => void): this
    /**
     * Adds a **one-time** event listener for the CQFRAME event, which is emitted by VARA when it has received a CQ from another station.
     * @param listener a callback function that provides a CQFrameData object containing address, bandwidth, and routing information.
     * @see {@link CQFrameData}
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type CQFrameData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('CQFRAME', (cq: CQFrameData) => {
     *     if (vj.varaType !== 'SAT') {
     *         console.log(`Received a CQ from ${cq.source} at ${cq.bw} bandwidth.`)
     *     }
     *     else {
     *         console.log(`Received a CQ from ${cq.source}.`) // bandwidth is undefined on VARA SAT
     *     }
     * })
     * ```
     */
    public once(eventName: 'cq frame', listener: (cq: CQFrameData) => void): this
    /**
     * Adds a **one-time** event listener for the SN event, which is emitted by VARA when it has received a frame.
     * @param listener a callback function that provides a number representing the signal to noise ratio of the most recently received frame.
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('SN', (sn: number) => {
     *     console.log(`The current signal to noise ratio is ${sn}`)
     * })
     * ```
     */
    public once(eventName: 'sn', listener: (sn: number) => void): this
    /**
     * Adds a **one-time** event listener for the BITRATE event, which is emitted by VARA when it has an updated current bitrate and/or speed level.
     * @param listener a callback function that provides a BitrateData object, containing an sl and bps property representing the current speed level and bits per second, respectively.
     * @see {@link BitrateData}
     * @returns a reference to the VaraJS instance, so that calls can be chained.
     * @overload
     * @example
     * ```ts
     * import { VaraJS, type BitrateData } from "varajs";
     * 
     * const vjs: VaraJS = await VaraJS.bindModem({
     *     host: 'localhost',
     *     commandPort: 8300,
     * })
     * 
     * vjs.once('BITRATE', (br: BitrateData) => {
     *     console.log(`Data is currently being transferred at ${br.bps} bits per second, speed level ${br.sl}.`)
     * })
     * ```
     */
    public once(eventName: 'bitrate', listener: (br: BitrateData) => void): this

    // implementation
    public once(eventName: VaraEvent, listener: (...args: any) => void): this {
        return super.once(eventName, listener)
    }

    // left in place because they make type checking during library development easier
    public emit<K>(eventName: 'data', data: string | Buffer): boolean
    public emit<K>(eventName: 'command', command: string): boolean
    public emit<K>(eventName: 'wrong', err: Error): boolean
    public emit<K>(eventName: VaraEventWithoutData): boolean
    public emit<K>(eventName: 'i am alive', timestamp: number): boolean
    public emit<K>(eventName: 'missing soundcard', err: Error): boolean
    public emit<K>(eventName: 'clean tx buffer', status: 'buffer empty' | 'ok' | 'failed'): boolean
    public emit<K>(eventName: 'version', version: string): boolean
    public emit<K>(eventName: 'connected', cd: ConnectionData): boolean
    public emit<K>(eventName: 'buffer', bytes: number): boolean
    public emit<K>(eventName: 'registered', calls: string[]): boolean
    public emit<K>(eventName: 'cq frame', cd: CQFrameData): boolean
    public emit<K>(eventName: 'sn', sn: number): boolean
    public emit<K>(eventName: 'bitrate', br: BitrateData): boolean
    public emit<K>(eventName: VaraEvent, ...args: any): boolean {
        return super.emit<K>(eventName, ...args)
    }

}