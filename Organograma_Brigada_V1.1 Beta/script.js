// =========================
// VERSÃO 1.1 - Correções de clique, seleção e exclusão
// =========================

const treeArea = document.getElementById("tree");
const orgContainer = document.getElementById("org-container");
const COR_PADRAO = "#e3f2fd";

let connectorType = "Flowchart";
let endpointType = "Dot";
let endpointSize = 5;
let nodeShape = "rect";

let instance = jsPlumb.getInstance({
  Connector: [connectorType, { cornerRadius: 5 }],
  Endpoint: [endpointType, { radius: endpointSize }],
  PaintStyle: { stroke: "#456", strokeWidth: 2 },
  EndpointStyle: { fill: "black", outlineStroke: "#222", outlineWidth: 1 }
});

let selectedNode = null;
let selectedNodes = new Set();
let selectedConnection = null;
let isAddingChild = false;
let panX = 0, panY = 0, scale = 1;
let isPanning = false, startX = 0, startY = 0;

// =========================
// Drag da barra apenas no handle
// =========================
const dragHandle = document.getElementById("drag-handle");
let dragging = false, offsetX, offsetY;
dragHandle.addEventListener("mousedown", e => { dragging = true; offsetX = e.offsetX; offsetY = e.offsetY; });
document.addEventListener("mouseup", () => dragging = false);
document.addEventListener("mousemove", e => {
  if (dragging) {
    const barra = document.getElementById("zoom-panel");
    barra.style.top = (e.clientY - offsetY) + "px";
    barra.style.left = (e.clientX - offsetX) + "px";
    barra.style.position = "fixed";
  }
});

// =========================
// Aplicar alterações globais ou no nó selecionado
// =========================
function aplicarAlteracoesGlobais() {
  connectorType = document.getElementById("connectorType").value;
  endpointType = document.getElementById("endpointType").value;
  endpointSize = parseInt(document.getElementById("endpointSize").value);
  nodeShape = document.getElementById("nodeShape").value;

  // Aplicar ao nó selecionado ou a todos
  if (selectedNode) {
    selectedNode.className = `node ${nodeShape} selecionado`;
  } else {
    document.querySelectorAll(".node").forEach(n => n.className = `node ${nodeShape}`);
  }

  instance.importDefaults({
    Connector: [connectorType, { cornerRadius: 5 }],
    Endpoint: [endpointType, { radius: endpointSize }],
    PaintStyle: { stroke: "#456", strokeWidth: 2 },
    EndpointStyle: { fill: "black", outlineStroke: "#222", outlineWidth: 1 }
  });

  document.querySelectorAll(".node").forEach(n => {
    instance.makeSource(n, { anchor: "Continuous" });
    instance.makeTarget(n, { anchor: "Continuous" });
  });

  instance.repaintEverything();
}

// =========================
// Adicionar hierarquia
function adicionarHierarquia() {
  let container = document.getElementById("hierarquia-container");
  let input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Título da hierarquia";
  input.className = "hierarquia";
  container.appendChild(input);
  container.appendChild(document.createElement("br"));
}

// =========================
// Gerar campos pavimentos
function gerarPavimentos() {
  const container = document.getElementById("pavimentos");
  container.innerHTML = "";
  const num = document.getElementById("numPavimentos").value;
  const turnos = document.getElementById("turnos").value.split(",");
  for (let i = 1; i <= num; i++) {
    let div = document.createElement("div");
    div.className = "pavimento";
    div.innerHTML = `<h4>Pavimento ${i}</h4>`;
    turnos.forEach(t => {
      div.innerHTML += `
        <div class="turno-input">
          <label>${t.trim()} - Nº Brigadistas:</label><br>
          <input type="number" id="pav${i}_${t.trim()}" value="3" min="1"><br>
        </div>`;
    });
    container.appendChild(div);
  }
}

// =========================
// Criar nó
function criarNode(id, texto, x, y) {
  let div = document.createElement("div");
  div.className = `node ${nodeShape}`;
  div.id = id;
  div.style.left = x + "px";
  div.style.top = y + "px";
  div.style.backgroundColor = COR_PADRAO;
  div.innerHTML = `<span class="remove-btn" onclick="removerNode('${id}')">x</span> ${texto}`;

  // Selecionar nó
  div.addEventListener("click", (e) => {
    e.stopPropagation();
    selecionarNode(id, e);
  });

  // Adicionar filho com dois cliques (modo ativo)
  div.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    if (isAddingChild) criarFilhoNo(id);
  });

  treeArea.appendChild(div);
  instance.draggable(div);
  instance.makeTarget(div, { anchor: "Continuous" });
  instance.makeSource(div, { anchor: "Continuous" });
  return id;
}

// =========================
// Selecionar nó
function selecionarNode(id, e) {
  if (e.shiftKey || e.ctrlKey) {
    if (selectedNodes.has(id)) {
      selectedNodes.delete(id);
      document.getElementById(id).classList.remove("selecionado");
    } else {
      selectedNodes.add(id);
      document.getElementById(id).classList.add("selecionado");
    }
  } else {
    if (selectedNodes.has(id)) {
      document.getElementById(id).classList.remove("selecionado");
      selectedNodes.delete(id);
      selectedNode = null;
    } else {
      document.querySelectorAll(".node").forEach(n => n.classList.remove("selecionado"));
      selectedNodes.clear();
      selectedNodes.add(id);
      document.getElementById(id).classList.add("selecionado");
      selectedNode = document.getElementById(id);
    }
  }

  if (selectedNode) {
    document.getElementById("nodeTitle").value = selectedNode.innerText.replace("x", "");
    document.getElementById("nodeColor").value = rgbToHex(window.getComputedStyle(selectedNode).backgroundColor);
    document.getElementById("coordX").value = parseInt(selectedNode.style.left);
    document.getElementById("coordY").value = parseInt(selectedNode.style.top);
  }
}

// =========================
// Selecionar ligação
instance.bind("click", (conn, e) => {
  if (selectedConnection) selectedConnection.removeClass("selected");
  selectedConnection = conn;
  conn.addClass("selected");
  document.getElementById("editConnectorType").value = conn.getConnector()[0];
});

// =========================
// Edição da ligação
function aplicarAlteracoesLigacao() {
  if (!selectedConnection) return;
  const cType = document.getElementById("editConnectorType").value;
  const eType = document.getElementById("editEndpointType").value;
  const eSize = parseInt(document.getElementById("editEndpointSize").value);

  selectedConnection.setConnector([cType, { cornerRadius: 5 }]);
  selectedConnection.endpoints.forEach(ep => {
    ep.setEndpoint(eType);
    ep.setPaintStyle({ fill: "black", radius: eSize });
  });
  instance.repaintEverything();
}

// =========================
// Deletar nó selecionado
function deletarNoSelecionado() {
  selectedNodes.forEach(id => {
    instance.removeAllEndpoints(id);
    const elem = document.getElementById(id);
    if (elem) elem.remove();
  });
  selectedNodes.clear();
  selectedNode = null;
}

// =========================
// Deletar ligação selecionada
function deletarLigacaoSelecionada() {
  if (selectedConnection) {
    instance.deleteConnection(selectedConnection);
    selectedConnection = null;
  }
}

// =========================
// Desselecionar tudo
function desselecionarTudo() {
  selectedNodes.forEach(id => document.getElementById(id).classList.remove("selecionado"));
  selectedNodes.clear();
  selectedNode = null;
  if (selectedConnection) selectedConnection.removeClass("selected");
  selectedConnection = null;
}

// =========================
// Modo adicionar filho
function modoAdicionarFilho() {
  isAddingChild = true;
  orgContainer.style.cursor = "crosshair";
}

function criarFilhoNo(parentId) {
  isAddingChild = false;
  orgContainer.style.cursor = "grab";
  let id = "child_" + Date.now();
  let novo = criarNode(id, "Novo Nó", parseInt(document.getElementById(parentId).style.left) + 150, parseInt(document.getElementById(parentId).style.top) + 150);
  instance.connect({ source: parentId, target: id });
}

// =========================
// Aplicar alterações no nó
function aplicarAlteracoes() {
  if (!selectedNode) return;
  selectedNode.innerHTML = `<span class="remove-btn" onclick="removerNode('${selectedNode.id}')">x</span> ${document.getElementById("nodeTitle").value}`;
  selectedNode.style.backgroundColor = document.getElementById("nodeColor").value || COR_PADRAO;
  selectedNode.style.left = document.getElementById("coordX").value + "px";
  selectedNode.style.top = document.getElementById("coordY").value + "px";
  instance.repaintEverything();
}

// =========================
// Gerar organograma
function gerarOrganograma() {
  treeArea.innerHTML = "";
  instance.reset();

  let modo = document.querySelector('input[name="modoHierarquia"]:checked').value;
  let nodes = [];

  if (modo == "completa") {
    let resp = document.getElementById("responsavel").value || "Responsável";
    let respId = criarNode("resp", resp, 600, 50);
    let yPos = 150;
    let prev = respId;
    document.querySelectorAll(".hierarquia").forEach((h, i) => {
      let id = "h" + i;
      let node = criarNode(id, h.value || "Cargo", 600, yPos);
      instance.connect({ source: prev, target: id });
      prev = id;
      yPos += 100;
    });
    nodes.push(prev);
  } else {
    nodes.push(null);
  }

  let pavX = 100;
  let num = document.getElementById("numPavimentos").value;
  let turnos = document.getElementById("turnos").value.split(",");
  let parentNode = (nodes.length > 0 && nodes[0] != null) ? nodes[0] : null;

  for (let i = 1; i <= num; i++) {
    let pavId = criarNode(`pav${i}`, `Pavimento ${i}`, pavX, 300);
    if (parentNode) instance.connect({ source: parentNode, target: pavId });
    let turnoY = 450;
    turnos.forEach(t => {
      let qtd = document.getElementById(`pav${i}_${t.trim()}`).value;
      let turnoId = criarNode(`turno${i}_${t}`, `${t}`, pavX, turnoY);
      instance.connect({ source: pavId, target: turnoId });
      let brigX = pavX;
      let brigSpacing = 180;
      for (let b = 1; b <= qtd; b++) {
        let brigId = criarNode(`brig${i}_${t}_${b}`, `Brigadista ${b}`, brigX, turnoY + 150);
        instance.connect({ source: turnoId, target: brigId });
        brigX += brigSpacing;
      }
      turnoY += 200;
    });
    pavX += 300;
  }
}

// =========================
// Limpar organograma
function limparOrganograma() {
  treeArea.innerHTML = "";
  instance.deleteEveryConnection();
  instance.deleteEveryEndpoint();
}

// =========================
// Organizar organograma
function organizarOrganograma() {
  let offsetX = 100, offsetY = 100;
  document.querySelectorAll(".node").forEach((n, i) => {
    n.style.left = (offsetX + (i * 200)) + "px";
    n.style.top = (offsetY + (i * 50)) + "px";
  });
  instance.repaintEverything();
}

// =========================
// Centralizar projeto
function centralizarProjeto() {
  let allNodes = document.querySelectorAll(".node");
  if (allNodes.length === 0) return;
  let minX = Math.min(...[...allNodes].map(n => parseInt(n.style.left) || 0));
  let maxX = Math.max(...[...allNodes].map(n => parseInt(n.style.left) || 0));
  let largura = maxX - minX;
  panX = (orgContainer.clientWidth - largura) / 2;
  treeArea.style.transform = `translate(${panX}px,${panY}px) scale(${scale})`;
}

// =========================
// Remover nó
function removerNode(id) {
  if (instance) instance.removeAllEndpoints(id);
  const elem = document.getElementById(id);
  if (elem) elem.remove();
  if (selectedNodes.has(id)) selectedNodes.delete(id);
}

// =========================
// Conversão RGB -> HEX
function rgbToHex(rgb) {
  const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgb);
  return result ? "#" +
    ("0" + parseInt(result[1], 10).toString(16)).slice(-2) +
    ("0" + parseInt(result[2], 10).toString(16)).slice(-2) +
    ("0" + parseInt(result[3], 10).toString(16)).slice(-2) : rgb;
}

// =========================
// Zoom e Pan
function zoomIn() { scale += 0.1; atualizarZoom(); }
function zoomOut() { scale -= 0.1; if (scale < 0.2) scale = 0.2; atualizarZoom(); }
function resetZoom() { scale = 1; panX = 0; panY = 0; atualizarZoom(); }
function atualizarZoom() {
  treeArea.style.transform = `translate(${panX}px,${panY}px) scale(${scale})`;
}

orgContainer.addEventListener("mousedown", e => {
  if (e.target.id === "tree" || e.target.id === "org-container") {
    isPanning = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    orgContainer.style.cursor = "grabbing";
  }
});
orgContainer.addEventListener("mouseup", () => { isPanning = false; orgContainer.style.cursor = "grab"; });
orgContainer.addEventListener("mouseleave", () => { isPanning = false; });
orgContainer.addEventListener("mousemove", e => {
  if (!isPanning) return;
  panX = e.clientX - startX;
  panY = e.clientY - startY;
  atualizarZoom();
});
