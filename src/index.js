import { find } from "port-authority"
import WebSocket, { WebSocketServer } from "ws";

export default function livereload(options = { watch: '' }) {
  if(typeof options === "string") {
    options = {
      watch: options,
    }
  } else {
    options.watch = options.watch || ''
  }

  let server;

  const portPromise = find(options.port || 35729);

  portPromise.then(port => {
    server = new WebSocketServer({
      port,
    })

    const customPort = port !== 35729 ? ' on port ' + port : ''
    console.log(green('LiveReload enabled' + customPort))
  })

  return {
    name: "extension-livereload",
    async banner() {
      const port = await portPromise

      return `
        (function() {
          console.log("Establishing connection on port ${port}");
          const socket = new WebSocket("ws://localhost:${port}");

          let reloading = false

          socket.addEventListener('message', (event) => {
            if(reloading) {
              return;
            }

            reloading = true;

            console.log("Message from server", event.data);
            chrome.runtime.sendMessage("reload", () => {
              location.reload();
              socket.close();
            });
          })
        })();
      `;
    },
    async generateBundle() {
      server.clients.forEach(client => {
        if(client.readyState === WebSocket.OPEN) {
          client.send("reload");
        }
      })
    },
  }
}

function green(text) {
  return '\u001b[1m\u001b[32m' + text + '\u001b[39m\u001b[22m'
}
