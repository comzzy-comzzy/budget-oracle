const output = document.querySelector("#output");
const warnings = document.querySelector("#warnings");
const statusNode = document.querySelector("#status");
const metricSpent = document.querySelector("#metricSpent");
const metricRemaining = document.querySelector("#metricRemaining");
const metricUsed = document.querySelector("#metricUsed");
const metricWarnings = document.querySelector("#metricWarnings");
let lastStatus = null;

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
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
  const mode = lastStatus.hasPrivateKey && lastStatus.hasContract ? "Live Pharos mode" : "Demo mode";
  const contract = lastStatus.hasContract
    ? `${lastStatus.contract.slice(0, 6)}...${lastStatus.contract.slice(-4)}`
    : "Add server env vars for live logging";
  statusNode.innerHTML = [
    `Network: ${lastStatus.pharosNetwork}`,
    `Mode: ${mode}`,
    `Contract: ${contract}`
  ].join("<br>");
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

document.querySelector("#historyButton").addEventListener("click", async () => {
  const address = prompt("Wallet address");
  if (address) {
    await run("ledger", { subcommand: "history", address });
  }
});

loadStatus().then(() => run("summary")).catch((error) => show({ success: false, error: error.message }));
