"use strict";

const elements = {
  cleanup: document.querySelector("#cleanup"),
  inspectionSummary: document.querySelector("#inspection-summary"),
  mode: document.querySelector("#memory-get-mode"),
  notice: document.querySelector("#notice"),
  policyForm: document.querySelector("#policy-form"),
  projectRoot: document.querySelector("#project-root"),
  result: document.querySelector("#result"),
  rotate: document.querySelector("#rotate"),
  runtimePath: document.querySelector("#runtime-path"),
  savePolicy: document.querySelector("#save-policy")
};

function policyMode(payload) {
  return payload.memory_get_mode || (payload.policy && payload.policy.memory_get_mode);
}

function inspectionText(inspection) {
  if (!inspection || typeof inspection !== "object") return "";
  return inspection.summary || inspection.message || inspection.status || "已读取项目框架状态。";
}

function setNotice(message, kind) {
  elements.notice.textContent = message;
  elements.notice.dataset.kind = kind || "";
}

function showResult(payload) {
  elements.result.textContent = JSON.stringify(payload, null, 2);
  elements.result.hidden = false;
}

function setBusy(button, busy, label) {
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = label;
  } else {
    button.textContent = button.dataset.label || button.textContent;
  }
  button.disabled = busy;
}

async function request(url, options) {
  const response = await fetch(url, options);
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("服务返回了无效响应。");
  }
  if (!response.ok) {
    throw new Error(payload.error || `请求失败 (${response.status})。`);
  }
  return payload;
}

async function loadSettings() {
  setNotice("正在读取项目设置。", "pending");
  try {
    const [status, policy] = await Promise.all([request("/api/status"), request("/api/policy")]);
    elements.projectRoot.textContent = status.projectRoot || "未返回";
    elements.runtimePath.textContent = status.runtimePath || "未返回";
    elements.inspectionSummary.textContent = inspectionText(status.inspection);
    const mode = policyMode(policy);
    if (!mode) throw new Error("策略响应中缺少 memory_get_mode。");
    elements.mode.value = mode;
    elements.mode.disabled = false;
    elements.savePolicy.disabled = false;
    setNotice("设置已加载。", "success");
  } catch (error) {
    setNotice(error.message, "error");
  }
}

elements.policyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(elements.savePolicy, true, "保存中");
  setNotice("正在保存读取策略。", "pending");
  try {
    const payload = await request("/api/policy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memory_get_mode: elements.mode.value })
    });
    elements.mode.value = policyMode(payload) || elements.mode.value;
    showResult(payload);
    setNotice("读取策略已保存。", "success");
  } catch (error) {
    setNotice(error.message, "error");
  } finally {
    setBusy(elements.savePolicy, false);
  }
});

async function runArchiveAction(button, endpoint, label) {
  setBusy(button, true, "处理中");
  setNotice(`正在${label}。`, "pending");
  try {
    const payload = await request(endpoint, { method: "POST" });
    showResult(payload);
    setNotice(`${label}完成。`, "success");
  } catch (error) {
    setNotice(error.message, "error");
  } finally {
    setBusy(button, false);
  }
}

elements.rotate.addEventListener("click", () => runArchiveAction(elements.rotate, "/api/rotate", "轮转临时证据"));
elements.cleanup.addEventListener("click", () => {
  if (window.confirm("确认清理符合保留规则的过期归档？")) {
    runArchiveAction(elements.cleanup, "/api/cleanup", "清理过期归档");
  }
});

loadSettings();
