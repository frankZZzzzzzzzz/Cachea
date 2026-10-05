import dotenv from "dotenv"
dotenv.config();

import net from "node:net"
import { randomUUID , type UUID} from "node:crypto";

import { Cachea } from "../protocal/CacheaTCPConnectionTypes.js"

const REQUEST_TIME_LIMIT: number = Number(process.env.REQUEST_TIME_LIMIT) || 2_000;
const ATTEMPT_CONNNECTION_RETRY_DURATION: number = Number(process.env.ATTEMPT_CONNNECTION_RETRY_DURATION) || 30_000;

type fulfillRequestType = {
    resolve: (value: Cachea.ClientReceiveType) => void;
}

class CacheaClient{
    ClientSocket: net.Socket;
    TCPRequests: Map<UUID, fulfillRequestType>;

    constructor (ServerIP: string, ServerPort: number = 3002){
        this.ClientSocket = new net.Socket();
        this.TCPRequests = new Map<UUID, fulfillRequestType>();

        this.#attemptConnection(ServerIP, ServerPort);
    }
    Connected(){
        return (this.ClientSocket.readyState == "open");
    }
    #attemptConnection(ServerIP: string, ServerPort: number){
        if (this.ClientSocket)
            this.ClientSocket.destroy;

        this.ClientSocket = net.createConnection(ServerPort, ServerIP);
        let dataInBuffer = Buffer.alloc(0);

        this.ClientSocket.on("data", (chunk)=>{
            
            dataInBuffer = Buffer.concat([dataInBuffer, Buffer.from(chunk)]);

            while (dataInBuffer.length > 4){
                const dataLengthBytes = dataInBuffer.readUInt32BE();

                if (dataInBuffer.length - 4 < dataLengthBytes)
                    return;

                const packet: Cachea.ClientReceiveType = JSON.parse(dataInBuffer.subarray(4, 4 + dataLengthBytes).toString());
                dataInBuffer = dataInBuffer.subarray(4 + length);

                this.#handlePacket(packet);
            }
        });
        this.ClientSocket.on("error", (Error) => {
            console.error("Database TCP error: " + Error.message);
        })
        this.ClientSocket.on("close", (hadError) => {
            console.error("Database TCP connection closed");

            for (const [requestID, request] of this.TCPRequests)
                request.resolve({
                    requestID,
                    status: "FAILURE",
                    message: "Database TCP connection closed",
                    data: null
                } satisfies Cachea.ClientReceiveType);
            
            this.TCPRequests.clear();
            setTimeout(()=>{
                this.#attemptConnection(ServerIP, ServerPort)
            }, ATTEMPT_CONNNECTION_RETRY_DURATION);
        })
    }
    #handlePacket(packet: Cachea.ClientReceiveType){
        const request = this.TCPRequests.get(packet.requestID);
        if (request)
            request.resolve(packet);
    }

    set(key:string, data: Cachea.SETSpecificType){
        if (!this.Connected())
            throw new Error("Has not connected to Cachea Server yet");
        return (this.sendRequestToServer(this.ClientSocket, "SET", key, data));
    }
    get(key:string, specifics: Cachea.GETSpecificType = []){
        if (!this.Connected())
            throw new Error("Has not connected to Cachea Server yet");
        return (this.sendRequestToServer(this.ClientSocket, "GET", key, specifics));
    }
    async sendRequestToServer(socket: net.Socket, action: Cachea.ActionTypes, key: string, specifics: Cachea.anySpecifics){
        const requestID: UUID = randomUUID();

        const specificRequest = new Promise((resolve, reject) => {
            const timeoutID = setTimeout(()=>{
                this.TCPRequests.delete(requestID);
                resolve({
                    requestID,
                    status: "FAILURE",
                    message: "Request Timed Out",
                    data: null
                } satisfies Cachea.ClientReceiveType);
            }, REQUEST_TIME_LIMIT);

            this.TCPRequests.set(requestID, {
                resolve: (value: unknown) => {
                    resolve(value);
                    clearTimeout(timeoutID);
                }
            } satisfies fulfillRequestType);

            writePacketToServer(socket, requestID, action, key, specifics);
        });

        return (await specificRequest);
    }
}

export function writePacketToServer(socket: net.Socket, requestID: UUID, action: Cachea.ActionTypes, key: string, specifics: Cachea.anySpecifics){
    socket.write(Cachea.encodeMessage(JSON.stringify({
        requestID,
        action,
        key,
        specifics
    } satisfies Cachea.ServerReceiveType)));
}