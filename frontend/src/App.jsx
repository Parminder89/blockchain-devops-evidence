import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import Artifact from "./abi/ChainOfCustody.json"; // ABI (Application Binary Interface) of the deployed smart contract

const RPC_URL = import.meta.env.VITE_RPC_URL;
const PRIVATE_KEY = import.meta.env.VITE_PRIVATE_KEY;
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

function shortAddr(a) {
  // Shortens a wallet or contract address for UI display
  if (!a) return "";
  return a.slice(0, 6) + "…" + a.slice(-4);
}

function getFriendlyMessage(err) {
  // Converts blockchain errors into user understandable messages
  if (!err) return "Unknown error";
  let msg = err.reason || err.message || String(err);

  // Clean up extra technical text
  msg = msg.split("\n")[0];
  msg = msg.split(" (")[0];
  msg = msg.replace(/0x[a-f0-9]+/gi, "").trim();
  return msg;
}

function formatTimestamp(ts) {
  // Converts Unix timestamp to readable date and time
  if (!ts) return "—";
  return new Date(Number(ts) * 1000).toLocaleString();
}

export default function App() {
  //Globle Status Left Panel
  const [status, setStatus] = useState("");
  const [walletAddr, setWalletAddr] = useState("");
  const [chainId, setChainId] = useState("");
  const [lastTx, setLastTx] = useState("");

  // Add New Evidence
  const [evidenceId, setEvidenceId] = useState("");
  const [description, setDescription] = useState("");

  // Transfer Evidence
  const [transferId, setTransferId] = useState(""); // separate state
  const [recipient, setRecipient] = useState("");

  // View Evidence Details
  const [lookupId, setLookupId] = useState("");
  const [details, setDetails] = useState(null);

  // View Evidence Log
  const [logId, setLogId] = useState("");
  const [logLines, setLogLines] = useState([]);

  // Create provider using Ganache RPC URL
  const provider = useMemo(
    () => (RPC_URL ? new ethers.JsonRpcProvider(RPC_URL) : null),
    []
  );

  // Create signer (wallet) using private key
  const signer = useMemo(
    () =>
      provider && PRIVATE_KEY ? new ethers.Wallet(PRIVATE_KEY, provider) : null,
    [provider]
  );

  // Create contract instance using ABI and signer
  const contract = useMemo(() => {
    if (!signer || !CONTRACT_ADDRESS) return null;
    return new ethers.Contract(CONTRACT_ADDRESS, Artifact.abi, signer);
  }, [signer]);

  useEffect(() => {
    (async () => {
      try {
        const net = await provider.getNetwork(); // Fetch network information
        setChainId(net.chainId.toString());
        setWalletAddr(await signer.getAddress()); // Fetch wallet address
        await provider.getBlockNumber();
        setStatus("Connected ✅ (Ganache)"); // Test connection
      } catch (e) {
        setStatus(getFriendlyMessage(e));
      }
    })();
  }, [provider, signer]);

  async function sendTx(txPromise) {
    setStatus("Pending transaction...");
    const tx = await txPromise; // Send transaction
    setLastTx(tx.hash);
    await tx.wait(); // Wait for confirmation
    return tx.hash;
  }

  // Add new evidence to blockchain
  async function addEvidence() {
    try {
      if (!evidenceId || !description)
        throw new Error("Fill Evidence ID + Description");
      await sendTx(contract.addEvidence(evidenceId, description));
      setStatus("Evidence added ✅");
    } catch (e) {
      setStatus(getFriendlyMessage(e));
    }
  }

  // Transfer custody of evidence to another address
  async function transferEvidence() {
    try {
      if (!transferId) throw new Error("Fill Evidence ID");
      if (!ethers.isAddress(recipient)) throw new Error("Invalid address");
      await sendTx(contract.transferEvidence(transferId, recipient));
      setStatus("Evidence transferred ✅");
    } catch (e) {
      setStatus(getFriendlyMessage(e));
    }
  }

  // View evidence details
  async function loadDetails() {
    try {
      const r = await contract.getEvidence(lookupId);
      setDetails({
        evidenceId: r[0],
        description: r[1],
        currentHolder: r[2],
        timestamp: r[3],
      });
      setStatus("Evidence loaded ✅");
    } catch (e) {
      setStatus(getFriendlyMessage(e));
      setDetails(null);
    }
  }

  // View evidence transfer log
  async function loadLog() {
    try {
      const lines = await contract.getEvidenceLog(logId);
      setLogLines(Array.from(lines));
      setStatus("Log loaded ✅");
    } catch (e) {
      setStatus(getFriendlyMessage(e));
      setLogLines([]);
    }
  }

  //Styling
  const glassPanel = {
    background: `
      linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.08)),
      linear-gradient(160deg, #3fc3b4, #2f8f83)
    `,
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    borderRadius: 16,
    padding: 26,
    color: "#fff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
  };

  const glassCard = {
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(10px)",
    borderRadius: 16,
    padding: 22,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    fontSize: 15.5,
  };

  const input = {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: 15,
  };

  const bigInput = {
    ...input,
    width: "97%",
    fontSize: 16,
    padding: 12,
  };

  const button = {
    padding: "10px 18px",
    borderRadius: 8,
    border: "none",
    background: "#2f8f83",
    color: "#fff",
    fontSize: 15,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        fontFamily: "system-ui",
        padding: 32,
        maxWidth: 1600,
        margin: "0 auto",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: 30 }}>
        Chain of Custody
      </h1>
      <h2 style={{ textAlign: "center", marginBottom: 30 }}>
        (Evidence Tracking/Management System)
      </h2>
      <div
        style={{ display: "grid", gridTemplateColumns: "520px 1fr", gap: 26 }}
      >
        {/* Right PANEL */}
        <div style={glassPanel}>
          <h3 style={{ fontSize: 22, marginBottom: 20 }}>Network Info</h3>
          <div style={{ fontSize: 18 }}>
            <b>RPC:</b> {RPC_URL}
          </div>
          <div style={{ fontSize: 18 }}>
            <b>Chain:</b> {chainId}
          </div>
          <div style={{ fontSize: 18 }}>
            <b>Wallet:</b> {shortAddr(walletAddr)}
          </div>
          <div style={{ fontSize: 18 }}>
            <b>Contract:</b> {shortAddr(CONTRACT_ADDRESS)}
          </div>
          <div style={{ marginTop: 14, fontWeight: 600, fontSize: 18 }}>
            {status}
          </div>
          {lastTx && (
            <div style={{ marginTop: 8, fontSize: 14 }}>LastTx: {lastTx}</div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div style={{ display: "grid", gap: 22 }}>
          {/* Add Evidence */}
          <div style={glassCard}>
            <h3>Add Evidence</h3>
            <input
              style={input}
              placeholder="Evidence ID"
              value={evidenceId}
              onChange={(e) => setEvidenceId(e.target.value)}
            />
            <input
              style={{ ...bigInput, marginTop: 8 }}
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button style={{ ...button, marginTop: 10 }} onClick={addEvidence}>
              Add
            </button>
          </div>

          {/* Transfer Evidence */}
          <div style={glassCard}>
            <h3>Transfer Custody</h3>
            <input
              style={input}
              placeholder="Evidence ID"
              value={transferId}
              onChange={(e) => setTransferId(e.target.value)}
            />
            <input
              style={{ ...bigInput, marginTop: 8 }}
              placeholder="Recipient Address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <button
              style={{ ...button, marginTop: 10 }}
              onClick={transferEvidence}
            >
              Transfer
            </button>
          </div>

          {/* Evidence Details */}
          <div style={glassCard}>
            <h3>Evidence Details</h3>
            <input
              style={input}
              placeholder="Evidence ID"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
            />
            <button style={{ ...button, marginTop: 10 }} onClick={loadDetails}>
              Load
            </button>
            {details && (
              <div style={{ marginTop: 12 }}>
                <div>
                  <b>ID:</b> {details.evidenceId}
                </div>
                <div>
                  <b>Description:</b> {details.description}
                </div>
                <div>
                  <b>Holder:</b> {details.currentHolder}
                </div>
                <div>
                  <b>Time:</b> {formatTimestamp(details.timestamp)}
                </div>
              </div>
            )}
          </div>

          {/* Evidence Log */}
          <div style={glassCard}>
            <h3>Evidence Log</h3>
            <input
              style={input}
              placeholder="Evidence ID"
              value={logId}
              onChange={(e) => setLogId(e.target.value)}
            />
            <button style={{ ...button, marginTop: 10 }} onClick={loadLog}>
              Load
            </button>
            {logLines.length > 0 && (
              <ul style={{ marginTop: 12 }}>
                {logLines.map((l, i) => (
                  <li key={i}>
                    {l.replace(
                      /at (\d+)$/,
                      (_, t) => `at ${formatTimestamp(t)}`
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
