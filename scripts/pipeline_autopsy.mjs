// scripts/pipeline_autopsy.mjs
// Phase 0: Pipeline Autopsy - Pinpoint where recovery pipeline halts

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const audioDir = path.join(rootDir, "audio");

const API_BASE = process.env.API_BASE || "http://localhost:8010";

// Contract event sequence
const CONTRACT_STEPS = [
  { event: "DETECTED", label: "DETECTED" },
  { event: "AI_DIAGNOSIS", label: "AI_DIAGNOSIS" },
  { event: "DISCOUNT_APPROVED", label: "DISCOUNT_APPROVED", optional: true },
  { event: "VOICE_SCRIPT_GENERATED", label: "VOICE_SCRIPT_GENERATED", optional: true },
  { event: "VOICE_GENERATED", label: "VOICE_GENERATED" },
  { event: "API_EXECUTED", label: "API_EXECUTED" },
  { event: "MESSAGE_SENT", label: "MESSAGE_SENT" },
  { event: "RECOVERED", label: "RECOVERED" },
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("=================================================");
  console.log("🔍 PHASE 0: PIPELINE AUTOPSY STARTING");
  console.log(`📡 Target API: ${API_BASE}`);
  console.log("=================================================");

  const startTime = Date.now();

  // 1. Simulate Kirana QR failure (₹3,000)
  console.log("\n[1/4] Triggering simulate-failure (qr_fail, ₹3,000)...");
  let paymentId = "";
  let correlationId = "";

  try {
    const res = await fetch(`${API_BASE}/simulate-failure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error_code: "qr_fail",
        error_description: "QR scan timed out at merchant checkout",
        amount: 300000, // 3000 INR in paise
        user_contact: "9876543210",
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    paymentId = data.payment_id;
    correlationId = data.correlation_id || "";
    console.log(`✅ Simulation initiated! Payment ID: ${paymentId} | Correlation ID: ${correlationId}`);
  } catch (err) {
    console.error(`❌ Failed to trigger simulate-failure: ${err.message}`);
    process.exit(1);
  }

  // 2. Poll audit logs for 90s
  console.log("\n[2/4] Polling /api/audit-logs every 2s (up to 90s)...");
  const seenEvents = new Map(); // event_type -> { timestamp, payload, elapsed }
  const pollStart = Date.now();
  const maxPollMs = 90000;

  while (Date.now() - pollStart < maxPollMs) {
    try {
      const res = await fetch(`${API_BASE}/api/audit-logs?limit=50`);
      if (res.ok) {
        const logs = await res.json();
        for (const log of logs) {
          if (log.payment_id === paymentId || (correlationId && log.correlation_id === correlationId)) {
            if (!seenEvents.has(log.event_type)) {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
              seenEvents.set(log.event_type, {
                timestamp: log.timestamp,
                severity: log.severity,
                reasoning: log.ai_reasoning,
                hash: log.hash_chain_link,
                elapsed: `${elapsed}s`,
              });
              console.log(`   + [${elapsed}s] Event Logged: ${log.event_type} (${log.severity}) - ${log.ai_reasoning || ""}`);
            }
          }
        }
      }
    } catch (err) {
      console.warn(`   ⚠️ Poll warning: ${err.message}`);
    }

    // Check if terminal event reached or MESSAGE_SENT reached
    if (seenEvents.has("RECOVERED") || seenEvents.has("ESCALATED") || seenEvents.has("MESSAGE_SENT")) {
      // Give 3 more seconds for any trailing logs
      await sleep(3000);
      break;
    }

    await sleep(2000);
  }

  // 3. Poll payment status
  console.log("\n[3/4] Checking payment status...");
  let finalStatus = "UNKNOWN";
  try {
    const res = await fetch(`${API_BASE}/api/payment/${paymentId}/status`);
    if (res.ok) {
      const statusData = await res.json();
      finalStatus = statusData.status || statusData.state || JSON.stringify(statusData);
      console.log(`   Final Status: ${finalStatus}`);
    } else {
      console.log(`   Status endpoint returned HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn(`   Status check failed: ${err.message}`);
  }

  // 4. Check for real MP3 on disk
  console.log("\n[4/4] Checking ./audio/ for generated MP3 artifacts...");
  let audioFound = false;
  let matchingAudioFile = "";

  if (fs.existsSync(audioDir)) {
    const files = fs.readdirSync(audioDir);
    for (const f of files) {
      if (f.endsWith(".mp3") && (f.includes(paymentId) || f.includes(paymentId.replace("pay_", "")))) {
        audioFound = true;
        matchingAudioFile = f;
        break;
      }
    }
  }
  console.log(audioFound ? `   ✅ Audio MP3 Found: ${matchingAudioFile}` : `   ⚠️ No dedicated MP3 with paymentId in name (checking general cached mp3s...)`);

  // 5. Build and print the Autopsy Map
  console.log("\n=================================================");
  console.log("🗺️ PIPELINE AUTOPSY MAP");
  console.log("=================================================");

  const mapParts = [];
  let deadPoint = "";

  for (const step of CONTRACT_STEPS) {
    if (seenEvents.has(step.event)) {
      const info = seenEvents.get(step.event);
      mapParts.push(`${step.label} ✅ (${info.elapsed})`);
    } else {
      if (step.optional) {
        mapParts.push(`${step.label} ⏭️ (Skipped/Optional)`);
      } else {
        mapParts.push(`${step.label} ❌ (DEAD HERE)`);
        if (!deadPoint) {
          deadPoint = step.label;
        }
      }
    }
  }

  console.log(mapParts.join(" → "));
  console.log("-------------------------------------------------");
  console.log(`Payment ID:      ${paymentId}`);
  console.log(`Final Status:    ${finalStatus}`);
  console.log(`Audio On Disk:   ${audioFound ? matchingAudioFile : "NONE"}`);
  console.log(`Events Seen:     ${Array.from(seenEvents.keys()).join(", ") || "None"}`);
  console.log(`Break Point:     ${deadPoint || "NONE (Reached Terminal or Sent)"}`);
  console.log("=================================================\n");
}

main().catch((err) => {
  console.error("Autopsy crashed:", err);
  process.exit(1);
});
