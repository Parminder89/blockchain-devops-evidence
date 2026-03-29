import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import Artifact from "./abi/ChainOfCustody.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

function shortAddr(a) {
  if (!a) return "";
  return a.slice(0, 6) + "…" + a.slice(-4);
}

function getFriendlyMessage(err) {
  if (!err) return "Unknown error";
  let msg = err.reason || err.message || String(err);
  msg = msg.split("\n")[0];
  msg = msg.split(" (")[0];
  msg = msg.replace(/0x[a-f0-9]+/gi, "").trim();
  return msg;
}

function formatTimestamp(ts) {
  if (!ts) return "—";
  return new Date(Number(ts) * 1000).toLocaleString();
}

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const [status, setStatus] = useState("");
  const [walletAddr, setWalletAddr] = useState("");
  const [chainId, setChainId] = useState("");
  const [lastTx, setLastTx] = useState("");

  const [evidenceId, setEvidenceId] = useState("");
  const [description, setDescription] = useState("");
  const [escrowEnabled, setEscrowEnabled] = useState(false);
  const [escrowAmount, setEscrowAmount] = useState("");

  const [transferId, setTransferId] = useState("");
  const [recipient, setRecipient] = useState("");

  const [lookupId, setLookupId] = useState("");
  const [details, setDetails] = useState(null);

  // ✅ Connect MetaMask
  async function connectWallet() {
    try {
      if (!window.ethereum) {
        alert("Install MetaMask");
        return;
      }

      const prov = new ethers.BrowserProvider(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const sign = await prov.getSigner();

      setProvider(prov);
      setSigner(sign);
      setStatus("Connected via MetaMask ✅");
    } catch (e) {
      setStatus(getFriendlyMessage(e));
    }
  }

  // ✅ Contract instance
  const contract = useMemo(() => {
    if (!signer || !CONTRACT_ADDRESS) return null;
    return new ethers.Contract(CONTRACT_ADDRESS, Artifact.abi, signer);
  }, [signer]);

  useEffect(() => {
    if (!provider || !signer) return;

    (async () => {
      try {
        const net = await provider.getNetwork();
        setChainId(net.chainId.toString());
        setWalletAddr(await signer.getAddress());
      } catch (e) {
        setStatus(getFriendlyMessage(e));
      }
    })();
  }, [provider, signer]);

  async function sendTx(txPromise) {
    setStatus("Pending transaction...");
    const tx = await txPromise;
    setLastTx(tx.hash);
    await tx.wait();
    return tx.hash;
  }

  // ✅ Add Evidence (Escrow supported)
  async function addEvidence() {
    try {
      if (!contract) throw new Error("Connect wallet first");
      if (!evidenceId || !description)
        throw new Error("Fill all fields");

      let tx;

      if (escrowEnabled) {
        if (!escrowAmount) throw new Error("Enter escrow ETH");

        tx = await contract.addEvidence(
          evidenceId,
          "hash-" + evidenceId,
          description,
          true,
          {
            value: ethers.parseEther(escrowAmount),
          }
        );
      } else {
        tx = await contract.addEvidence(
          evidenceId,
          "hash-" + evidenceId,
          description,
          false
        );
      }

      setStatus("Waiting for confirmation...");
      setLastTx(tx.hash);

      await tx.wait();
      setStatus("Evidence added ✅");
    } catch (e) {
      console.error(e);
      setStatus(getFriendlyMessage(e));
    }
  }

  // ✅ Transfer Evidence
  async function transferEvidence() {
    try {
      if (!contract) throw new Error("Connect wallet first");
      if (!transferId) throw new Error("Enter Evidence ID");
      if (!ethers.isAddress(recipient)) throw new Error("Invalid address");

      await sendTx(contract.transferEvidence(transferId, recipient));

      setStatus("Transferred ✅");
    } catch (e) {
      setStatus(getFriendlyMessage(e));
    }
  }

  // ✅ Load Evidence
  async function loadDetails() {
    try {
      if (!contract) throw new Error("Connect wallet first");

      const r = await contract.getEvidence(lookupId);

      setDetails({
        evidenceId: r[0],
        description: r[1],
        currentHolder: r[2],
        timestamp: r[3],
        escrowEnabled: r[4],
        escrowAmount: r[5],
      });

      setStatus("Loaded ✅");
    } catch (e) {
      setStatus(getFriendlyMessage(e));
      setDetails(null);
    }
  }

  return (
    <div style={{ padding: 30 }}>
      <h1>Chain of Custody</h1>
      <h6>(MetaMask + Escrow)</h6>

      <button onClick={connectWallet}>Connect MetaMask</button>

      <p>Status: {status}</p>
      <p>Wallet: {shortAddr(walletAddr)}</p>
      <p>Chain: {chainId}</p>
      {lastTx && <p>Last Tx: {lastTx}</p>}

      <hr />

      <h3>Add Evidence</h3>
      <input placeholder="Evidence ID" onChange={(e) => setEvidenceId(e.target.value)} />
      <input placeholder="Description" onChange={(e) => setDescription(e.target.value)} />

      <label>
        Escrow:
        <input type="checkbox" onChange={(e) => setEscrowEnabled(e.target.checked)} />
      </label>

      {escrowEnabled && (
        <input
          placeholder="ETH amount (e.g. 0.01)"
          onChange={(e) => setEscrowAmount(e.target.value)}
        />
      )}

      <button onClick={addEvidence}>Add</button>

      <hr />

      <h3>Transfer</h3>
      <input placeholder="Evidence ID" onChange={(e) => setTransferId(e.target.value)} />
      <input placeholder="Recipient Address" onChange={(e) => setRecipient(e.target.value)} />
      <button onClick={transferEvidence}>Transfer</button>

      <hr />

      <h3>View Evidence</h3>
      <input placeholder="Evidence ID" onChange={(e) => setLookupId(e.target.value)} />
      <button onClick={loadDetails}>Load</button>

      {details && (
        <div>
          <p><b>ID:</b> {details.evidenceId}</p>
          <p><b>Description:</b> {details.description}</p>
          <p><b>Holder:</b> {details.currentHolder}</p>
          <p><b>Time:</b> {formatTimestamp(details.timestamp)}</p>
          <p><b>Escrow Enabled:</b> {details.escrowEnabled ? "Yes" : "No"}</p>
          <p>
            <b>Escrow Amount:</b>{" "}
            {details.escrowEnabled
              ? ethers.formatEther(details.escrowAmount) + " ETH"
              : "0"}
          </p>
        </div>
      )}
    </div>
  );
}