const output = document.querySelector("#output");
const warnings = document.querySelector("#warnings");
const statusNode = document.querySelector("#status");
let lastStatus = null;

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function show(payload) {
  output.textContent = JSON.stringify(payload, null, 2);
  const warningItems = payload.warnings || payload.audit?.warnings || payload.guardian?.warnings || [];
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
  statusNode.innerHTML = [
    `Network: ${lastStatus.pharosNetwork}`,
    `Wallet: ${lastStatus.hasPrivateKey ? "configured" : "simulation"}`,
    `Contract: ${lastStatus.hasContract ? lastStatus.contract : "not set"}`
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
