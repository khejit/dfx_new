// import { dolanoo_backend } from "../../declarations/dolanoo_backend";

import {
  Cbor,
  Certificate,
  HashTree,
  HttpAgent,
  lookup_path,
  reconstruct,
  compare,
} from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { lebDecode } from "@dfinity/candid";
import { PipeArrayBuffer } from "@dfinity/candid/lib/cjs/utils/buffer";

function equal(buf1, buf2) {
  return compare(buf1, buf2) === 0;
}

async function validateBody(
  canisterId,
  path, // key? ======================================
  body,
  certificate,
  tree,
  agent
) {
  //await agent.fetchRootKey();
  //console.log("Root key= ");
  //console.log(agent.rootKey);

  let cert;
  try {
    cert = await Certificate.create({
      certificate,
      canisterId,
      rootKey: agent.rootKey,
    });
  } catch (error) {
    return false;
  }

  const hashTree = Cbor.decode(tree);
  const reconstructed = await reconstruct(hashTree);
  const witness = cert.lookup([
    "canister",
    canisterId.toUint8Array(),
    "certified_data",
  ]);

  if (!witness) {
    throw new Error(
      "Could not find certified data for this canister in the certificate."
    );
  }

  // First validate that the Tree is as good as the certification.
  if (!equal(witness, reconstructed)) {
    console.error("Witness != Tree passed in ic-certification");
    return false;
  }

  // Next, calculate the SHA of the content.
  const sha = await crypto.subtle.digest("SHA-256", body);
  let treeSha = lookup_path(["http_assets", path], hashTree);

  if (!treeSha) {
    // Allow fallback to `index.html`.
    treeSha = lookup_path(["http_assets", "/index.html"], hashTree);
  }

  if (!treeSha) {
    // The tree returned in the certification header is wrong. Return false.
    // We don't throw here, just invalidate the request.
    console.error(
      `Invalid Tree in the header. Does not contain path ${JSON.stringify(
        path
      )}`
    );
    return false;
  }

  return !!treeSha && equal(sha, treeSha);
}

let val, cert, tree;

class websocketConnection {
  constructor() {
    this.instance = new WebSocket("ws://localhost:8080");
    this.instance.binaryType = "arraybuffer";
    this.bindEvents();
  }

  sendMessage(message) {
    if (message !== "HEARTBEAT") {
      console.log("Sending to canister.");
    }
    this.instance.send(String(message));
  }

  bindEvents() {
    this.instance.onopen = this.onOpen.bind(this);
    this.instance.onmessage = this.onMessage.bind(this);
    this.instance.onclose = this.onClose.bind(this);
    this.instance.onerror = this.onError.bind(this);
  }

  onOpen(event) {
    console.log("[open] Connection opened");
    //console.log("Sending to server");
    //this.sendMessage("My name is Bob");
  }

  async onMessage(event) {
    var typeof1 = (obj) =>
      Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();

    console.log(`[message] Message from canister: ${event.data}`);

    const res = Cbor.decode(event.data);

    console.log("val type");
    console.log(typeof1(res.val));

    console.log("val cbor decoded:");
    console.log(Cbor.decode(res.val));

    console.log("val cbor decoded type");
    console.log(typeof1(Cbor.decode(res.val)));

    val = new Uint8Array(res.val);
    cert = res.cert;
    tree = res.tree;

    console.log(
      "val cbor decoded after uint8array================================"
    );
    console.log(Cbor.decode(val));
    console.log("val type");
    console.log(typeof1(Cbor.decode(val)));

    console.log("val= ");
    console.log(typeof1(val));
    console.log("cert= ");
    console.log(typeof1(cert));
    console.log("tree= ");
    console.log(typeof1(tree));

    let agent = new HttpAgent({ host: "https://ic0.app" }); //let agent = new HttpAgent({host:"http://localhost:63631"});
    let canisterId = Principal.fromText("pn46s-6aaaa-aaaan-qbf3a-cai");
    let key = "1";

    console.log("canisterId= ");
    console.log(canisterId);
    console.log("key= ");
    console.log(key);
    console.log("val= ");
    console.log(val);
    console.log("cert= ");
    console.log(cert);
    console.log("tree= ");
    console.log(tree);

    let valid = await validateBody(canisterId, key, val, cert, tree, agent);

    console.log("valid= ");
    console.log(valid);
  }

  onClose(event) {
    if (event.wasClean) {
      console.log(
        `[close] Connection closed, code=${event.code} reason=${event.reason}`
      );
    } else {
      // e.g. server process killed or network down
      // event.code is usually 1006 in this case
      console.log("[close] Connection died");
    }
  }

  onError(error) {
    console.log(`[error]`);
  }
}

let ws = new websocketConnection();

document.querySelector("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = e.target.querySelector("button");

  const name = document.getElementById("name").value.toString();

  button.setAttribute("disabled", true);

  // Interact with foo actor, calling the greet method
  ws.sendMessage(name);
  // const greeting = await dolanoo_backend.greet(name);

  button.removeAttribute("disabled");

  //document.getElementById("greeting").innerText = greeting;

  return false;
});

/*
let socket = new WebSocket("wss://javascript.info/article/websocket/demo/hello");

socket.onopen = function(e) {
  alert("[open] Connection established");
  alert("Sending to server");
  socket.send("My name is Bubs");
};

socket.onmessage = function(event) {
  alert(`[message] Data received from server: ${event.data}`);
};

socket.onclose = function(event) {
  if (event.wasClean) {
    alert(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
  } else {
    // e.g. server process killed or network down
    // event.code is usually 1006 in this case
    alert('[close] Connection died');
  }
};

socket.onerror = function(error) {
  alert(`[error]`);
};
*/
