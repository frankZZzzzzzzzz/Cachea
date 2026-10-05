import { exit } from 'node:process';
import { Buffer } from "node:buffer"
import { type UUID } from "node:crypto"
import net from "node:net";
import dotenv from "dotenv"
dotenv.config();

import { CacheaStorage } from "./CacheaStorage.js"
import { Cachea } from "../protocal/CacheaTCPConnectionTypes.js"

const CACHEA_SERVER_PORT = Number(process.env.CACHEA_SERVER_PORT) || 3002;

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

                    const packet: Cachea.ServerReceiveType = JSON.parse(dataInBuffer.subarray(4, 4 + dataLengthBytes).toString());
                    dataInBuffer = dataInBuffer.subarray(4 + length);

                    this.handlePacket(packet, socket);
                }
            });
        });
    }
    handlePING(packet: Cachea.ServerReceiveType, socket: net.Socket){
        writePacketToClient(socket, packet.requestID, "FAILURE", null, "PONG");
    }
    handleSET(packet: Cachea.ServerReceiveType, socket: net.Socket){
        if (packet.key == null){
            writePacketToClient(socket, packet.requestID, "FAILURE", null, "Cannot SET without a key");
            return;
        }
        try{
            this.storage.setData(packet.key, packet.specifics as Cachea.SETSpecificType);
        } catch (e: unknown){
            if (e instanceof Error)
                writePacketToClient(socket, packet.requestID, "FAILURE", null, e.message);
            else
                writePacketToClient(socket, packet.requestID, "FAILURE", null, "Server Error");
        }
    }
    handleGET(packet: Cachea.ServerReceiveType, socket: net.Socket){
        if (packet.key == null){
            writePacketToClient(socket, packet.requestID, "FAILURE", null, "Cannot GET without a key");
            return;
        }
        try{
            const specifics = packet.specifics as Cachea.GETSpecificType;
            const data = this.storage.getData(packet.key, packet.specifics as Cachea.GETSpecificType);
            writePacketToClient(socket, packet.requestID, "SUCCESS", data, null);

        } catch (e: unknown){
            if (e instanceof Error)
                writePacketToClient(socket, packet.requestID, "FAILURE", null, "e.message");
            else
                writePacketToClient(socket, packet.requestID, "FAILURE", null, "Server Error");
        }
    }
    handleSETEXPIRE(packet: Cachea.ServerReceiveType, socket: net.Socket){
        if (packet.key == null){
            writePacketToClient(socket, packet.requestID, "FAILURE", null, "Cannot SETEXPIRE without a key");
            return;
        }
        try{
            this.storage.setExpire(packet.key, packet.specifics as Cachea.SETEXPIREType);
        } catch (e: unknown){
            if (e instanceof Error)
                writePacketToClient(socket, packet.requestID, "FAILURE", null, e.message);
            else
                writePacketToClient(socket, packet.requestID, "FAILURE", null, "Server Error");
        }
    }
    handlePacket(packet: Cachea.ServerReceiveType, socket: net.Socket){
        switch (packet.action.toUpperCase()){
            case "PING": 
                this.handlePING(packet, socket); 
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
                writePacketToClient(socket, packet.requestID, "SUCCESS", null, "Server has shut down");
                exit(0);
        }
    }
};
export function writePacketToClient(socket: net.Socket, requestID: UUID, status: Cachea.TCPReturnStatus, data: Cachea.TCPReturnData, message: Cachea.TCPReturnMessage = null){
    socket.write(Cachea.encodeMessage(JSON.stringify({
        requestID,
        status,
        data,
        message
    } satisfies Cachea.ClientReceiveType)));
}