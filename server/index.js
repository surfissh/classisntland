import http from 'http'
import { WebSocketServer } from 'ws'
import { setupWSConnection } from 'y-websocket/bin/utils'

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Whiteboard sync server running\n')
})

const wss = new WebSocketServer({ noServer: true })

wss.on('connection', setupWSConnection)

httpServer.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request)
  })
})

httpServer.listen(1234, () => {
  console.log('Whiteboard sync server running on ws://localhost:1234')
})
