const output = document.querySelector("#output");
const warnings = document.querySelector("#warnings");
const statusNode = document.querySelector("#status");
const metricSpent = document.querySelector("#metricSpent");
const metricRemaining = document.querySelector("#metricRemaining");
const metricUsed = document.querySelector("#metricUsed");
const metricWarnings = document.querySelector("#metricWarnings");
const connectWalletButton = document.querySelector("#connectWalletButton");
let lastStatus = null;
let connectedAddress = null;
let connectedChainId = null;

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function shortAddress(address) {
  if (!address || address.length < 12) {
    return address || "-";
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function chainIdHex(chainId) {
  return `0x${Number(chainId).toString(16)}`;
}

function getWalletProvider() {
  return typeof window !== "undefined" ? window.ethereum : null;
}

function walletChainMatches() {
  if (!lastStatus?.chainId || !connectedChainId) {
    return true;
  }
  return Number(connectedChainId) === Number(lastStatus.chainId);
}

function renderStatus() {
  if (!lastStatus) {
    return;
  }

  const live = lastStatus.hasPrivateKey && lastStatus.hasContract;
  const contract = lastStatus.hasContract
    ? `${lastStatus.contract.slice(0, 6)}...${lastStatus.contract.slice(-4)}`
    : "Not set";
  const walletText = connectedAddress
    ? `${shortAddress(connectedAddress)}${walletChainMatches() ? "" : " (switch to Pharos)"}`
    : "Not connected (optional)";

  statusNode.replaceChildren(
    ...[
      `Network: ${lastStatus.pharosChainName || lastStatus.pharosNetwork} (${lastStatus.chainId || "unknown"})`,
      `Mode: ${live ? "Live Pharos mode" : "Demo mode"}`,
      `Signer: ${live ? "Server wallet, private key stays server-side" : "Simulation"}`,
      `Connected wallet: ${walletText}`,
      `Contract: ${contract}`
    ].map((line) => {
      const item = document.createElement("div");
      item.textContent = line;
      return item;
    })
  );
}

function updateWalletButton() {
  if (!connectWalletButton) {
    return;
  }

  connectWalletButton.classList.toggle("is-connected", Boolean(connectedAddress));
  connectWalletButton.textContent = connectedAddress ? shortAddress(connectedAddress) : "Connect Wallet";
}

async function switchToPharosNetwork() {
  const provider = getWalletProvider();
  if (!provider || !lastStatus?.chainId) {
    return;
  }

  const desiredChainId = chainIdHex(lastStatus.chainId);

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: desiredChainId }]
    });
  } catch (error) {
    if (Number(error?.code) !== 4902) {
      throw error;
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: desiredChainId,
          chainName: lastStatus.pharosChainName || "Pharos Network",
          nativeCurrency: {
            name: lastStatus.currency || "PROS",
            symbol: lastStatus.currency || "PROS",
            decimals: 18
          },
          rpcUrls: [lastStatus.rpcUrl],
          blockExplorerUrls: [lastStatus.explorerUrl]
        }
      ]
    });
  }

  connectedChainId = Number.parseInt(desiredChainId, 16);
}

async function connectWallet() {
  const provider = getWalletProvider();

  if (!provider) {
    show({
      success: false,
      error: "No EVM wallet was found. Open this page in a browser with Rabby or MetaMask installed."
    });
    return;
  }

  connectWalletButton.disabled = true;
  connectWalletButton.textContent = "Connecting...";

  try {
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    connectedAddress = accounts?.[0] || null;
    await switchToPharosNetwork();
    const walletChain = await provider.request({ method: "eth_chainId" });
    connectedChainId = Number.parseInt(walletChain, 16);
    renderStatus();
    show({
      success: true,
      action: "CONNECT_WALLET_CONTEXT",
      address: connectedAddress,
      network: lastStatus?.pharosChainName || lastStatus?.pharosNetwork || "Pharos",
      chainId: lastStatus?.chainId,
      message: "Wallet connected for address context. Live ledger writes still use the server signer."
    });
  } catch (error) {
    show({
      success: false,
      error: error?.message || "Wallet connection failed."
    });
  } finally {
    connectWalletButton.disabled = false;
    updateWalletButton();
    renderStatus();
  }
}

function show(payload) {
  output.textContent = JSON.stringify(payload, null, 2);
  const warningItems = payload.warnings || payload.audit?.warnings || payload.guardian?.warnings || [];
  const summary = payload.summary || payload.tracker?.summary;

  if (summary) {
    metricSpent.textContent = summary.totalSpent?.formatted || "-";
    metricRemaining.textContent = summary.remaining?.formatted || "-";
    metricUsed.textContent = summary.budgetUsed || "-";
  }
  metricWarnings.textContent = String(warningItems.length);

  warnings.replaceChildren(
    ...warningItems.map((warning) => {
      const item = document.createElement("li");
      item.textContent = `${warning.level} ${warning.code}: ${warning.message}`;
      return item;
    })
  );
}

async function loadStatus() {
  const response = await fetch("/api/status");
  lastStatus = await response.json();
  renderStatus();
}

async function run(command, options = {}) {
  const response = await fetch("/api/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ command, options })
  });
  const payload = await response.json();
  show(payload);
  return payload;
}

document.querySelector("#initForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await run("init", formData(event.currentTarget));
});

document.querySelector("#expenseForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await run("add", formData(event.currentTarget));
});

document.querySelector("#ledgerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = await run("ledger", {
    subcommand: "log",
    ...formData(event.currentTarget)
  });
  if (payload.expenseHash) {
    document.querySelector("#verifyForm input[name='hash']").value = payload.expenseHash;
  }
});

document.querySelector("#verifyForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const options = formData(event.currentTarget);
  await run("ledger", { subcommand: "verify", hash: options.hash });
});

document.querySelector("#summaryButton").addEventListener("click", () => run("summary"));
connectWalletButton.addEventListener("click", connectWallet);

document.querySelector("#historyButton").addEventListener("click", async () => {
  const address = connectedAddress || prompt("Wallet address");
  if (address) {
    await run("ledger", { subcommand: "history", address });
  }
});

const provider = getWalletProvider();
if (provider) {
  provider.request({ method: "eth_accounts" }).then((accounts) => {
    connectedAddress = accounts?.[0] || null;
    updateWalletButton();
    renderStatus();
  }).catch(() => {});

  provider.request({ method: "eth_chainId" }).then((chainId) => {
    connectedChainId = Number.parseInt(chainId, 16);
    renderStatus();
  }).catch(() => {});

  provider.on?.("accountsChanged", (accounts) => {
    connectedAddress = accounts?.[0] || null;
    updateWalletButton();
    renderStatus();
  });

  provider.on?.("chainChanged", (chainId) => {
    connectedChainId = Number.parseInt(chainId, 16);
    renderStatus();
  });
}

updateWalletButton();
loadStatus().then(() => run("summary")).catch((error) => show({ success: false, error: error.message }));
