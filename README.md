# Cachea

A lightweight in-memory caching server built with TypeScript and Node.js.

## Todo
- Finish Client

## Features
- TCP-based client/server communication
- In-memory key-value storage
- Store and retrieve strings and objects
- Object property retrieval and merging
- Key expiration with TTL
- Automatic expired-entry cleanup

## Installation
git clone https://github.com/frankZZzzzzzzzz/Cachea.git  
cd Cachea  
npm install  

# Usage

## Configure the server with environment variables:

CACHEA_SERVER_PORT=3002  
CLEANUP_INTERVAL=60000

## Build and run:

npx tsc  
node src/CacheaServer/CacheaServer.js

# Commands

##  Cachea currently supports:

| Command | Input | Description |
|---------|-------|--------|-------------|
| `PING` | None | `PONG` | Checks if the server is running |
| `SET` | Key, Value | `SUCCESS` / `FAILURE` | Stores a value in the cache |
| `GET` | Key | Value / `FAILURE` | Retrieves a value from the cache |
| `SETEXPIRE` | Key, Time | `SUCCESS` / `FAILURE` | Sets an expiration time for a key |
| `SHUTDOWN` | None | `SUCCESS` | Shuts down the server |
