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

Command	     Description  
PING	     Check server connection  
SET	         Store a value  
GET	         Retrieve a value  
SETEXPIRE	 Set a key expiration  
SHUTDOWN	 Stop the server  