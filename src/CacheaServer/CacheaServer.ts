import { exit } from 'node:process';
import { Buffer } from "node:buffer"
import net from "node:net";
import dotenv from "dotenv"


import { CacheaStorage } from "./CacheaStorage.js"

dotenv.config();

const CACHEA_SERVER_PORT = Number(process.env.CACHEA_SERVER_PORT) || 3002;

type ActionTypes = "PING" | "SET" | "GET" | "SETEXPIRE" | "SHUTDOWN";
type SETSpecificType = Record<string, unknown> | string;
type GETSpecificType = string[];
type SETEXPIREType = number;

type TCPPacketType = {
    action: ActionTypes;
    key: string | null;
    specifics: SETSpecificType | GETSpecificType | SETEXPIREType;
}
type TCPReturnStatus = "SUCCESS" | "FAILURE";
type TCPReturnData = string | Object | null;
type TCPReturnMessage = string | null;;

type TCPReturnType = {
    status: TCPReturnStatus;
    message: TCPReturnMessage;
    data: TCPReturnData;
}

export class CacheaServer{
    server: net.Server;
    storage: CacheaStorage;
    constructor(){
        this.storage = new CacheaStorage();
        this.server = net.createServer();
        this.server.listen(CACHEA_SERVER_PORT);

        this.server.on("connection", (socket) =>{
            let dataInBuffer: Buffer<ArrayBuffer> = Buffer.alloc(0);

            socket.on("data", (chunk)=>{
                dataInBuffer = Buffer.concat([dataInBuffer, Buffer.from(chunk)]);

                while (dataInBuffer.length > 4){
                    const dataLengthBytes = dataInBuffer.readUInt32BE();

                    if (dataInBuffer.length - 4 < dataLengthBytes)
                        return;

                    const packet: TCPPacketType = JSON.parse(dataInBuffer.subarray(4, 4 + dataLengthBytes).toString());
                    dataInBuffer = dataInBuffer.subarray(4 + length);

                    this.handlePacket(packet, socket);
                }
            });
        });
    }
    handlePING(socket: net.Socket){
        writePacketToSocket(socket, "FAILURE", null, "PONG");
    }
    handleSET(packet: TCPPacketType, socket: net.Socket){
        if (packet.key == null){
            writePacketToSocket(socket, "FAILURE", null, "Cannot SET without a key");
            return;
        }
        try{
            this.storage.setData(packet.key, packet.specifics as SETSpecificType);
        } catch (e: unknown){
            if (e instanceof Error)
                writePacketToSocket(socket, "FAILURE", null, e.message);
            else
                writePacketToSocket(socket, "FAILURE", null, "Server Error");
        }
    }
    handleGET(packet: TCPPacketType, socket: net.Socket){
        if (packet.key == null){
            writePacketToSocket(socket, "FAILURE", null, "Cannot GET without a key");
            return;
        }
        try{
            const data = this.storage.getData(packet.key, packet.specifics as GETSpecificType);
            writePacketToSocket(socket, "SUCCESS", data, null);

        } catch (e: unknown){
            if (e instanceof Error)
                writePacketToSocket(socket, "FAILURE", null, "e.message");
            else
                writePacketToSocket(socket, "FAILURE", null, "Server Error");
        }
    }
    handleSETEXPIRE(packet: TCPPacketType, socket: net.Socket){
        if (packet.key == null){
            writePacketToSocket(socket, "FAILURE", null, "Cannot SETEXPIRE without a key");
            return;
        }
        try{
            this.storage.setExpire(packet.key, packet.specifics as SETEXPIREType);
        } catch (e: unknown){
            if (e instanceof Error)
                writePacketToSocket(socket, "FAILURE", null, e.message);
            else
                writePacketToSocket(socket, "FAILURE", null, "Server Error");
        }
    }
    handlePacket(packet: TCPPacketType, socket: net.Socket){
        switch (packet.action.toUpperCase()){
            case "PING": 
                this.handlePING(socket); 
                break;
            case "SET":
                this.handleSET(packet, socket);
                break;
            case "GET":
                this.handleGET(packet, socket);
                break;
            case "SETEXPIRE":
                this.handleSETEXPIRE(packet, socket);
                break;
            case "SHUTDOWN":
                this.storage.shutDown();
                writePacketToSocket(socket, "SUCCESS", null, "Server has shut down");
                exit(0);
        }
    }
};

export function convertString(returnObj: string){
    const data = Buffer.from(returnObj);
    const header = Buffer.alloc(4);
    header.writeUInt32BE(data.length)

    return (Buffer.concat([header, data]));
}
export function writePacketToSocket(socket: net.Socket, status: TCPReturnStatus, data: TCPReturnData, message: TCPReturnMessage = null){
    socket.write(convertString(JSON.stringify({
        status,
        data,
        message
    } as TCPReturnType)));
}