/**
 * Minimum Spanning Tree (MST) Interactive Visualizer & Practice Arena
 * Focuses exclusively on Prim's and Kruskal's Algorithms.
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════
     1. THEME MANAGER (DARK / LIGHT MODE)
     ══════════════════════════════════════════════════════════════════ */
  const ThemeManager = {
    init() {
      const toggleBtn = document.getElementById('dark-mode-toggle');
      const savedTheme = localStorage.getItem('mst_theme') || 'light';
      this.setTheme(savedTheme === 'dark');

      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          const isDark = !document.body.classList.contains('dark-mode');
          this.setTheme(isDark);
          localStorage.setItem('mst_theme', isDark ? 'dark' : 'light');
        });
      }
    },

    setTheme(isDark) {
      if (isDark) {
        document.body.classList.add('dark-mode');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      // Instantly trigger redraw on all active canvases
      if (window.FoundationsModule) FoundationsModule.draw();
      if (window.MSTVisualizer) MSTVisualizer.draw();
      if (window.MSTPracticeArena) MSTPracticeArena.draw();
    },

    isDark() {
      return document.body.classList.contains('dark-mode');
    }
  };

  /* ══════════════════════════════════════════════════════════════════
     2. NAVIGATION & TAB SWITCHER
     ══════════════════════════════════════════════════════════════════ */
  const NavigationManager = {
    init() {
      const moduleBtns = document.querySelectorAll('.nav-module-btn');
      moduleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          this.switchTo(btn.dataset.module);
        });
      });
    },

    switchTo(targetModule) {
      const moduleBtns = document.querySelectorAll('.nav-module-btn');
      moduleBtns.forEach(b => {
        if (b.dataset.module === targetModule) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      document.querySelectorAll('.module-tab-content').forEach(tab => {
        tab.classList.add('hidden');
      });

      const activeTab = document.getElementById(`module-${targetModule}`);
      if (activeTab) {
        activeTab.classList.remove('hidden');
      }

      // Adjust canvases on tab switch
      if (targetModule === 'foundations' && window.FoundationsModule) {
        FoundationsModule.resizeCanvas();
        FoundationsModule.draw();
      } else if (targetModule === 'mst' && window.MSTVisualizer) {
        MSTVisualizer.resizeCanvas();
        MSTVisualizer.draw();
      } else if (targetModule === 'arena' && window.MSTPracticeArena) {
        MSTPracticeArena.resizeCanvas();
        MSTPracticeArena.draw();
      }
    }
  };

  /* ══════════════════════════════════════════════════════════════════
     3. DISJOINT SET UNION (UNION-FIND DATA STRUCTURE)
     ══════════════════════════════════════════════════════════════════ */
  class DisjointSet {
    constructor(nodeIds) {
      this.parent = {};
      this.rank = {};
      nodeIds.forEach(id => {
        this.parent[id] = id;
        this.rank[id] = 0;
      });
    }

    find(i) {
      if (this.parent[i] === undefined) {
        this.parent[i] = i;
        this.rank[i] = 0;
        return i;
      }
      if (this.parent[i] !== i) {
        this.parent[i] = this.find(this.parent[i]); // Path compression
      }
      return this.parent[i];
    }

    union(i, j) {
      const rootI = this.find(i);
      const rootJ = this.find(j);
      if (rootI === rootJ) return false;

      // Union by rank
      if (this.rank[rootI] < this.rank[rootJ]) {
        this.parent[rootI] = rootJ;
      } else if (this.rank[rootI] > this.rank[rootJ]) {
        this.parent[rootJ] = rootI;
      } else {
        this.parent[rootJ] = rootI;
        this.rank[rootI]++;
      }
      return true;
    }

    getGroups(nodeIds) {
      const groups = {};
      nodeIds.forEach(id => {
        const root = this.find(id);
        if (!groups[root]) groups[root] = [];
        groups[root].push(id);
      });
      return Object.values(groups);
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     KIRCHHOFF'S MATRIX TREE THEOREM (TOTAL SPANNING TREES CALCULATOR)
     ══════════════════════════════════════════════════════════════════
     For any undirected graph G = (V, E):
     1. Construct Laplacian matrix L = D - A, where:
        - D is the diagonal degree matrix
        - A is the adjacency matrix
     2. Form reduced Laplacian L* by removing the last row and column (cofactor)
     3. Compute det(L*) via Gaussian elimination with partial pivoting
     Returns the exact total number of valid spanning trees tau(G).
     ══════════════════════════════════════════════════════════════════ */
  function calculateTotalSpanningTrees(nodes, edges) {
    if (!nodes || nodes.length === 0) return 0;
    const n = nodes.length;
    if (n === 1) return 1;
    if (!edges || edges.length < n - 1) return 0;

    // Map each node id to an index 0 .. n - 1
    const nodeIndex = new Map();
    nodes.forEach((node, idx) => nodeIndex.set(node.id, idx));

    // Construct Laplacian Matrix L = D - A of size n x n
    const L = Array.from({ length: n }, () => new Float64Array(n));

    for (const edge of edges) {
      const u = nodeIndex.get(edge.u);
      const v = nodeIndex.get(edge.v);
      if (u === undefined || v === undefined || u === v) continue;
      L[u][u] += 1;
      L[v][v] += 1;
      L[u][v] -= 1;
      L[v][u] -= 1;
    }

    // Form reduced Laplacian L* of size (n - 1) x (n - 1) by removing the last row and column
    const m = n - 1;
    const LStar = Array.from({ length: m }, (_, i) => {
      const row = new Float64Array(m);
      for (let j = 0; j < m; j++) {
        row[j] = L[i][j];
      }
      return row;
    });

    // Compute determinant using Gaussian elimination with partial pivoting
    let det = 1.0;
    for (let i = 0; i < m; i++) {
      // Find pivot row
      let pivotRow = i;
      let maxVal = Math.abs(LStar[i][i]);
      for (let k = i + 1; k < m; k++) {
        const val = Math.abs(LStar[k][i]);
        if (val > maxVal) {
          maxVal = val;
          pivotRow = k;
        }
      }

      if (maxVal < 1e-9) {
        // Singular matrix -> determinant is 0 (disconnected graph)
        return 0;
      }

      // Swap rows if necessary
      if (pivotRow !== i) {
        const temp = LStar[i];
        LStar[i] = LStar[pivotRow];
        LStar[pivotRow] = temp;
        det = -det;
      }

      det *= LStar[i][i];

      // Eliminate elements below the pivot
      const pivotVal = LStar[i][i];
      for (let k = i + 1; k < m; k++) {
        const factor = LStar[k][i] / pivotVal;
        for (let j = i; j < m; j++) {
          LStar[k][j] -= factor * LStar[i][j];
        }
      }
    }

    const total = Math.round(det);
    return isNaN(total) || total < 0 ? 0 : total;
  }

  /**
   * Complete Graph (Kn) Verifier & Cayley's Formula Engine:
   * A graph is ONLY classified as a complete graph if:
   * 1. The number of active edges strictly equals n * (n - 1) / 2 (where n >= 2).
   * 2. Every single vertex in the degree map has a degree of exactly (n - 1).
   *
   * Otherwise, it returns isComplete: false and falls back to Kirchhoff's Matrix Tree Theorem determinant.
   */
  function isCompleteGraph(nodes, edges) {
    const actualEdges = (edges && Array.isArray(edges)) ? edges.length : 0;
    const n = (nodes && Array.isArray(nodes)) ? nodes.length : 0;
    const requiredEdges = (n >= 2) ? (n * (n - 1)) / 2 : 0;

    console.log(`[isCompleteGraph] Evaluating graph: |V| = ${n}, |E| = ${actualEdges}, Expected complete |E| = ${requiredEdges}`);

    if (!nodes || !Array.isArray(nodes) || nodes.length < 2 || !edges || !Array.isArray(edges)) {
      console.log(`[isCompleteGraph] ❌ Incomplete: Invalid or insufficient vertices (|V| = ${n} < 2).`);
      return {
        isComplete: false,
        n,
        requiredEdges,
        actualEdges,
        cayleyTrees: 0,
        degreeMap: {}
      };
    }

    // Condition 1: The number of active edges strictly equals n * (n - 1) / 2
    if (actualEdges !== requiredEdges) {
      console.log(`[isCompleteGraph] ❌ Incomplete: Edge count mismatch (|E| = ${actualEdges} !== expected ${requiredEdges} for n = ${n}). Falling back to Kirchhoff.`);
      return {
        isComplete: false,
        n,
        requiredEdges,
        actualEdges,
        cayleyTrees: 0,
        degreeMap: {}
      };
    }

    // Build degree map for every single vertex in the graph
    const degreeMap = new Map();
    for (const node of nodes) {
      degreeMap.set(node.id, 0);
    }

    // Tally degrees and verify edge endpoints
    const seenEdges = new Set();
    for (const edge of edges) {
      if (!edge || !edge.u || !edge.v || edge.u === edge.v) {
        console.log(`[isCompleteGraph] ❌ Incomplete: Self-loop or invalid edge detected.`);
        return {
          isComplete: false,
          n,
          requiredEdges,
          actualEdges,
          cayleyTrees: 0,
          degreeMap: Object.fromEntries(degreeMap)
        };
      }

      if (!degreeMap.has(edge.u) || !degreeMap.has(edge.v)) {
        console.log(`[isCompleteGraph] ❌ Incomplete: Edge refers to unknown vertex (${edge.u}, ${edge.v}).`);
        return {
          isComplete: false,
          n,
          requiredEdges,
          actualEdges,
          cayleyTrees: 0,
          degreeMap: Object.fromEntries(degreeMap)
        };
      }

      // Ensure each undirected edge (u, v) is unique (no duplicate/parallel edges)
      const canonicalEdgeKey = edge.u < edge.v ? `${edge.u}--${edge.v}` : `${edge.v}--${edge.u}`;
      if (seenEdges.has(canonicalEdgeKey)) {
        console.log(`[isCompleteGraph] ❌ Incomplete: Duplicate edge detected (${canonicalEdgeKey}).`);
        return {
          isComplete: false,
          n,
          requiredEdges,
          actualEdges,
          cayleyTrees: 0,
          degreeMap: Object.fromEntries(degreeMap)
        };
      }
      seenEdges.add(canonicalEdgeKey);

      degreeMap.set(edge.u, degreeMap.get(edge.u) + 1);
      degreeMap.set(edge.v, degreeMap.get(edge.v) + 1);
    }

    // Condition 2: Every single vertex in the degree map has a degree of exactly (n - 1)
    const expectedDegree = n - 1;
    for (const [nodeId, deg] of degreeMap.entries()) {
      if (deg !== expectedDegree) {
        console.log(`[isCompleteGraph] ❌ Incomplete: Vertex "${nodeId}" has degree ${deg} !== expected ${expectedDegree}. Falling back to Kirchhoff.`);
        return {
          isComplete: false,
          n,
          requiredEdges,
          actualEdges,
          cayleyTrees: 0,
          degreeMap: Object.fromEntries(degreeMap)
        };
      }
    }

    // Both conditions strictly satisfied -> Valid Complete Graph Kn
    const cayleyTrees = Math.round(Math.pow(n, n - 2));
    console.log(`[isCompleteGraph] ✅ COMPLETE GRAPH K_${n} CONFIRMED! All ${n} vertices have degree exactly ${expectedDegree}, |E| = ${actualEdges}. Cayley's trees = ${cayleyTrees}.`);
    return {
      isComplete: true,
      n,
      requiredEdges,
      actualEdges,
      cayleyTrees,
      degreeMap: Object.fromEntries(degreeMap)
    };
  }

  /**
   * Helper function to format 2D numerical matrix arrays into clean HTML tables
   * with bracket borders, row/column vertex labels, and diagonal/edge highlighting.
   */
  function formatMatrixTable(matrix, labels, highlightOptions = {}) {
    const rows = matrix.length;
    const cols = matrix[0] ? matrix[0].length : 0;
    if (rows === 0 || cols === 0) return '<div style="color:var(--text-tertiary); font-size:12px;">Empty Matrix</div>';

    let html = '<table class="matrix-table"><thead><tr><th></th>';
    for (let j = 0; j < cols; j++) {
      const isElimCol = highlightOptions.eliminatedCol === j;
      html += `<th class="${isElimCol ? 'cell-eliminated' : ''}">${labels[j] !== undefined ? labels[j] : j}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let i = 0; i < rows; i++) {
      const isElimRow = highlightOptions.eliminatedRow === i;
      html += `<tr><th class="${isElimRow ? 'cell-eliminated' : ''}">${labels[i] !== undefined ? labels[i] : i}</th>`;
      for (let j = 0; j < cols; j++) {
        const val = matrix[i][j];
        let cellClass = '';
        if (isElimRow || highlightOptions.eliminatedCol === j) {
          cellClass = 'cell-eliminated';
        } else if (i === j && highlightOptions.isDiagonal) {
          cellClass = 'cell-diag';
        } else if (val !== 0) {
          cellClass = 'cell-edge';
        } else {
          cellClass = 'cell-zero';
        }
        html += `<td class="${cellClass}">${val}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  // Expose globally for console testing or external inspection
  window.calculateTotalSpanningTrees = calculateTotalSpanningTrees;
  window.isCompleteGraph = isCompleteGraph;
  window.formatMatrixTable = formatMatrixTable;

  /* ══════════════════════════════════════════════════════════════════
     3.5. PHASE 1: SPANNING TREE FOUNDATIONS
     ══════════════════════════════════════════════════════════════════ */
  const FoundationsModule = {
    canvas: null,
    ctx: null,
    dpr: 1,

    // Diverse graph presets
    presets: [
      {
        name: 'Preset 1: House Graph (5 Nodes, 6 Edges)',
        nodes: [
          { id: 'A', label: 'A', x: 350, y: 70 },
          { id: 'B', label: 'B', x: 220, y: 170 },
          { id: 'C', label: 'C', x: 480, y: 170 },
          { id: 'D', label: 'D', x: 220, y: 290 },
          { id: 'E', label: 'E', x: 480, y: 290 }
        ],
        edges: [
          { id: 'fe1', u: 'A', v: 'B', weight: 3 },
          { id: 'fe2', u: 'A', v: 'C', weight: 4 },
          { id: 'fe3', u: 'B', v: 'C', weight: 2 },
          { id: 'fe4', u: 'B', v: 'D', weight: 5 },
          { id: 'fe5', u: 'C', v: 'E', weight: 6 },
          { id: 'fe6', u: 'D', v: 'E', weight: 7 }
        ],
        sampleTree: ['fe1', 'fe3', 'fe4', 'fe5']
      },
      {
        name: 'Preset 2: Textbook Graph (6 Nodes, 9 Edges)',
        nodes: [
          { id: 'A', label: 'A', x: 150, y: 180 },
          { id: 'B', label: 'B', x: 280, y: 80 },
          { id: 'C', label: 'C', x: 460, y: 80 },
          { id: 'D', label: 'D', x: 590, y: 180 },
          { id: 'E', label: 'E', x: 460, y: 280 },
          { id: 'F', label: 'F', x: 280, y: 280 }
        ],
        edges: [
          { id: 'fe10', u: 'A', v: 'B', weight: 4 },
          { id: 'fe11', u: 'A', v: 'F', weight: 2 },
          { id: 'fe12', u: 'B', v: 'C', weight: 6 },
          { id: 'fe13', u: 'B', v: 'F', weight: 5 },
          { id: 'fe14', u: 'C', v: 'D', weight: 3 },
          { id: 'fe15', u: 'C', v: 'E', weight: 1 },
          { id: 'fe16', u: 'D', v: 'E', weight: 2 },
          { id: 'fe17', u: 'E', v: 'F', weight: 4 },
          { id: 'fe18', u: 'B', v: 'E', weight: 7 }
        ],
        sampleTree: ['fe11', 'fe10', 'fe15', 'fe16', 'fe17']
      },
      {
        name: 'Preset 3: Bridge & Dual Clusters (6 Nodes, 7 Edges)',
        nodes: [
          { id: 'A', label: 'A', x: 140, y: 100 },
          { id: 'B', label: 'B', x: 140, y: 260 },
          { id: 'C', label: 'C', x: 270, y: 180 },
          { id: 'D', label: 'D', x: 440, y: 180 },
          { id: 'E', label: 'E', x: 570, y: 100 },
          { id: 'F', label: 'F', x: 570, y: 260 }
        ],
        edges: [
          { id: 'fe20', u: 'A', v: 'B', weight: 3 },
          { id: 'fe21', u: 'A', v: 'C', weight: 4 },
          { id: 'fe22', u: 'B', v: 'C', weight: 2 },
          { id: 'fe23', u: 'C', v: 'D', weight: 8 },
          { id: 'fe24', u: 'D', v: 'E', weight: 5 },
          { id: 'fe25', u: 'D', v: 'F', weight: 6 },
          { id: 'fe26', u: 'E', v: 'F', weight: 1 }
        ],
        sampleTree: ['fe20', 'fe22', 'fe23', 'fe24', 'fe26']
      },
      {
        name: 'Preset 4: Cyclic Grid (7 Nodes, 10 Edges)',
        nodes: [
          { id: 'A', label: 'A', x: 160, y: 90 },
          { id: 'B', label: 'B', x: 350, y: 90 },
          { id: 'C', label: 'C', x: 540, y: 90 },
          { id: 'D', label: 'D', x: 160, y: 230 },
          { id: 'E', label: 'E', x: 350, y: 230 },
          { id: 'F', label: 'F', x: 540, y: 230 },
          { id: 'G', label: 'G', x: 350, y: 320 }
        ],
        edges: [
          { id: 'fe30', u: 'A', v: 'B', weight: 2 },
          { id: 'fe31', u: 'B', v: 'C', weight: 4 },
          { id: 'fe32', u: 'A', v: 'D', weight: 3 },
          { id: 'fe33', u: 'B', v: 'E', weight: 5 },
          { id: 'fe34', u: 'C', v: 'F', weight: 6 },
          { id: 'fe35', u: 'D', v: 'E', weight: 1 },
          { id: 'fe36', u: 'E', v: 'F', weight: 2 },
          { id: 'fe37', u: 'D', v: 'G', weight: 7 },
          { id: 'fe38', u: 'E', v: 'G', weight: 3 },
          { id: 'fe39', u: 'F', v: 'G', weight: 4 }
        ],
        sampleTree: ['fe35', 'fe36', 'fe30', 'fe38', 'fe32', 'fe34']
      },
      {
        name: 'Preset 5: Complete Graph K4 (4 Nodes, 6 Edges)',
        nodes: [
          { id: 'A', label: 'A', x: 250, y: 100 },
          { id: 'B', label: 'B', x: 450, y: 100 },
          { id: 'C', label: 'C', x: 450, y: 280 },
          { id: 'D', label: 'D', x: 250, y: 280 }
        ],
        edges: [
          { id: 'fe40', u: 'A', v: 'B', weight: 2 },
          { id: 'fe41', u: 'B', v: 'C', weight: 4 },
          { id: 'fe42', u: 'C', v: 'D', weight: 3 },
          { id: 'fe43', u: 'D', v: 'A', weight: 5 },
          { id: 'fe44', u: 'A', v: 'C', weight: 6 },
          { id: 'fe45', u: 'B', v: 'D', weight: 7 }
        ],
        sampleTree: ['fe40', 'fe41', 'fe42']
      },
      {
        name: 'Preset 6: Complete Graph K5 (5 Nodes, 10 Edges)',
        nodes: [
          { id: 'A', label: 'A', x: 350, y: 70 },
          { id: 'B', label: 'B', x: 500, y: 170 },
          { id: 'C', label: 'C', x: 440, y: 300 },
          { id: 'D', label: 'D', x: 260, y: 300 },
          { id: 'E', label: 'E', x: 200, y: 170 }
        ],
        edges: [
          { id: 'fe50', u: 'A', v: 'B', weight: 2 },
          { id: 'fe51', u: 'A', v: 'C', weight: 5 },
          { id: 'fe52', u: 'A', v: 'D', weight: 4 },
          { id: 'fe53', u: 'A', v: 'E', weight: 3 },
          { id: 'fe54', u: 'B', v: 'C', weight: 6 },
          { id: 'fe55', u: 'B', v: 'D', weight: 7 },
          { id: 'fe56', u: 'B', v: 'E', weight: 8 },
          { id: 'fe57', u: 'C', v: 'D', weight: 1 },
          { id: 'fe58', u: 'C', v: 'E', weight: 9 },
          { id: 'fe59', u: 'D', v: 'E', weight: 2 }
        ],
        sampleTree: ['fe50', 'fe54', 'fe57', 'fe59']
      }
    ],

    currentPresetIdx: 0,
    graph: null,
    selectedEdgeIds: new Set(),
    hoveredEdge: null,

    // Feedback highlight states
    flashingCycleEdges: new Set(),
    highlightedUnreachedNodes: new Set(),
    highlightedCycleNodes: new Set(),
    validationFlash: null,

    init() {
      this.canvas = document.getElementById('foundations-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      this.bindDOM();
      this.loadPreset(0);
      this.resizeCanvas();
      this.draw();

      window.addEventListener('resize', () => {
        this.resizeCanvas();
        this.draw();
      });
    },

    bindDOM() {
      // Preset dropdown
      const selectPreset = document.getElementById('foundations-preset-select');
      if (selectPreset) {
        selectPreset.addEventListener('change', (e) => {
          this.loadPreset(parseInt(e.target.value, 10));
        });
      }

      // Check button
      const btnCheck = document.getElementById('foundations-btn-check');
      if (btnCheck) {
        btnCheck.addEventListener('click', () => {
          this.validateSpanningTree();
        });
      }

      // Reset button
      const btnReset = document.getElementById('foundations-btn-reset');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          this.resetEdges();
        });
      }

      // Sample Valid Tree button
      const btnSample = document.getElementById('foundations-btn-sample');
      if (btnSample) {
        btnSample.addEventListener('click', () => {
          this.loadSampleTree();
        });
      }

      // Proceed to Phase 2 button
      const btnNext = document.getElementById('foundations-btn-next');
      if (btnNext) {
        btnNext.addEventListener('click', () => {
          NavigationManager.switchTo('mst');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }

      // Matrix Tree Theorem Collapsible Panel Toggle
      const btnToggleMatrix = document.getElementById('btn-toggle-matrix-breakdown');
      const headerMatrix = document.getElementById('matrix-breakdown-header');
      const contentMatrix = document.getElementById('matrix-breakdown-content');
      const toggleChevron = document.querySelector('.toggle-chevron');
      const toggleBtnText = document.querySelector('.toggle-btn-text');

      const toggleMatrixPanel = () => {
        if (!contentMatrix) return;
        const isCollapsed = contentMatrix.classList.toggle('collapsed');
        if (toggleChevron) {
          toggleChevron.classList.toggle('rotated', !isCollapsed);
        }
        if (toggleBtnText) {
          toggleBtnText.textContent = isCollapsed ? 'Show Breakdown' : 'Hide Breakdown';
        }
      };

      if (btnToggleMatrix) {
        btnToggleMatrix.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleMatrixPanel();
        });
      }
      if (headerMatrix) {
        headerMatrix.addEventListener('click', () => toggleMatrixPanel());
      }

      // Canvas interactions
      this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      this.canvas.addEventListener('mouseleave', () => {
        this.hoveredEdge = null;
        this.draw();
      });
      this.canvas.addEventListener('click', (e) => this.handleClick(e));
    },

    loadPreset(idx) {
      this.currentPresetIdx = idx;
      this.graph = JSON.parse(JSON.stringify(this.presets[idx]));
      this.resetEdges();
    },

    resetEdges() {
      this.selectedEdgeIds = new Set();
      this.hoveredEdge = null;
      this.flashingCycleEdges = new Set();
      this.highlightedUnreachedNodes = new Set();
      this.highlightedCycleNodes = new Set();
      this.validationFlash = null;

      this.hideFeedback();
      this.resetRuleIndicatorTags();
      this.updateProgressUI();
      this.draw();
    },

    loadSampleTree() {
      const preset = this.presets[this.currentPresetIdx];
      if (!preset || !preset.sampleTree) return;

      this.selectedEdgeIds = new Set(preset.sampleTree);
      this.flashingCycleEdges = new Set();
      this.highlightedUnreachedNodes = new Set();
      this.highlightedCycleNodes = new Set();
      this.updateProgressUI();
      this.validateSpanningTree();
    },

    resizeCanvas() {
      if (!this.canvas) return;
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = Math.max(380, rect.height || 380);

      this.canvas.width = width * this.dpr;
      this.canvas.height = height * this.dpr;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;

      this.ctx.resetTransform();
      this.ctx.scale(this.dpr, this.dpr);
    },

    getNodePos(node) {
      const width = this.canvas.width / this.dpr;
      const height = this.canvas.height / this.dpr;
      const baseW = 700;
      const baseH = 380;
      const scale = Math.min((width - 40) / baseW, (height - 40) / baseH, 1.15);
      const offsetX = (width - baseW * scale) / 2;
      const offsetY = (height - baseH * scale) / 2;
      return {
        x: node.x * scale + offsetX,
        y: node.y * scale + offsetY
      };
    },

    distToSegment(px, py, x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    },

    getPointerPos(e) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    },

    getEdgeAtPos(pos) {
      if (!this.graph) return null;
      for (const edge of this.graph.edges) {
        const uNode = this.graph.nodes.find(n => n.id === edge.u);
        const vNode = this.graph.nodes.find(n => n.id === edge.v);
        if (!uNode || !vNode) continue;
        const pU = this.getNodePos(uNode);
        const pV = this.getNodePos(vNode);

        const dist = this.distToSegment(pos.x, pos.y, pU.x, pU.y, pV.x, pV.y);
        if (dist <= 16) return edge;

        const midX = (pU.x + pV.x) / 2;
        const midY = (pU.y + pV.y) / 2;
        if (Math.hypot(pos.x - midX, pos.y - midY) <= 20) return edge;
      }
      return null;
    },

    handleMouseMove(e) {
      const pos = this.getPointerPos(e);
      const edge = this.getEdgeAtPos(pos);
      if (edge !== this.hoveredEdge) {
        this.hoveredEdge = edge;
        this.canvas.style.cursor = edge ? 'pointer' : 'default';
        this.draw();
      }
    },

    handleClick(e) {
      const pos = this.getPointerPos(e);
      const edge = this.getEdgeAtPos(pos);
      if (edge) {
        this.toggleEdge(edge);
      }
    },

    toggleEdge(edge) {
      if (this.selectedEdgeIds.has(edge.id)) {
        this.selectedEdgeIds.delete(edge.id);
      } else {
        this.selectedEdgeIds.add(edge.id);
      }

      this.flashingCycleEdges.clear();
      this.highlightedUnreachedNodes.clear();
      this.highlightedCycleNodes.clear();
      this.validationFlash = null;

      this.updateProgressUI();
      this.draw();

      const banner = document.getElementById('foundations-feedback-banner');
      if (banner && !banner.classList.contains('hidden')) {
        this.validateSpanningTree();
      }
    },

    updateProgressUI() {
      if (!this.graph) return;
      const totalV = this.graph.nodes.length;
      const totalE = this.graph.edges.length;
      const targetEdges = totalV - 1;
      const currentEdges = this.selectedEdgeIds.size;

      // Kirchhoff's Matrix Tree Theorem: Total Spanning Trees for current graph layout
      const totalSpanningTrees = calculateTotalSpanningTrees(this.graph.nodes, this.graph.edges);

      // Graph Stats Card Elements
      const graphV = document.getElementById('foundations-graph-v');
      const graphE = document.getElementById('foundations-graph-e');
      const graphTotalTrees = document.getElementById('foundations-graph-total-trees');
      const chipTotalTrees = document.getElementById('foundations-stat-trees-chip');
      const targetHint = document.getElementById('foundations-target-edges-hint');

      if (graphV) graphV.textContent = totalV;
      if (graphE) graphE.textContent = totalE;
      if (graphTotalTrees) graphTotalTrees.textContent = totalSpanningTrees.toLocaleString();
      if (chipTotalTrees) chipTotalTrees.textContent = totalSpanningTrees.toLocaleString();
      if (targetHint) targetHint.textContent = targetEdges;

      // Update Top Stats Card Method Tag (Cayley vs Kirchhoff)
      const completeCheckPreset = isCompleteGraph(this.graph.nodes, this.graph.edges);
      const tagMethod = document.getElementById('foundations-tag-method');
      const formulaSub = document.getElementById('foundations-formula-sub');
      if (tagMethod) {
        tagMethod.textContent = completeCheckPreset.isComplete ? '⚡ Cayley\'s Formula' : 'Kirchhoff\'s Theorem';
        tagMethod.title = completeCheckPreset.isComplete ? 'Complete graph Kn detected: tau = n^(n-2)' : 'Calculated via Kirchhoff\'s Matrix Tree Theorem det(L*)';
      }
      if (formulaSub) {
        formulaSub.innerHTML = completeCheckPreset.isComplete
          ? `&tau;(K<sub>${totalV}</sub>) = ${totalV}<sup>${totalV} - 2</sup> = ${totalSpanningTrees}`
          : '&tau;(G) = det(L*) where L = D - A';
      }

      // Sandbox Live Rule Metrics Strip
      const statV = document.getElementById('foundations-stat-v');
      const statE = document.getElementById('foundations-stat-e');
      const listEl = document.getElementById('foundations-selected-edges-list');

      if (statV) statV.textContent = totalV;
      if (statE) {
        statE.textContent = `${currentEdges} / ${targetEdges}`;
        statE.className = 'f-metric-val ' + (currentEdges === targetEdges ? 'f-good' : currentEdges > targetEdges ? 'f-bad' : 'f-warn');
      }

      if (listEl) {
        if (this.selectedEdgeIds.size === 0) {
          listEl.innerHTML = '<span class="foundations-placeholder">No edges toggled on yet. Click any edge on the graph to activate it!</span>';
        } else {
          const activeEdges = this.graph.edges.filter(e => this.selectedEdgeIds.has(e.id));
          listEl.innerHTML = activeEdges.map(e => `
            <span class="foundations-edge-chip" data-edge-id="${e.id}" title="Click to remove">
              (${e.u}, ${e.v}) w=${e.weight} <span class="chip-del-icon">&times;</span>
            </span>
          `).join('');

          listEl.querySelectorAll('.foundations-edge-chip').forEach(chip => {
            chip.addEventListener('click', () => {
              const edgeId = chip.dataset.edgeId;
              const edge = this.graph.edges.find(e => e.id === edgeId);
              if (edge) this.toggleEdge(edge);
            });
          });
        }
      }

      // Update Linear Algebra Matrix Breakdown visualizer
      this.renderMatrixBreakdown(this.graph.nodes, this.graph.edges);
    },

    /**
     * Render the 4 Intermediate Matrices (D, A, L, L*) and Cayley / Kirchhoff Theorem Walkthrough
     */
    renderMatrixBreakdown(nodes, edges) {
      if (!nodes || nodes.length === 0) return;
      const n = nodes.length;
      const labels = nodes.map(node => node.label || node.id);

      // Node ID to index mapping
      const nodeIndex = new Map();
      nodes.forEach((node, idx) => nodeIndex.set(node.id, idx));

      // 1. Degree Matrix D (n x n)
      const D = Array.from({ length: n }, () => new Array(n).fill(0));
      // 2. Adjacency Matrix A (n x n)
      const A = Array.from({ length: n }, () => new Array(n).fill(0));
      // 3. Laplacian Matrix L = D - A (n x n)
      const L = Array.from({ length: n }, () => new Array(n).fill(0));

      for (const edge of edges) {
        const u = nodeIndex.get(edge.u);
        const v = nodeIndex.get(edge.v);
        if (u === undefined || v === undefined || u === v) continue;
        D[u][u] += 1;
        D[v][v] += 1;
        A[u][v] += 1;
        A[v][u] += 1;
        L[u][u] += 1;
        L[v][v] += 1;
        L[u][v] -= 1;
        L[v][u] -= 1;
      }

      // 4. Reduced Laplacian Matrix L* ((n - 1) x (n - 1))
      // Formed by eliminating the last row (n - 1) and last column (n - 1)
      const m = Math.max(0, n - 1);
      const LStar = Array.from({ length: m }, (_, i) => {
        const row = new Array(m);
        for (let j = 0; j < m; j++) {
          row[j] = L[i][j];
        }
        return row;
      });
      const labelsReduced = labels.slice(0, m);

      // Render matrices into DOM
      const dispD = document.getElementById('matrix-disp-d');
      const dispA = document.getElementById('matrix-disp-a');
      const dispL = document.getElementById('matrix-disp-l');
      const dispLStar = document.getElementById('matrix-disp-lstar');

      if (dispD) dispD.innerHTML = formatMatrixTable(D, labels, { isDiagonal: true });
      if (dispA) dispA.innerHTML = formatMatrixTable(A, labels);
      if (dispL) dispL.innerHTML = formatMatrixTable(L, labels, { isDiagonal: true, eliminatedRow: n - 1, eliminatedCol: n - 1 });
      if (dispLStar) dispLStar.innerHTML = formatMatrixTable(LStar, labelsReduced, { isDiagonal: true });

      // Check for Complete Graph (Cayley's Formula Special Case)
      const completeCheck = isCompleteGraph(nodes, edges);
      const totalTrees = calculateTotalSpanningTrees(nodes, edges);

      console.log(`[MatrixBreakdown] Evaluated graph: |V| = ${n}, |E| = ${edges.length}, isComplete = ${completeCheck.isComplete}, tau(G) = ${totalTrees}`);

      const cayleyBanner = document.getElementById('matrix-cayley-banner');
      const kirchhoffBanner = document.getElementById('matrix-kirchhoff-banner');
      const cayleyEvalText = document.getElementById('cayley-eval-text');
      const badgeStatus = document.getElementById('matrix-badge-status');
      const detResultVal = document.getElementById('matrix-det-result-val');
      const strikeNodeName = document.getElementById('matrix-strike-node-name');

      const lastNodeLabel = labels[n - 1] || `v_${n}`;
      if (strikeNodeName) strikeNodeName.textContent = `Node ${lastNodeLabel}`;

      if (detResultVal) detResultVal.textContent = totalTrees.toLocaleString();

      if (completeCheck.isComplete) {
        console.log(`[MatrixBreakdown] UI: Activating Cayley Banner (K_${n}), Hiding Kirchhoff Banner.`);
        if (cayleyBanner) {
          cayleyBanner.classList.remove('hidden');
          cayleyBanner.style.setProperty('display', 'flex', 'important');
        }
        if (kirchhoffBanner) {
          kirchhoffBanner.classList.add('hidden');
          kirchhoffBanner.style.setProperty('display', 'none', 'important');
        }
        if (cayleyEvalText) cayleyEvalText.textContent = `${n}^(${n} - 2) = ${n}^${n - 2} = ${completeCheck.cayleyTrees.toLocaleString()}`;
        if (badgeStatus) {
          badgeStatus.textContent = `⚡ Cayley: n^(n-2) = ${completeCheck.cayleyTrees.toLocaleString()}`;
          badgeStatus.className = 'matrix-status-chip chip-cayley';
        }
      } else {
        console.log(`[MatrixBreakdown] UI: Activating Kirchhoff Banner (det(L*)), Hiding Cayley Banner.`);
        if (cayleyBanner) {
          cayleyBanner.classList.add('hidden');
          cayleyBanner.style.setProperty('display', 'none', 'important');
        }
        if (kirchhoffBanner) {
          kirchhoffBanner.classList.remove('hidden');
          kirchhoffBanner.style.setProperty('display', 'flex', 'important');
        }
        if (badgeStatus) {
          badgeStatus.textContent = 'Kirchhoff det(L*)';
          badgeStatus.className = 'matrix-status-chip';
        }
      }

      // Update Step-by-Step Walkthrough
      const walkV = document.getElementById('walkthrough-v');
      const walkE = document.getElementById('walkthrough-e');
      const walkIdx = document.getElementById('walkthrough-removed-idx');
      const walkIdx2 = document.getElementById('walkthrough-removed-idx2');
      const walkLabel = document.getElementById('walkthrough-removed-label');
      const walkDetVal = document.getElementById('walkthrough-det-val');
      const walkStepDet = document.getElementById('walkthrough-step-det');

      if (walkV) walkV.textContent = n;
      if (walkE) walkE.textContent = edges.length;
      if (walkIdx) walkIdx.textContent = n;
      if (walkIdx2) walkIdx2.textContent = n;
      if (walkLabel) walkLabel.textContent = lastNodeLabel;
      if (walkDetVal) walkDetVal.textContent = totalTrees.toLocaleString();

      if (walkStepDet) {
        if (completeCheck.isComplete) {
          walkStepDet.innerHTML = `<strong>Special Case &amp; Determinant:</strong> Complete graph K<sub>${n}</sub> detected (strictly |E| = ${edges.length} = ${n}&times;${n - 1}/2 and all vertices have degree exactly ${n - 1}). Calculated instantly using Cayley's formula: &tau;(K<sub>${n}</sub>) = ${n}<sup>${n}-2</sup> = <strong>${completeCheck.cayleyTrees.toLocaleString()}</strong>. Gaussian elimination on L* verifies det(L*) = <strong>${totalTrees.toLocaleString()}</strong>.`;
        } else {
          walkStepDet.innerHTML = `<strong>Determinant Computation:</strong> General/sparse graph detected (nodes have degrees &ne; ${n - 1} or |E| &ne; ${n * (n - 1) / 2}). Applying Gaussian elimination with partial row pivoting to reduce L* to upper triangular form, multiplying diagonal pivots: det(L*) = <strong>${totalTrees.toLocaleString()}</strong> valid spanning trees.`;
        }
      }
    },

    resetRuleIndicatorTags() {
      const tag1 = document.getElementById('tag-rule-1');
      const tag2 = document.getElementById('tag-rule-2');
      const tag3 = document.getElementById('tag-rule-3');
      const tag4 = document.getElementById('tag-rule-4');
      if (tag1) { tag1.className = 'rule-indicator-tag'; tag1.textContent = 'Status: Pending Check'; }
      if (tag2) { tag2.className = 'rule-indicator-tag'; tag2.textContent = 'Status: Pending Check'; }
      if (tag3) { tag3.className = 'rule-indicator-tag'; tag3.textContent = 'Status: Pending Check'; }
      if (tag4) { tag4.className = 'rule-indicator-tag'; tag4.textContent = 'Status: Pending Check'; }

      const statConn = document.getElementById('foundations-stat-conn');
      const statCycles = document.getElementById('foundations-stat-cycles');
      if (statConn) { statConn.textContent = 'Checking...'; statConn.className = 'f-metric-val'; }
      if (statCycles) { statCycles.textContent = 'Checking...'; statCycles.className = 'f-metric-val'; }
    },

    /* ══════════════════════════════════════════════════════════════════
       VALIDATION LOGIC (BFS/DFS CONNECTIVITY & CYCLE DETECTION)
       ══════════════════════════════════════════════════════════════════ */
    validateSpanningTree() {
      if (!this.graph) return;
      const N = this.graph.nodes.length;
      const targetEdgeCount = N - 1;
      const activeEdges = this.graph.edges.filter(e => this.selectedEdgeIds.has(e.id));
      const M = activeEdges.length;

      // 1. Build Adjacency List for Active Edges
      const adj = {};
      this.graph.nodes.forEach(n => { adj[n.id] = []; });
      activeEdges.forEach(e => {
        adj[e.u].push({ v: e.v, edge: e });
        adj[e.v].push({ v: e.u, edge: e });
      });

      // 2. DFS for Cycle Detection & Connected Component Partition
      const visited = new Set();
      const parent = new Map();
      const components = [];
      const cycleEdges = [];
      const cycleNodes = new Set();
      let hasCycle = false;

      for (const node of this.graph.nodes) {
        if (!visited.has(node.id)) {
          const comp = [];
          const dfs = (u, p) => {
            visited.add(u);
            comp.push(u);
            for (const { v, edge } of adj[u]) {
              if (v === p) continue; // Skip back to parent in undirected edge
              if (visited.has(v)) {
                // Back-edge detected -> cycle exists!
                hasCycle = true;
                cycleEdges.push(edge);
                cycleNodes.add(u);
                cycleNodes.add(v);
              } else {
                parent.set(v, u);
                dfs(v, u);
              }
            }
          };
          dfs(node.id, null);
          components.push(comp);
        }
      }

      // 3. BFS Verification from First Node for Component Reachability
      const startNode = this.graph.nodes[0].id;
      const bfsQueue = [startNode];
      const bfsVisited = new Set([startNode]);
      while (bfsQueue.length > 0) {
        const curr = bfsQueue.shift();
        for (const { v } of adj[curr]) {
          if (!bfsVisited.has(v)) {
            bfsVisited.add(v);
            bfsQueue.push(v);
          }
        }
      }

      const reachedCount = components[0] ? components[0].length : 0;
      const isConnected = (components.length === 1 && reachedCount === N && activeEdges.length >= targetEdgeCount);
      const isAcyclic = !hasCycle;
      const hasExactEdges = (M === targetEdgeCount);

      // 4 Core Rule Evaluations
      const rule1Pass = (bfsVisited.size === N && this.graph.nodes.every(n => adj[n.id].length > 0));
      const rule2Pass = (M > 0 && activeEdges.every(e => this.graph.edges.some(ge => ge.id === e.id)));
      const rule3Pass = hasExactEdges;
      const rule4Pass = (components.length === 1 && reachedCount === N && isAcyclic);
      const isValidSpanningTree = rule1Pass && rule2Pass && rule3Pass && rule4Pass;

      // Update state for canvas rendering
      this.flashingCycleEdges = new Set(cycleEdges.map(e => e.id));
      this.highlightedCycleNodes = new Set(cycleNodes);
      this.highlightedUnreachedNodes = new Set(
        this.graph.nodes.filter(n => !bfsVisited.has(n.id) || adj[n.id].length === 0).map(n => n.id)
      );

      // Update metrics strip
      const statConn = document.getElementById('foundations-stat-conn');
      const statCycles = document.getElementById('foundations-stat-cycles');
      if (statConn) {
        if (rule4Pass && isConnected) {
          statConn.textContent = '1 Connected Component';
          statConn.className = 'f-metric-val f-good';
        } else {
          statConn.textContent = `Disconnected (${components.length} components)`;
          statConn.className = 'f-metric-val f-bad';
        }
      }
      if (statCycles) {
        if (isAcyclic) {
          statCycles.textContent = '0 Cycles (Acyclic)';
          statCycles.className = 'f-metric-val f-good';
        } else {
          statCycles.textContent = 'Cycle Detected!';
          statCycles.className = 'f-metric-val f-bad';
        }
      }

      // Update 4 Core Rule Indicator Tags on cards
      const tag1 = document.getElementById('tag-rule-1');
      const tag2 = document.getElementById('tag-rule-2');
      const tag3 = document.getElementById('tag-rule-3');
      const tag4 = document.getElementById('tag-rule-4');

      if (tag1) {
        if (rule1Pass) {
          tag1.className = 'rule-indicator-tag tag-pass';
          tag1.textContent = `✓ All ${N} Vertices Spanned`;
        } else {
          tag1.className = 'rule-indicator-tag tag-fail';
          const unreachedCount = this.graph.nodes.filter(n => !bfsVisited.has(n.id) || adj[n.id].length === 0).length;
          tag1.textContent = `✗ ${unreachedCount > 0 ? unreachedCount + ' Unreached Node(s)' : 'Disconnected'}`;
        }
      }

      if (tag2) {
        if (rule2Pass) {
          tag2.className = 'rule-indicator-tag tag-pass';
          tag2.textContent = `✓ Subgraph of G (E_tree ⊆ E)`;
        } else {
          tag2.className = 'rule-indicator-tag tag-fail';
          tag2.textContent = `✗ No Subgraph Edges Active`;
        }
      }

      if (tag3) {
        if (rule3Pass) {
          tag3.className = 'rule-indicator-tag tag-pass';
          tag3.textContent = `✓ Exactly |V|-1 (${M} / ${targetEdgeCount} Edges)`;
        } else {
          tag3.className = 'rule-indicator-tag tag-fail';
          tag3.textContent = `✗ ${M} / ${targetEdgeCount} Edges (${M < targetEdgeCount ? 'Too few' : 'Too many'})`;
        }
      }

      if (tag4) {
        if (rule4Pass) {
          tag4.className = 'rule-indicator-tag tag-pass';
          tag4.textContent = '✓ Connected & Zero Cycles';
        } else {
          tag4.className = 'rule-indicator-tag tag-fail';
          tag4.textContent = hasCycle ? '✗ Cycle Detected' : `✗ Disconnected (${components.length} components)`;
        }
      }

      // Update Feedback Banner
      const unreachedNames = Array.from(this.highlightedUnreachedNodes).join(', ');
      const cycleNodeNames = Array.from(this.highlightedCycleNodes).join(', ');

      if (isValidSpanningTree) {
        this.validationFlash = 'success';
        this.showFeedback(
          'banner-success',
          '🎉 Valid Spanning Tree Confirmed!',
          `Outstanding! All 4 foundational rules are satisfied: (1) All ${N} vertices are reached, (2) All chosen edges form a valid subgraph of G, (3) Exactly |V| - 1 = ${targetEdgeCount} edges are used, and (4) BFS/DFS traversal verifies exactly 1 connected component with 0 cycles. This is a mathematically sound Spanning Tree of graph G!`,
          true, true, true, true
        );
      } else if (M === 0) {
        this.validationFlash = 'disconnected';
        this.showFeedback(
          'banner-failure',
          '❌ No Edges Selected (0 / ' + targetEdgeCount + ')',
          `Please click or tap edges on the graph above to toggle them ON. A spanning tree must connect all ${N} vertices using exactly ${targetEdgeCount} edges.`,
          false, false, false, false
        );
      } else if (M < targetEdgeCount) {
        this.validationFlash = 'disconnected';
        let desc = `A tree on ${N} vertices requires exactly |V| - 1 = ${targetEdgeCount} edges. You have only selected ${M} edge(s), leaving the graph disconnected into ${components.length} separate components.`;
        if (unreachedNames) {
          desc += ` Vertices [${unreachedNames}] are currently isolated.`;
        }
        if (hasCycle) {
          desc += ` Notice: A cycle was formed among vertices [${cycleNodeNames}], wasting edges needed for connectivity!`;
        }
        this.showFeedback(
          'banner-warning',
          `⚠️ Too Few Edges Selected (${M} / ${targetEdgeCount})`,
          desc,
          rule1Pass, rule2Pass, false, false
        );
      } else if (M > targetEdgeCount) {
        this.validationFlash = 'cycle';
        this.showFeedback(
          'banner-failure',
          `⚠️ Too Many Edges Selected (${M} / ${targetEdgeCount})`,
          `You have selected ${M} edges (${M - targetEdgeCount} redundant edge(s)). A spanning tree on ${N} vertices can only have exactly ${targetEdgeCount} edges. By tree theory, any undirected graph with |E| >= |V| is guaranteed to contain at least one closed cycle!`,
          rule1Pass, rule2Pass, false, false
        );
      } else {
        // M === targetEdgeCount, but hasCycle and is disconnected!
        this.validationFlash = 'cycle';
        this.showFeedback(
          'banner-failure',
          '❌ Invalid Tree: Cycle Detected & Disconnected',
          `Although you chose exactly ${M} edges (|V|-1), they form a closed loop (cycle) and fail to span all vertices! Vertex/vertices [${unreachedNames}] are completely omitted. A tree must be fully connected and acyclic.`,
          false, true, true, false
        );
      }

      this.draw();
    },

    showFeedback(typeClass, title, desc, r1Pass, r2Pass, r3Pass, r4Pass) {
      const banner = document.getElementById('foundations-feedback-banner');
      const iconEl = document.getElementById('foundations-feedback-icon');
      const titleEl = document.getElementById('foundations-feedback-title');
      const descEl = document.getElementById('foundations-feedback-desc');

      const checkV = document.getElementById('check-item-v');
      const checkSub = document.getElementById('check-item-sub');
      const checkE = document.getElementById('check-item-e');
      const checkC = document.getElementById('check-item-c');

      if (!banner || !titleEl || !descEl) return;

      banner.className = `foundations-feedback-banner ${typeClass}`;
      titleEl.textContent = title;
      descEl.textContent = desc;

      if (iconEl) {
        if (typeClass === 'banner-success') iconEl.textContent = '🎉';
        else if (typeClass === 'banner-warning') iconEl.textContent = '⚠️';
        else iconEl.textContent = '❌';
      }

      const totalV = this.graph.nodes.length;
      const targetE = totalV - 1;
      const currE = this.selectedEdgeIds.size;

      if (checkV) {
        checkV.className = `checklist-item ${r1Pass ? 'pass' : 'fail'}`;
        checkV.innerHTML = `<span>${r1Pass ? '✓' : '✗'}</span> <span>Rule 1: All ${totalV} vertices spanned (${r1Pass ? '100% connected' : 'Omitted / disconnected vertices detected'})</span>`;
      }
      if (checkSub) {
        checkSub.className = `checklist-item ${r2Pass ? 'pass' : 'fail'}`;
        checkSub.innerHTML = `<span>${r2Pass ? '✓' : '✗'}</span> <span>Rule 2: Valid subgraph of G (${r2Pass ? 'Pure subgraph of original edges' : 'No active edges'})</span>`;
      }
      if (checkE) {
        checkE.className = `checklist-item ${r3Pass ? 'pass' : 'fail'}`;
        checkE.innerHTML = `<span>${r3Pass ? '✓' : '✗'}</span> <span>Rule 3: Exactly |V| - 1 edges selected (${currE} / ${targetE} edges)</span>`;
      }
      if (checkC) {
        checkC.className = `checklist-item ${r4Pass ? 'pass' : 'fail'}`;
        checkC.innerHTML = `<span>${r4Pass ? '✓' : '✗'}</span> <span>Rule 4: Single connected component & zero cycles (BFS/DFS verified)</span>`;
      }

      banner.classList.remove('hidden');
    },

    hideFeedback() {
      const banner = document.getElementById('foundations-feedback-banner');
      if (banner) banner.classList.add('hidden');
    },

    /* ══════════════════════════════════════════════════════════════════
       CANVAS RENDERING (FOUNDATIONS PLAYGROUND)
       ══════════════════════════════════════════════════════════════════ */
    draw() {
      if (!this.ctx || !this.canvas || !this.graph) return;
      const width = this.canvas.width / this.dpr;
      const height = this.canvas.height / this.dpr;
      const isDark = ThemeManager.isDark();

      this.ctx.clearRect(0, 0, width, height);
      this.ctx.fillStyle = isDark ? '#16213E' : '#FFFFFF';
      this.ctx.fillRect(0, 0, width, height);

      // Subtle background dot grid
      this.ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
      const gridSize = 28;
      for (let x = 14; x < width; x += gridSize) {
        for (let y = 14; y < height; y += gridSize) {
          this.ctx.beginPath();
          this.ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }

      // Draw Edges
      this.graph.edges.forEach(edge => {
        const uNode = this.graph.nodes.find(n => n.id === edge.u);
        const vNode = this.graph.nodes.find(n => n.id === edge.v);
        if (!uNode || !vNode) return;

        const pU = this.getNodePos(uNode);
        const pV = this.getNodePos(vNode);

        const isSelected = this.selectedEdgeIds.has(edge.id);
        const isHovered = this.hoveredEdge && this.hoveredEdge.id === edge.id;
        const isCycle = this.flashingCycleEdges.has(edge.id);

        let stroke = isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.35)';
        let lineWidth = 2;
        let isDashed = !isSelected;

        if (isCycle) {
          stroke = '#EA4335'; // Red for cycle error
          lineWidth = 6;
          isDashed = false;
        } else if (isSelected) {
          stroke = isDark ? '#4ADE80' : '#34A853'; // Emerald green
          lineWidth = 5;
          isDashed = false;
        } else if (isHovered) {
          stroke = '#4285F4'; // Blue hover
          lineWidth = 3.5;
          isDashed = true;
        }

        this.ctx.save();
        this.ctx.strokeStyle = stroke;
        this.ctx.lineWidth = lineWidth;
        if (isDashed) {
          this.ctx.setLineDash([6, 6]);
        } else {
          this.ctx.setLineDash([]);
        }

        this.ctx.beginPath();
        this.ctx.moveTo(pU.x, pU.y);
        this.ctx.lineTo(pV.x, pV.y);
        this.ctx.stroke();
        this.ctx.restore();

        // Edge Weight Pill
        const midX = (pU.x + pV.x) / 2;
        const midY = (pU.y + pV.y) / 2;

        this.ctx.save();
        this.ctx.font = 'bold 12px Roboto Mono, Consolas, monospace';
        const weightText = isSelected ? `✓ ${edge.weight}` : String(edge.weight);
        const textWidth = this.ctx.measureText(weightText).width;
        const pillW = textWidth + 14;
        const pillH = 20;

        // Pill background
        if (isCycle) {
          this.ctx.fillStyle = '#EA4335';
          this.ctx.strokeStyle = '#B71C1C';
        } else if (isSelected) {
          this.ctx.fillStyle = isDark ? '#14532D' : '#E8F5E9';
          this.ctx.strokeStyle = isDark ? '#4ADE80' : '#34A853';
        } else {
          this.ctx.fillStyle = isDark ? '#1E293B' : '#FFFFFF';
          this.ctx.strokeStyle = isHovered ? '#4285F4' : stroke;
        }

        this.ctx.lineWidth = isSelected || isHovered || isCycle ? 2 : 1;
        this.ctx.beginPath();
        this.ctx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, 10);
        this.ctx.fill();
        this.ctx.stroke();

        // Pill text
        if (isCycle) {
          this.ctx.fillStyle = '#FFFFFF';
        } else if (isSelected) {
          this.ctx.fillStyle = isDark ? '#86EFAC' : '#1B5E20';
        } else {
          this.ctx.fillStyle = isDark ? '#F8FAFC' : '#1E293B';
        }

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(weightText, midX, midY + 0.5);
        this.ctx.restore();
      });

      // Draw Nodes
      const radius = 22;
      this.graph.nodes.forEach(node => {
        const p = this.getNodePos(node);
        const isCycleNode = this.highlightedCycleNodes.has(node.id);
        const isUnreached = this.highlightedUnreachedNodes.has(node.id);

        this.ctx.save();
        let fill = isDark ? '#1E293B' : '#FFFFFF';
        let stroke = isDark ? '#60A5FA' : '#4285F4';
        let strokeWidth = 2.5;

        if (isCycleNode) {
          stroke = '#EA4335';
          strokeWidth = 4;
          fill = isDark ? 'rgba(234, 67, 53, 0.25)' : '#FFEBEE';
        } else if (isUnreached) {
          stroke = '#FBBC05';
          strokeWidth = 3.5;
          fill = isDark ? 'rgba(251, 188, 5, 0.25)' : '#FFF8E1';
        }

        this.ctx.fillStyle = fill;
        this.ctx.strokeStyle = stroke;
        this.ctx.lineWidth = strokeWidth;

        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Node Label
        this.ctx.font = 'bold 14px Google Sans, Inter, sans-serif';
        this.ctx.fillStyle = isDark ? '#F8FAFC' : '#202124';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(node.label, p.x, p.y);

        this.ctx.restore();
      });
    }
  };

  /* ══════════════════════════════════════════════════════════════════
     4. MST VISUALIZER (KRUSKAL & PRIM)
     ══════════════════════════════════════════════════════════════════ */
  const MSTVisualizer = {
    canvas: null,
    ctx: null,
    dpr: 1,

    // Graph Data
    nodes: [],
    edges: [],
    nextNodeId: 1,

    // Interaction State
    mode: 'select', // 'select' | 'add-node' | 'add-edge' | 'delete'
    draggedNode: null,
    dragOffset: { x: 0, y: 0 },
    edgeStartNode: null,
    pendingEdge: null,
    currentMousePos: null,

    // Algorithm & Animation State
    algorithm: 'kruskal', // 'kruskal' | 'prim'
    startNodeId: null,
    steps: [],
    currentStepIdx: -1,
    isPlaying: false,
    playTimer: null,
    speed: 1,

    // Presets
    presets: {
      textbook: {
        nodes: [
          { id: 'A', label: 'A', x: 140, y: 120 },
          { id: 'B', label: 'B', x: 340, y: 80 },
          { id: 'C', label: 'C', x: 160, y: 300 },
          { id: 'D', label: 'D', x: 500, y: 110 },
          { id: 'E', label: 'E', x: 360, y: 330 },
          { id: 'F', label: 'F', x: 540, y: 300 }
        ],
        edges: [
          { id: 'e1', u: 'A', v: 'B', weight: 4 },
          { id: 'e2', u: 'A', v: 'C', weight: 2 },
          { id: 'e3', u: 'B', v: 'C', weight: 1 },
          { id: 'e4', u: 'B', v: 'D', weight: 5 },
          { id: 'e5', u: 'C', v: 'E', weight: 8 },
          { id: 'e6', u: 'C', v: 'D', weight: 10 },
          { id: 'e7', u: 'D', v: 'E', weight: 2 },
          { id: 'e8', u: 'D', v: 'F', weight: 6 },
          { id: 'e9', u: 'E', v: 'F', weight: 3 }
        ]
      },
      dense: {
        nodes: [
          { id: 'A', label: 'A', x: 200, y: 90 },
          { id: 'B', label: 'B', x: 440, y: 90 },
          { id: 'C', label: 'C', x: 510, y: 250 },
          { id: 'D', label: 'D', x: 320, y: 350 },
          { id: 'E', label: 'E', x: 130, y: 250 }
        ],
        edges: [
          { id: 'e1', u: 'A', v: 'B', weight: 3 },
          { id: 'e2', u: 'B', v: 'C', weight: 4 },
          { id: 'e3', u: 'C', v: 'D', weight: 5 },
          { id: 'e4', u: 'D', v: 'E', weight: 2 },
          { id: 'e5', u: 'E', v: 'A', weight: 6 },
          { id: 'e6', u: 'A', v: 'C', weight: 8 },
          { id: 'e7', u: 'A', v: 'D', weight: 7 },
          { id: 'e8', u: 'B', v: 'D', weight: 9 },
          { id: 'e9', u: 'B', v: 'E', weight: 1 },
          { id: 'e10', u: 'C', v: 'E', weight: 10 }
        ]
      },
      bridge: {
        nodes: [
          { id: 'A', label: 'A', x: 130, y: 130 },
          { id: 'B', label: 'B', x: 260, y: 100 },
          { id: 'C', label: 'C', x: 200, y: 280 },
          { id: 'D', label: 'D', x: 420, y: 100 },
          { id: 'E', label: 'E', x: 550, y: 130 },
          { id: 'F', label: 'F', x: 480, y: 280 }
        ],
        edges: [
          { id: 'e1', u: 'A', v: 'B', weight: 2 },
          { id: 'e2', u: 'B', v: 'C', weight: 3 },
          { id: 'e3', u: 'C', v: 'A', weight: 4 },
          { id: 'e4', u: 'B', v: 'D', weight: 7 }, // The Bridge
          { id: 'e5', u: 'D', v: 'E', weight: 1 },
          { id: 'e6', u: 'E', v: 'F', weight: 5 },
          { id: 'e7', u: 'F', v: 'D', weight: 2 }
        ]
      },
      cyclic: {
        nodes: [
          { id: 'A', label: 'A', x: 130, y: 90 },
          { id: 'B', label: 'B', x: 330, y: 90 },
          { id: 'C', label: 'C', x: 530, y: 90 },
          { id: 'D', label: 'D', x: 150, y: 270 },
          { id: 'E', label: 'E', x: 330, y: 270 },
          { id: 'F', label: 'F', x: 510, y: 270 },
          { id: 'G', label: 'G', x: 330, y: 370 }
        ],
        edges: [
          { id: 'e1', u: 'A', v: 'B', weight: 7 },
          { id: 'e2', u: 'B', v: 'C', weight: 8 },
          { id: 'e3', u: 'A', v: 'D', weight: 5 },
          { id: 'e4', u: 'B', v: 'E', weight: 9 },
          { id: 'e5', u: 'C', v: 'F', weight: 5 },
          { id: 'e6', u: 'D', v: 'E', weight: 15 },
          { id: 'e7', u: 'E', v: 'F', weight: 8 },
          { id: 'e8', u: 'D', v: 'G', weight: 9 },
          { id: 'e9', u: 'F', v: 'G', weight: 11 },
          { id: 'e10', u: 'B', v: 'D', weight: 7 },
          { id: 'e11', u: 'B', v: 'F', weight: 6 }
        ]
      }
    },

    init() {
      this.canvas = document.getElementById('mst-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      this.bindDOM();
      this.loadPreset('textbook');
      this.resizeCanvas();
      window.addEventListener('resize', () => {
        this.resizeCanvas();
        this.draw();
      });
    },

    bindDOM() {
      // Algorithm toggle pills
      const btnKruskal = document.getElementById('mst-algo-kruskal');
      const btnPrim = document.getElementById('mst-algo-prim');
      const primStartWrap = document.getElementById('mst-prim-start-wrap');
      const pseudoKruskal = document.getElementById('mst-pseudo-kruskal');
      const pseudoPrim = document.getElementById('mst-pseudo-prim');
      const dsuPanel = document.getElementById('mst-dsu-panel');
      const primCutPanel = document.getElementById('mst-prim-cut-panel');

      btnKruskal.addEventListener('click', () => {
        this.algorithm = 'kruskal';
        btnKruskal.classList.add('active');
        btnPrim.classList.remove('active');
        if (primStartWrap) primStartWrap.classList.add('hidden');
        if (pseudoKruskal) pseudoKruskal.classList.remove('hidden');
        if (pseudoPrim) pseudoPrim.classList.add('hidden');
        if (dsuPanel) dsuPanel.classList.remove('hidden');
        if (primCutPanel) primCutPanel.classList.add('hidden');
        this.recomputeSteps();
      });

      btnPrim.addEventListener('click', () => {
        this.algorithm = 'prim';
        btnPrim.classList.add('active');
        btnKruskal.classList.remove('active');
        if (primStartWrap) primStartWrap.classList.remove('hidden');
        if (pseudoKruskal) pseudoKruskal.classList.add('hidden');
        if (pseudoPrim) pseudoPrim.classList.remove('hidden');
        if (dsuPanel) dsuPanel.classList.add('hidden');
        if (primCutPanel) primCutPanel.classList.remove('hidden');
        this.recomputeSteps();
      });

      // Preset selector
      const presetSelect = document.getElementById('mst-preset-select');
      presetSelect.addEventListener('change', (e) => {
        this.loadPreset(e.target.value);
      });

      // Start node select for Prim
      const startNodeSelect = document.getElementById('mst-start-node');
      startNodeSelect.addEventListener('change', (e) => {
        this.startNodeId = e.target.value;
        this.recomputeSteps();
      });

      // Mode radios
      document.querySelectorAll('input[name="mst-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          this.mode = e.target.value;
          this.edgeStartNode = null;
          this.currentMousePos = null;
          this.closeEdgeModal();
          this.draw();
        });
      });

      // Playback Controls
      document.getElementById('mst-btn-play').addEventListener('click', () => this.togglePlay());
      document.getElementById('mst-btn-step-fwd').addEventListener('click', () => this.stepForward());
      document.getElementById('mst-btn-step-back').addEventListener('click', () => this.stepBackward());
      document.getElementById('mst-btn-reset').addEventListener('click', () => this.resetAnimation());

      // Speed slider
      const speedSlider = document.getElementById('mst-speed-slider');
      const speedLabel = document.getElementById('mst-speed-label');
      speedSlider.addEventListener('input', (e) => {
        this.speed = parseFloat(e.target.value);
        speedLabel.textContent = `${this.speed}×`;
        if (this.isPlaying) {
          this.pause();
          this.play();
        }
      });

      // Graph Builder: Add Node
      const btnAddNode = document.getElementById('mst-btn-add-node');
      const inputNodeName = document.getElementById('mst-input-node-name');
      btnAddNode.addEventListener('click', () => {
        this.clearBuilderError();
        let label = inputNodeName.value.trim().toUpperCase();
        if (!label) {
          label = this.getNextNodeLabel();
        }
        if (this.nodes.some(n => n.label === label)) {
          this.showBuilderError(`Node "${label}" already exists! Please use a unique label.`);
          return;
        }

        // Place node at comfortable random offset near center
        const rect = this.canvas.getBoundingClientRect();
        const cx = rect.width / 2 + (Math.random() * 160 - 80);
        const cy = rect.height / 2 + (Math.random() * 140 - 70);

        this.nodes.push({ id: label, label: label, x: cx, y: cy });
        inputNodeName.value = '';
        this.updateBuilderDropdowns();
        this.recomputeSteps();
      });

      // Graph Builder: Connect Edge with Strict Positive Weight Validation
      const btnAddEdge = document.getElementById('mst-btn-add-edge');
      const selectU = document.getElementById('mst-select-edge-u');
      const selectV = document.getElementById('mst-select-edge-v');
      const inputWeight = document.getElementById('mst-input-edge-weight');

      btnAddEdge.addEventListener('click', () => {
        this.clearBuilderError();
        const u = selectU.value;
        const v = selectV.value;
        const weightRaw = inputWeight.value.trim();

        if (!u || !v) {
          this.showBuilderError('Please select two valid nodes to connect.');
          this.showToast('Please select two valid nodes to connect.', 'error');
          return;
        }

        if (u === v) {
          this.showBuilderError('Self-loops are not allowed! Selected endpoints must be distinct.');
          this.showToast('Self-loops are not allowed! Selected endpoints must be distinct.', 'error');
          return;
        }

        // Check for duplicate edges (undirected)
        const exists = this.edges.some(e =>
          (e.u === u && e.v === v) || (e.u === v && e.v === u)
        );
        if (exists) {
          this.showBuilderError(`An edge already exists between ${u} and ${v}!`);
          this.showToast(`An edge already exists between ${u} and ${v}!`, 'error');
          return;
        }

        // Strict positive weight validation rule
        const validation = this.validateWeight(weightRaw);
        if (!validation.valid) {
          this.showBuilderError(validation.error);
          this.showToast(validation.error, 'error');
          inputWeight.focus();
          return;
        }

        const edgeId = `e_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.edges.push({ id: edgeId, u: u, v: v, weight: validation.weight });
        inputWeight.value = '';
        this.clearBuilderError();
        this.recomputeSteps();
        this.showToast(`Edge (${u}, ${v}) added with weight ${validation.weight}`, 'success');
      });

      // Edge Prompt Modal DOM bindings
      const modalCloseBtn = document.getElementById('mst-modal-close-btn');
      const modalCancelBtn = document.getElementById('mst-modal-cancel-btn');
      const modalOverlay = document.getElementById('mst-edge-modal');
      const modalForm = document.getElementById('mst-modal-form');
      const modalWeightInput = document.getElementById('mst-modal-weight-input');
      const modalWeightPreview = document.getElementById('mst-modal-weight-preview');

      if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => this.closeEdgeModal());
      if (modalCancelBtn) modalCancelBtn.addEventListener('click', () => this.closeEdgeModal());
      if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
          if (e.target === modalOverlay) this.closeEdgeModal();
        });
      }
      if (modalForm) {
        modalForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.submitEdgeModal();
        });
      }
      if (modalWeightInput) {
        modalWeightInput.addEventListener('input', (e) => {
          const val = e.target.value.trim();
          const num = parseFloat(val);
          if (modalWeightPreview) {
            modalWeightPreview.textContent = (!isNaN(num) && num > 0) ? num : '?';
          }
          if (!isNaN(num) && num > 0) {
            this.clearModalError();
          }
        });
        modalWeightInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.submitEdgeModal();
          }
        });
      }

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const modal = document.getElementById('mst-edge-modal');
          if (modal && !modal.classList.contains('hidden')) {
            this.closeEdgeModal();
          }
        }
      });

      // Graph Builder: Clear Graph
      const btnClearGraph = document.getElementById('mst-btn-clear-graph');
      btnClearGraph.addEventListener('click', () => {
        this.clearBuilderError();
        this.closeEdgeModal();
        this.nodes = [];
        this.edges = [];
        this.updateBuilderDropdowns();
        this.recomputeSteps();
      });

      // Canvas Mouse & Touch Events
      this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
      this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      this.canvas.addEventListener('mouseleave', () => {
        if (this.mode === 'add-edge' && this.edgeStartNode) {
          this.currentMousePos = null;
          this.draw();
        }
      });
      window.addEventListener('mouseup', () => this.handleMouseUp());
    },

    /* Strict Positive Weight Validator (checks empty, non-numeric, zero, negative <= 0) */
    validateWeight(weightRaw) {
      if (weightRaw === null || weightRaw === undefined) {
        return { valid: false, error: 'Edge weight must be a positive number greater than 0.' };
      }
      const str = String(weightRaw).trim();
      if (str === '') {
        return { valid: false, error: 'Edge weight must be a positive number greater than 0.' };
      }
      const num = Number(str);
      if (isNaN(num) || !isFinite(num) || num <= 0) {
        return { valid: false, error: 'Edge weight must be a positive number greater than 0.' };
      }
      return { valid: true, weight: num };
    },

    /* Notification Toasts */
    showToast(msg, type = 'error') {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      const iconSvg = type === 'error'
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;

      toast.innerHTML = `<span class="toast-icon">${iconSvg}</span><span class="toast-msg">${msg}</span>`;
      container.appendChild(toast);

      requestAnimationFrame(() => {
        toast.classList.add('toast-visible');
      });

      setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    },

    /* Edge Creation Weight Modal */
    openEdgeModal(nodeU, nodeV) {
      this.pendingEdge = { u: nodeU.id, v: nodeV.id, labelU: nodeU.label, labelV: nodeV.label };
      const modal = document.getElementById('mst-edge-modal');
      const subtitle = document.getElementById('mst-modal-subtitle');
      const nodeUBox = document.getElementById('mst-modal-node-u');
      const nodeVBox = document.getElementById('mst-modal-node-v');
      const weightPreview = document.getElementById('mst-modal-weight-preview');
      const weightInput = document.getElementById('mst-modal-weight-input');

      if (subtitle) {
        subtitle.textContent = `Enter weight for edge (e.g., between Node ${nodeU.label} and Node ${nodeV.label}):`;
      }
      if (nodeUBox) nodeUBox.textContent = nodeU.label;
      if (nodeVBox) nodeVBox.textContent = nodeV.label;
      if (weightPreview) weightPreview.textContent = '?';
      if (weightInput) weightInput.value = '';

      this.clearModalError();
      if (modal) modal.classList.remove('hidden');

      setTimeout(() => {
        if (weightInput) weightInput.focus();
      }, 50);
    },

    closeEdgeModal() {
      const modal = document.getElementById('mst-edge-modal');
      if (modal) modal.classList.add('hidden');
      this.pendingEdge = null;
      this.edgeStartNode = null;
      this.currentMousePos = null;
      this.clearModalError();
      this.draw();
    },

    showModalError(msg) {
      const errBanner = document.getElementById('mst-modal-error');
      const errText = document.getElementById('mst-modal-error-text');
      if (errBanner && errText) {
        errText.textContent = msg;
        errBanner.classList.remove('hidden');
      }
    },

    clearModalError() {
      const errBanner = document.getElementById('mst-modal-error');
      if (errBanner) {
        errBanner.classList.add('hidden');
      }
    },

    submitEdgeModal() {
      if (!this.pendingEdge) return;
      const weightInput = document.getElementById('mst-modal-weight-input');
      const raw = weightInput ? weightInput.value : '';
      const validation = this.validateWeight(raw);

      if (!validation.valid) {
        this.showModalError(validation.error);
        this.showBuilderError(validation.error);
        this.showToast(validation.error, 'error');
        if (weightInput) weightInput.focus();
        return;
      }

      const u = this.pendingEdge.u;
      const v = this.pendingEdge.v;
      const edgeId = `e_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      this.edges.push({ id: edgeId, u: u, v: v, weight: validation.weight });
      this.closeEdgeModal();
      this.clearBuilderError();
      this.recomputeSteps();
      this.showToast(`Edge (${u}, ${v}) added with weight ${validation.weight}`, 'success');
    },

    showBuilderError(msg) {
      const errBanner = document.getElementById('mst-builder-error');
      const errText = document.getElementById('mst-builder-error-text');
      if (errBanner && errText) {
        errText.textContent = msg;
        errBanner.classList.remove('hidden');
      }
    },

    clearBuilderError() {
      const errBanner = document.getElementById('mst-builder-error');
      if (errBanner) {
        errBanner.classList.add('hidden');
      }
    },

    getNextNodeLabel() {
      const existing = new Set(this.nodes.map(n => n.label));
      for (let i = 0; i < 26; i++) {
        const char = String.fromCharCode(65 + i);
        if (!existing.has(char)) return char;
      }
      return `N${this.nodes.length + 1}`;
    },

    updateBuilderDropdowns() {
      const selectU = document.getElementById('mst-select-edge-u');
      const selectV = document.getElementById('mst-select-edge-v');
      const selectStart = document.getElementById('mst-start-node');

      const html = this.nodes.map(n => `<option value="${n.id}">${n.label}</option>`).join('');
      if (selectU) selectU.innerHTML = html;
      if (selectV) {
        selectV.innerHTML = html;
        if (this.nodes.length > 1) selectV.selectedIndex = 1;
      }
      if (selectStart) {
        selectStart.innerHTML = html;
        if (this.startNodeId && this.nodes.some(n => n.id === this.startNodeId)) {
          selectStart.value = this.startNodeId;
        } else if (this.nodes.length > 0) {
          this.startNodeId = this.nodes[0].id;
          selectStart.value = this.startNodeId;
        }
      }
    },

    loadPreset(presetKey) {
      const data = this.presets[presetKey];
      if (!data) return;

      this.closeEdgeModal();
      this.nodes = JSON.parse(JSON.stringify(data.nodes));
      this.edges = JSON.parse(JSON.stringify(data.edges));
      this.startNodeId = this.nodes.length > 0 ? this.nodes[0].id : null;
      this.clearBuilderError();
      this.updateBuilderDropdowns();
      this.recomputeSteps();
    },

    resizeCanvas() {
      if (!this.canvas) return;
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = Math.max(440, rect.height || 440);

      this.canvas.width = width * this.dpr;
      this.canvas.height = height * this.dpr;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;

      this.ctx.resetTransform();
      this.ctx.scale(this.dpr, this.dpr);
    },

    /* ─── Canvas Interaction Handling ─── */
    getPointerPos(e) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    },

    getNodeAtPos(pos) {
      const radius = 24;
      for (let i = this.nodes.length - 1; i >= 0; i--) {
        const node = this.nodes[i];
        const dist = Math.hypot(node.x - pos.x, node.y - pos.y);
        if (dist <= radius) return node;
      }
      return null;
    },

    getEdgeAtPos(pos) {
      for (const edge of this.edges) {
        const uNode = this.nodes.find(n => n.id === edge.u);
        const vNode = this.nodes.find(n => n.id === edge.v);
        if (!uNode || !vNode) continue;

        const dist = this.distToSegment(pos.x, pos.y, uNode.x, uNode.y, vNode.x, vNode.y);
        if (dist <= 15) return edge;
      }
      return null;
    },

    distToSegment(px, py, x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    },

    handleMouseDown(e) {
      const pos = this.getPointerPos(e);
      const clickedNode = this.getNodeAtPos(pos);

      if (this.mode === 'select') {
        if (clickedNode) {
          this.draggedNode = clickedNode;
          this.dragOffset = { x: clickedNode.x - pos.x, y: clickedNode.y - pos.y };
        }
      } else if (this.mode === 'add-node') {
        if (!clickedNode) {
          const label = this.getNextNodeLabel();
          this.nodes.push({ id: label, label: label, x: pos.x, y: pos.y });
          this.updateBuilderDropdowns();
          this.recomputeSteps();
        }
      } else if (this.mode === 'add-edge') {
        if (clickedNode) {
          if (!this.edgeStartNode) {
            this.edgeStartNode = clickedNode;
          } else if (this.edgeStartNode.id === clickedNode.id) {
            // Clicked same node: cancel/deselect
            this.edgeStartNode = null;
          } else {
            const u = this.edgeStartNode.id;
            const v = clickedNode.id;
            const exists = this.edges.some(ed =>
              (ed.u === u && ed.v === v) || (ed.u === v && ed.v === u)
            );
            if (exists) {
              this.showBuilderError(`An edge already exists between ${u} and ${v}!`);
              this.showToast(`An edge already exists between ${u} and ${v}!`, 'error');
              this.edgeStartNode = null;
            } else {
              // Immediately ask or prompt them for the edge weight before adding it to the canvas
              const startNode = this.edgeStartNode;
              this.openEdgeModal(startNode, clickedNode);
            }
          }
          this.draw();
        }
      } else if (this.mode === 'delete') {
        if (clickedNode) {
          this.nodes = this.nodes.filter(n => n.id !== clickedNode.id);
          this.edges = this.edges.filter(ed => ed.u !== clickedNode.id && ed.v !== clickedNode.id);
          this.updateBuilderDropdowns();
          this.recomputeSteps();
        } else {
          const clickedEdge = this.getEdgeAtPos(pos);
          if (clickedEdge) {
            this.edges = this.edges.filter(ed => ed.id !== clickedEdge.id);
            this.recomputeSteps();
          }
        }
      }
    },

    handleMouseMove(e) {
      const pos = this.getPointerPos(e);
      this.currentMousePos = pos;
      if (this.mode === 'select' && this.draggedNode) {
        const rect = this.canvas.getBoundingClientRect();
        this.draggedNode.x = Math.max(26, Math.min(rect.width - 26, pos.x + this.dragOffset.x));
        this.draggedNode.y = Math.max(26, Math.min(rect.height - 26, pos.y + this.dragOffset.y));
        this.draw();
      } else if (this.mode === 'add-edge' && this.edgeStartNode) {
        this.draw();
      }
    },

    handleMouseUp() {
      this.draggedNode = null;
    },

    /* ─── Algorithm Simulation & Steps Generation ─── */
    recomputeSteps() {
      this.pause();
      this.steps = [];

      if (this.nodes.length === 0) {
        this.currentStepIdx = -1;
        this.updateUI();
        this.draw();
        return;
      }

      if (this.algorithm === 'kruskal') {
        this.computeKruskalSteps();
      } else {
        this.computePrimSteps();
      }

      this.currentStepIdx = 0;
      this.updateUI();
      this.draw();
    },

    computeKruskalSteps() {
      const nodeIds = this.nodes.map(n => n.id);
      const dsu = new DisjointSet(nodeIds);

      // Sort edges ascending by weight
      const sortedEdges = [...this.edges].sort((a, b) => a.weight - b.weight);

      // Step 0: Initialization
      this.steps.push({
        type: 'init',
        pseudoLine: 2,
        narrationTag: 'Init',
        narration: `Kruskal initialized: |V| = ${this.nodes.length} isolated components, ${sortedEdges.length} sorted edges.`,
        mstEdges: [],
        rejectedEdges: [],
        examiningEdge: null,
        dsuGroups: dsu.getGroups(nodeIds),
        edgeStatuses: sortedEdges.map(e => ({ edge: e, status: 'pending' })),
        totalWeight: 0
      });

      const currentMstEdges = [];
      const currentRejected = [];
      let totalWeight = 0;

      for (let i = 0; i < sortedEdges.length; i++) {
        const edge = sortedEdges[i];

        // Step: Examining edge
        this.steps.push({
          type: 'examining',
          pseudoLine: 4,
          narrationTag: 'Evaluating',
          narration: `Examining minimum edge (${edge.u}, ${edge.v}) with weight ${edge.weight}. Checking if endpoints share the same set.`,
          mstEdges: [...currentMstEdges],
          rejectedEdges: [...currentRejected],
          examiningEdge: edge,
          dsuGroups: dsu.getGroups(nodeIds),
          edgeStatuses: sortedEdges.map((e, idx) => ({
            edge: e,
            status: idx < i ? (currentMstEdges.includes(e) ? 'accepted' : 'rejected') : (idx === i ? 'examining' : 'pending')
          })),
          totalWeight: totalWeight
        });

        const rootU = dsu.find(edge.u);
        const rootV = dsu.find(edge.v);

        if (rootU !== rootV) {
          // Accept edge
          dsu.union(edge.u, edge.v);
          currentMstEdges.push(edge);
          totalWeight += edge.weight;

          this.steps.push({
            type: 'accept',
            pseudoLine: 6,
            narrationTag: 'Accepted',
            narration: `Accepted edge (${edge.u}, ${edge.v}) [weight ${edge.weight}]. Sets merged successfully without forming a cycle.`,
            mstEdges: [...currentMstEdges],
            rejectedEdges: [...currentRejected],
            examiningEdge: null,
            dsuGroups: dsu.getGroups(nodeIds),
            edgeStatuses: sortedEdges.map((e, idx) => ({
              edge: e,
              status: idx <= i ? (currentMstEdges.includes(e) ? 'accepted' : 'rejected') : 'pending'
            })),
            totalWeight: totalWeight
          });

          // Early termination if we already have V-1 edges
          if (currentMstEdges.length === this.nodes.length - 1) {
            break;
          }
        } else {
          // Cycle detected: Reject
          currentRejected.push(edge);
          this.steps.push({
            type: 'reject',
            pseudoLine: 9,
            narrationTag: 'Cycle Rejected',
            narration: `Rejected edge (${edge.u}, ${edge.v}) [weight ${edge.weight}]. Both vertices already belong to the same component (forms a cycle)!`,
            mstEdges: [...currentMstEdges],
            rejectedEdges: [...currentRejected],
            examiningEdge: null,
            dsuGroups: dsu.getGroups(nodeIds),
            edgeStatuses: sortedEdges.map((e, idx) => ({
              edge: e,
              status: idx <= i ? (currentMstEdges.includes(e) ? 'accepted' : 'rejected') : 'pending'
            })),
            totalWeight: totalWeight
          });
        }
      }

      // Final Step
      this.steps.push({
        type: 'finished',
        pseudoLine: 11,
        narrationTag: 'Completed',
        narration: `Kruskal's Algorithm Completed! MST constructed with ${currentMstEdges.length} edges and total weight ${totalWeight}.`,
        mstEdges: [...currentMstEdges],
        rejectedEdges: [...currentRejected],
        examiningEdge: null,
        dsuGroups: dsu.getGroups(nodeIds),
        edgeStatuses: sortedEdges.map(e => ({
          edge: e,
          status: currentMstEdges.includes(e) ? 'accepted' : (currentRejected.includes(e) ? 'rejected' : 'unused')
        })),
        totalWeight: totalWeight
      });
    },

    computePrimSteps() {
      const startId = this.startNodeId || (this.nodes[0] ? this.nodes[0].id : null);
      if (!startId) return;

      const visited = new Set([startId]);
      const currentMstEdges = [];
      const currentRejected = [];
      let totalWeight = 0;

      // Candidate edges queue crossing the cut
      const getCutEdges = () => {
        const cut = [];
        this.edges.forEach(e => {
          const uIn = visited.has(e.u);
          const vIn = visited.has(e.v);
          if ((uIn && !vIn) || (!uIn && vIn)) {
            cut.push(e);
          }
        });
        return cut.sort((a, b) => a.weight - b.weight);
      };

      // Step 0: Init
      this.steps.push({
        type: 'init',
        pseudoLine: 2,
        narrationTag: 'Init',
        narration: `Prim initialized starting at vertex ${startId}. Cut S = {${startId}}, V \\ S = {${this.nodes.filter(n => n.id !== startId).map(n => n.id).join(', ')}}.`,
        mstEdges: [],
        rejectedEdges: [],
        examiningEdge: null,
        visitedSet: new Set(visited),
        cutEdges: getCutEdges(),
        totalWeight: 0
      });

      while (visited.size < this.nodes.length) {
        const cutEdges = getCutEdges();
        if (cutEdges.length === 0) {
          // Disconnected graph
          break;
        }

        const minEdge = cutEdges[0];

        // Step: Examining min cut edge
        this.steps.push({
          type: 'examining',
          pseudoLine: 5,
          narrationTag: 'ExtractMin',
          narration: `Extracted minimum cut edge (${minEdge.u}, ${minEdge.v}) with weight ${minEdge.weight} from priority queue.`,
          mstEdges: [...currentMstEdges],
          rejectedEdges: [...currentRejected],
          examiningEdge: minEdge,
          visitedSet: new Set(visited),
          cutEdges: [...cutEdges],
          totalWeight: totalWeight
        });

        // Add edge and new node
        currentMstEdges.push(minEdge);
        totalWeight += minEdge.weight;
        const newNodeId = visited.has(minEdge.u) ? minEdge.v : minEdge.u;
        visited.add(newNodeId);

        // Step: Accept
        this.steps.push({
          type: 'accept',
          pseudoLine: 8,
          narrationTag: 'Accepted',
          narration: `Added vertex ${newNodeId} to visited tree set S. Edge (${minEdge.u}, ${minEdge.v}) [weight ${minEdge.weight}] added to MST.`,
          mstEdges: [...currentMstEdges],
          rejectedEdges: [...currentRejected],
          examiningEdge: null,
          visitedSet: new Set(visited),
          cutEdges: getCutEdges(),
          totalWeight: totalWeight
        });
      }

      // Final Step
      this.steps.push({
        type: 'finished',
        pseudoLine: 11,
        narrationTag: 'Completed',
        narration: `Prim's Algorithm Completed! Visited all reachable vertices. MST has ${currentMstEdges.length} edges, total weight ${totalWeight}.`,
        mstEdges: [...currentMstEdges],
        rejectedEdges: [...currentRejected],
        examiningEdge: null,
        visitedSet: new Set(visited),
        cutEdges: [],
        totalWeight: totalWeight
      });
    },

    /* ─── Playback Controls ─── */
    play() {
      if (this.isPlaying) return;
      this.isPlaying = true;
      const playBtn = document.getElementById('mst-btn-play');
      if (playBtn) {
        playBtn.innerHTML = `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        `;
      }

      const loop = () => {
        if (!this.isPlaying) return;
        if (this.currentStepIdx < this.steps.length - 1) {
          this.stepForward();
          const delay = Math.max(250, 1200 / this.speed);
          this.playTimer = setTimeout(loop, delay);
        } else {
          this.pause();
        }
      };

      loop();
    },

    pause() {
      this.isPlaying = false;
      if (this.playTimer) {
        clearTimeout(this.playTimer);
        this.playTimer = null;
      }
      const playBtn = document.getElementById('mst-btn-play');
      if (playBtn) {
        playBtn.innerHTML = `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        `;
      }
    },

    togglePlay() {
      if (this.isPlaying) {
        this.pause();
      } else {
        if (this.currentStepIdx >= this.steps.length - 1) {
          this.currentStepIdx = 0;
        }
        this.play();
      }
    },

    stepForward() {
      if (this.currentStepIdx < this.steps.length - 1) {
        this.currentStepIdx++;
        this.updateUI();
        this.draw();
      }
    },

    stepBackward() {
      if (this.currentStepIdx > 0) {
        this.currentStepIdx--;
        this.updateUI();
        this.draw();
      }
    },

    resetAnimation() {
      this.pause();
      this.currentStepIdx = 0;
      this.updateUI();
      this.draw();
    },

    /* ─── Live UI, Pseudocode & Analytics Update ─── */
    updateUI() {
      // Summary stats & Kirchhoff Theorem total trees counter
      const statV = document.getElementById('mst-stat-v');
      const statE = document.getElementById('mst-stat-e');
      const statTotalTrees = document.getElementById('mst-stat-total-trees');
      const statMstEdges = document.getElementById('mst-stat-mst-edges');
      const statWeight = document.getElementById('mst-stat-weight');
      const statRejections = document.getElementById('mst-stat-rejections');

      if (statV) statV.textContent = this.nodes.length;
      if (statE) statE.textContent = this.edges.length;

      // Real-time Kirchhoff's Matrix Tree Theorem recalculation
      const totalTrees = calculateTotalSpanningTrees(this.nodes, this.edges);
      if (statTotalTrees) statTotalTrees.textContent = totalTrees.toLocaleString();

      const step = this.steps[this.currentStepIdx];
      if (!step) {
        if (statMstEdges) statMstEdges.textContent = `0 / ${Math.max(0, this.nodes.length - 1)}`;
        if (statWeight) statWeight.textContent = '0';
        if (statRejections) statRejections.textContent = '0';
        return;
      }

      // 1. Narration
      const narTag = document.getElementById('mst-narration-tag');
      const narText = document.getElementById('mst-narration-text');
      if (narTag) narTag.textContent = step.narrationTag;
      if (narText) narText.textContent = step.narration;

      // 2. Summary stats
      if (statMstEdges) statMstEdges.textContent = `${step.mstEdges.length} / ${Math.max(0, this.nodes.length - 1)}`;
      if (statWeight) statWeight.textContent = step.totalWeight;
      if (statRejections) statRejections.textContent = step.rejectedEdges.length;

      // 3. Side-by-side Pseudocode line highlighting
      this.highlightPseudocode(step.pseudoLine, step.type);

      // 4. Algorithm Specific Analytics
      if (this.algorithm === 'kruskal') {
        this.updateKruskalAnalytics(step);
      } else {
        this.updatePrimAnalytics(step);
      }
    },

    highlightPseudocode(lineNum, stepType) {
      const activePseudoId = this.algorithm === 'kruskal' ? 'mst-pseudo-kruskal' : 'mst-pseudo-prim';
      const container = document.getElementById(activePseudoId);
      if (!container) return;

      container.querySelectorAll('.pseudo-line').forEach(el => {
        el.classList.remove('active', 'active-accept', 'active-reject');
      });

      if (!lineNum) return;
      const targetLine = container.querySelector(`.pseudo-line[data-line="${lineNum}"]`);
      if (targetLine) {
        if (stepType === 'accept') {
          targetLine.classList.add('active-accept');
        } else if (stepType === 'reject') {
          targetLine.classList.add('active-reject');
        } else {
          targetLine.classList.add('active');
        }
      }
    },

    updateKruskalAnalytics(step) {
      // DSU Sets
      const dsuContainer = document.getElementById('mst-dsu-sets');
      if (dsuContainer && step.dsuGroups) {
        dsuContainer.innerHTML = step.dsuGroups.map(group =>
          `<div class="dsu-set-chip">{ ${group.join(', ')} }</div>`
        ).join('');
      }

      // Edge queue table
      const tbody = document.getElementById('mst-edge-queue-body');
      if (tbody && step.edgeStatuses) {
        tbody.innerHTML = step.edgeStatuses.map(item => `
          <tr class="${item.status}">
            <td>(${item.edge.u}, ${item.edge.v})</td>
            <td>${item.edge.weight}</td>
            <td><span class="status-badge status-${item.status}">${item.status.toUpperCase()}</span></td>
          </tr>
        `).join('');
      }
    },

    updatePrimAnalytics(step) {
      const treeNodesDiv = document.getElementById('mst-prim-tree-nodes');
      const nontreeNodesDiv = document.getElementById('mst-prim-nontree-nodes');
      const queueDiv = document.getElementById('mst-prim-queue');

      if (step.visitedSet) {
        const visitedArr = Array.from(step.visitedSet);
        const nonVisitedArr = this.nodes.filter(n => !step.visitedSet.has(n.id)).map(n => n.id);

        if (treeNodesDiv) treeNodesDiv.textContent = `{ ${visitedArr.join(', ') || '∅'} }`;
        if (nontreeNodesDiv) nontreeNodesDiv.textContent = `{ ${nonVisitedArr.join(', ') || '∅'} }`;
      }

      if (queueDiv && step.cutEdges) {
        queueDiv.innerHTML = step.cutEdges.map((e, idx) => `
          <div class="cut-edge-chip ${idx === 0 ? 'min-candidate' : ''}">
            (${e.u}, ${e.v}) <strong>w=${e.weight}</strong>
          </div>
        `).join('') || '<span style="font-size:12px; color:var(--text-tertiary); font-style:italic;">No edges crossing the cut.</span>';
      }
    },

    /* ─── Canvas Rendering ─── */
    draw() {
      if (!this.ctx || !this.canvas) return;
      const width = this.canvas.width / this.dpr;
      const height = this.canvas.height / this.dpr;
      const isDark = ThemeManager.isDark();

      // Clear Canvas Background
      this.ctx.clearRect(0, 0, width, height);
      this.ctx.fillStyle = isDark ? '#16213E' : '#FFFFFF';
      this.ctx.fillRect(0, 0, width, height);

      // Subtle Background Grid Dots
      this.ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
      const gridSize = 28;
      for (let x = 14; x < width; x += gridSize) {
        for (let y = 14; y < height; y += gridSize) {
          this.ctx.beginPath();
          this.ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }

      const step = this.steps[this.currentStepIdx] || {
        mstEdges: [],
        rejectedEdges: [],
        examiningEdge: null,
        visitedSet: new Set()
      };

      const mstEdgeIds = new Set(step.mstEdges.map(e => e.id));
      const rejectedEdgeIds = new Set(step.rejectedEdges.map(e => e.id));
      const examiningEdgeId = step.examiningEdge ? step.examiningEdge.id : null;

      // Dynamic rubberband guide line in add-edge mode
      if (this.mode === 'add-edge' && this.edgeStartNode && this.currentMousePos) {
        this.ctx.save();
        this.ctx.strokeStyle = '#FBBC05';
        this.ctx.lineWidth = 2.5;
        this.ctx.setLineDash([6, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.edgeStartNode.x, this.edgeStartNode.y);
        this.ctx.lineTo(this.currentMousePos.x, this.currentMousePos.y);
        this.ctx.stroke();
        this.ctx.restore();
      }

      // Draw Edges
      this.edges.forEach(edge => {
        const uNode = this.nodes.find(n => n.id === edge.u);
        const vNode = this.nodes.find(n => n.id === edge.v);
        if (!uNode || !vNode) return;

        let strokeColor = isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.4)';
        let lineWidth = 2.5;
        let isDashed = false;

        if (edge.id === examiningEdgeId) {
          strokeColor = '#FBBC05'; // Yellow examining
          lineWidth = 5;
        } else if (mstEdgeIds.has(edge.id)) {
          strokeColor = '#34A853'; // Green MST
          lineWidth = 4.5;
        } else if (rejectedEdgeIds.has(edge.id)) {
          strokeColor = '#EA4335'; // Red cycle
          lineWidth = 2.5;
          isDashed = true;
        }

        this.ctx.save();
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        if (isDashed) this.ctx.setLineDash([6, 5]);

        this.ctx.beginPath();
        this.ctx.moveTo(uNode.x, uNode.y);
        this.ctx.lineTo(vNode.x, vNode.y);
        this.ctx.stroke();
        this.ctx.restore();

        // Edge Weight Pill
        const midX = (uNode.x + vNode.x) / 2;
        const midY = (uNode.y + vNode.y) / 2;

        this.ctx.save();
        this.ctx.font = 'bold 12px Roboto Mono, Consolas, monospace';
        const weightText = String(edge.weight);
        const textWidth = this.ctx.measureText(weightText).width;
        const pillW = textWidth + 14;
        const pillH = 20;

        // Pill background
        this.ctx.fillStyle = isDark ? '#1E293B' : '#FFFFFF';
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = edge.id === examiningEdgeId || mstEdgeIds.has(edge.id) ? 2 : 1;
        this.ctx.beginPath();
        this.ctx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, 10);
        this.ctx.fill();
        this.ctx.stroke();

        // Pill Text
        this.ctx.fillStyle = isDark ? '#F8FAFC' : '#1E293B';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(weightText, midX, midY + 0.5);
        this.ctx.restore();
      });

      // Draw Nodes
      const radius = 22;
      this.nodes.forEach(node => {
        const isTreeVisited = this.algorithm === 'prim' && step.visitedSet && step.visitedSet.has(node.id);
        const isSelectedStart = this.algorithm === 'prim' && this.startNodeId === node.id;

        this.ctx.save();

        // Node Glow if active in Prim or Dragged
        if (node === this.draggedNode) {
          this.ctx.shadowColor = '#4285F4';
          this.ctx.shadowBlur = 12;
        }

        // Fill color
        let fill = isDark ? '#1E293B' : '#FFFFFF';
        let stroke = isDark ? '#60A5FA' : '#4285F4';

        if (isTreeVisited) {
          fill = isDark ? '#1B5E20' : '#E8F5E9';
          stroke = '#34A853';
        }

        if (node === this.edgeStartNode) {
          stroke = '#FBBC05';
        }

        this.ctx.fillStyle = fill;
        this.ctx.strokeStyle = stroke;
        this.ctx.lineWidth = isSelectedStart || isTreeVisited ? 3.5 : 2.5;

        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Node Label
        this.ctx.font = 'bold 14px Google Sans, Inter, sans-serif';
        this.ctx.fillStyle = isDark ? '#F8FAFC' : '#202124';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(node.label, node.x, node.y);

        this.ctx.restore();
      });
    }
  };

  /* ══════════════════════════════════════════════════════════════════
     5. FULLY INTERACTIVE EDGE-TAPPING PRACTICE ARENA
     ══════════════════════════════════════════════════════════════════ */
  const MSTPracticeArena = {
    canvas: null,
    ctx: null,
    dpr: 1,

    mode: 'kruskal', // 'kruskal' | 'prim'
    currentGraphIdx: 0,
    graph: null,

    // Student Interaction State
    studentMstEdges: [],
    visitedNodes: new Set(),
    hoveredEdge: null,
    mistakesCount: 0,
    isCompleted: false,

    // Flash Feedback animation
    flashingEdge: null,
    flashColor: null,
    flashTimer: null,

    // Preset Graphs
    presetGraphs: [
      {
        name: 'Graph 1: 5 Nodes (Intro Cycles)',
        nodes: [
          { id: 'A', label: 'A', x: 180, y: 90 },
          { id: 'B', label: 'B', x: 420, y: 90 },
          { id: 'C', label: 'C', x: 500, y: 240 },
          { id: 'D', label: 'D', x: 300, y: 340 },
          { id: 'E', label: 'E', x: 110, y: 240 }
        ],
        edges: [
          { id: 'pe1', u: 'A', v: 'B', weight: 2 },
          { id: 'pe2', u: 'B', v: 'C', weight: 3 },
          { id: 'pe3', u: 'C', v: 'D', weight: 1 },
          { id: 'pe4', u: 'D', v: 'E', weight: 4 },
          { id: 'pe5', u: 'E', v: 'A', weight: 5 },
          { id: 'pe6', u: 'A', v: 'C', weight: 6 },
          { id: 'pe7', u: 'B', v: 'D', weight: 7 }
        ]
      },
      {
        name: 'Graph 2: 6 Nodes (Classic Textbook)',
        nodes: [
          { id: 'A', label: 'A', x: 130, y: 110 },
          { id: 'B', label: 'B', x: 310, y: 80 },
          { id: 'C', label: 'C', x: 140, y: 280 },
          { id: 'D', label: 'D', x: 480, y: 110 },
          { id: 'E', label: 'E', x: 330, y: 310 },
          { id: 'F', label: 'F', x: 510, y: 280 }
        ],
        edges: [
          { id: 'pe1', u: 'A', v: 'B', weight: 3 },
          { id: 'pe2', u: 'A', v: 'C', weight: 1 },
          { id: 'pe3', u: 'B', v: 'C', weight: 4 },
          { id: 'pe4', u: 'B', v: 'D', weight: 6 },
          { id: 'pe5', u: 'C', v: 'E', weight: 5 },
          { id: 'pe6', u: 'D', v: 'E', weight: 2 },
          { id: 'pe7', u: 'D', v: 'F', weight: 7 },
          { id: 'pe8', u: 'E', v: 'F', weight: 2 },
          { id: 'pe9', u: 'C', v: 'D', weight: 8 }
        ]
      },
      {
        name: 'Graph 3: 7 Nodes (Complex Grid & Bridge)',
        nodes: [
          { id: 'A', label: 'A', x: 110, y: 90 },
          { id: 'B', label: 'B', x: 280, y: 90 },
          { id: 'C', label: 'C', x: 460, y: 90 },
          { id: 'D', label: 'D', x: 130, y: 260 },
          { id: 'E', label: 'E', x: 280, y: 260 },
          { id: 'F', label: 'F', x: 440, y: 260 },
          { id: 'G', label: 'G', x: 280, y: 360 }
        ],
        edges: [
          { id: 'pe1', u: 'A', v: 'B', weight: 2 },
          { id: 'pe2', u: 'B', v: 'C', weight: 5 },
          { id: 'pe3', u: 'A', v: 'D', weight: 4 },
          { id: 'pe4', u: 'B', v: 'E', weight: 3 },
          { id: 'pe5', u: 'C', v: 'F', weight: 2 },
          { id: 'pe6', u: 'D', v: 'E', weight: 6 },
          { id: 'pe7', u: 'E', v: 'F', weight: 4 },
          { id: 'pe8', u: 'D', v: 'G', weight: 1 },
          { id: 'pe9', u: 'F', v: 'G', weight: 3 },
          { id: 'pe10', u: 'B', v: 'D', weight: 8 },
          { id: 'pe11', u: 'B', v: 'F', weight: 7 }
        ]
      }
    ],

    // Persistent Player Stats
    stats: {
      solved: 0,
      streak: 0,
      mistakes: 0,
      xp: 0
    },

    init() {
      this.canvas = document.getElementById('arena-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      this.loadPlayerStats();
      this.bindDOM();
      this.loadGraph(0);
      this.resizeCanvas();

      window.addEventListener('resize', () => {
        this.resizeCanvas();
        this.draw();
      });
    },

    loadPlayerStats() {
      try {
        const saved = localStorage.getItem('mst_arena_stats');
        if (saved) {
          this.stats = { ...this.stats, ...JSON.parse(saved) };
        }
      } catch (e) { }
      this.updateScoreboard();
    },

    savePlayerStats() {
      try {
        localStorage.setItem('mst_arena_stats', JSON.stringify(this.stats));
      } catch (e) { }
      this.updateScoreboard();
    },

    updateScoreboard() {
      const elSolved = document.getElementById('arena-stat-solved');
      const elStreak = document.getElementById('arena-stat-streak');
      const elMistakes = document.getElementById('arena-stat-mistakes');
      const elXp = document.getElementById('arena-stat-xp');

      if (elSolved) elSolved.textContent = this.stats.solved;
      if (elStreak) elStreak.textContent = `${this.stats.streak} 🔥`;
      if (elMistakes) elMistakes.textContent = this.stats.mistakes;
      if (elXp) elXp.textContent = `${this.stats.xp} XP`;
    },

    bindDOM() {
      // Mode toggle
      const btnKruskal = document.getElementById('arena-mode-kruskal');
      const btnPrim = document.getElementById('arena-mode-prim');
      const primVisitedDisp = document.getElementById('arena-prim-visited-display');
      const topicBadge = document.getElementById('arena-topic-badge');

      btnKruskal.addEventListener('click', () => {
        this.mode = 'kruskal';
        btnKruskal.classList.add('active');
        btnPrim.classList.remove('active');
        if (primVisitedDisp) primVisitedDisp.classList.add('hidden');
        if (topicBadge) topicBadge.textContent = "Kruskal's Greedy Order";
        this.resetAttempt();
      });

      btnPrim.addEventListener('click', () => {
        this.mode = 'prim';
        btnPrim.classList.add('active');
        btnKruskal.classList.remove('active');
        if (primVisitedDisp) primVisitedDisp.classList.remove('hidden');
        if (topicBadge) topicBadge.textContent = "Prim's Cut-Crossing Order";
        this.resetAttempt();
      });

      // Graph preset dropdown
      const graphSelect = document.getElementById('arena-graph-select');
      graphSelect.addEventListener('change', (e) => {
        if (e.target.value === 'random') {
          this.loadRandomGraph();
        } else {
          this.loadGraph(parseInt(e.target.value, 10));
        }
      });

      // New challenge button
      document.getElementById('arena-btn-new-challenge').addEventListener('click', () => {
        this.loadRandomGraph();
      });

      // Action buttons
      document.getElementById('arena-btn-validate').addEventListener('click', () => this.validateMst());
      document.getElementById('arena-btn-undo').addEventListener('click', () => this.undoLastEdge());
      document.getElementById('arena-btn-reset').addEventListener('click', () => this.resetAttempt());

      // Canvas Interaction
      this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      this.canvas.addEventListener('mouseleave', () => {
        this.hoveredEdge = null;
        this.draw();
      });
      this.canvas.addEventListener('click', (e) => this.handleClick(e));
    },

    loadGraph(idx) {
      this.currentGraphIdx = idx;
      this.graph = JSON.parse(JSON.stringify(this.presetGraphs[idx]));
      this.resetAttempt();
    },

    loadRandomGraph() {
      let nextIdx = Math.floor(Math.random() * this.presetGraphs.length);
      if (nextIdx === this.currentGraphIdx && this.presetGraphs.length > 1) {
        nextIdx = (nextIdx + 1) % this.presetGraphs.length;
      }
      const graphSelect = document.getElementById('arena-graph-select');
      if (graphSelect) graphSelect.value = String(nextIdx);
      this.loadGraph(nextIdx);
    },

    resetAttempt() {
      this.studentMstEdges = [];
      this.hoveredEdge = null;
      this.isCompleted = false;

      // In Prim mode, initialize with first node
      if (this.mode === 'prim' && this.graph && this.graph.nodes.length > 0) {
        this.visitedNodes = new Set([this.graph.nodes[0].id]);
      } else {
        this.visitedNodes = new Set();
      }

      this.hideFeedback();
      this.updateProgressUI();
      this.draw();
    },

    undoLastEdge() {
      if (this.studentMstEdges.length === 0) return;
      this.studentMstEdges.pop();
      this.isCompleted = false;

      // Reconstruct visited set for Prim
      if (this.mode === 'prim' && this.graph && this.graph.nodes.length > 0) {
        this.visitedNodes = new Set([this.graph.nodes[0].id]);
        this.studentMstEdges.forEach(e => {
          this.visitedNodes.add(e.u);
          this.visitedNodes.add(e.v);
        });
      }

      this.hideFeedback();
      this.updateProgressUI();
      this.draw();
    },

    resizeCanvas() {
      if (!this.canvas) return;
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = Math.max(400, rect.height || 400);

      this.canvas.width = width * this.dpr;
      this.canvas.height = height * this.dpr;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;

      this.ctx.resetTransform();
      this.ctx.scale(this.dpr, this.dpr);
    },

    /* ─── Edge Tap Detection & Distance Math ─── */
    getPointerPos(e) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    },

    getEdgeAtPos(pos) {
      if (!this.graph) return null;
      for (const edge of this.graph.edges) {
        const uNode = this.graph.nodes.find(n => n.id === edge.u);
        const vNode = this.graph.nodes.find(n => n.id === edge.v);
        if (!uNode || !vNode) continue;

        // Check distance to line segment
        const dist = MSTVisualizer.distToSegment(pos.x, pos.y, uNode.x, uNode.y, vNode.x, vNode.y);
        // Also check distance to midpoint weight pill
        const midX = (uNode.x + vNode.x) / 2;
        const midY = (uNode.y + vNode.y) / 2;
        const distPill = Math.hypot(pos.x - midX, pos.y - midY);

        if (dist <= 16 || distPill <= 20) {
          return edge;
        }
      }
      return null;
    },

    handleMouseMove(e) {
      const pos = this.getPointerPos(e);
      const edge = this.getEdgeAtPos(pos);

      if (edge !== this.hoveredEdge) {
        this.hoveredEdge = edge;
        this.canvas.style.cursor = edge ? 'pointer' : 'default';
        this.draw();
      }
    },

    handleClick(e) {
      const pos = this.getPointerPos(e);
      const edge = this.getEdgeAtPos(pos);
      if (!edge || this.isCompleted) return;

      this.processEdgeSelection(edge);
    },

    /* ─── Step-by-Step Greedy Logic & Validation ─── */
    processEdgeSelection(edge) {
      // Check if already selected
      if (this.studentMstEdges.some(e => e.id === edge.id)) {
        this.showFeedback('banner-order', 'Already Selected', `Edge (${edge.u}, ${edge.v}) is already in your chosen MST edges.`);
        return;
      }

      if (this.mode === 'kruskal') {
        this.validateKruskalChoice(edge);
      } else {
        this.validatePrimChoice(edge);
      }
    },

    validateKruskalChoice(edge) {
      const nodeIds = this.graph.nodes.map(n => n.id);
      const dsu = new DisjointSet(nodeIds);

      // Union all previously chosen edges
      this.studentMstEdges.forEach(e => dsu.union(e.u, e.v));

      // 1. Check if candidate edge creates a cycle
      if (dsu.find(edge.u) === dsu.find(edge.v)) {
        this.triggerEdgeFlash(edge, '#EA4335');
        this.stats.mistakes++;
        this.savePlayerStats();
        this.showFeedback(
          'banner-cycle',
          '❌ Invalid Edge: Creates a Cycle!',
          `Both vertices ${edge.u} and ${edge.v} are already connected in the same component. Adding edge (${edge.u}, ${edge.v}) forms a cycle, which violates the tree property!`
        );
        return;
      }

      // 2. Check if it is the MINIMUM weight valid edge (Greedy choice property)
      // Find all remaining non-cycle edges
      const validEdges = this.graph.edges.filter(e => {
        if (this.studentMstEdges.some(se => se.id === e.id)) return false;
        return dsu.find(e.u) !== dsu.find(e.v);
      });

      const minWeight = Math.min(...validEdges.map(e => e.weight));

      if (edge.weight > minWeight) {
        this.triggerEdgeFlash(edge, '#FBBC05');
        this.stats.mistakes++;
        this.savePlayerStats();
        this.showFeedback(
          'banner-order',
          '⚠️ Incorrect Greedy Order!',
          `Kruskal's algorithm strictly requires picking the available valid edge with the minimum weight first! There is an available valid edge with weight ${minWeight} (< ${edge.weight}).`
        );
        return;
      }

      // Valid choice! Add to MST
      this.triggerEdgeFlash(edge, '#34A853');
      this.studentMstEdges.push(edge);
      this.updateProgressUI();
      this.draw();

      // Check for completion
      if (this.studentMstEdges.length === this.graph.nodes.length - 1) {
        this.celebrateCompletion();
      } else {
        this.showFeedback(
          'banner-correct',
          '✅ Correct Edge Selected!',
          `Edge (${edge.u}, ${edge.v}) [weight ${edge.weight}] connects two disjoint components. Well done!`
        );
      }
    },

    validatePrimChoice(edge) {
      const uIn = this.visitedNodes.has(edge.u);
      const vIn = this.visitedNodes.has(edge.v);

      // Case 1: Both endpoints already in visited set -> Cycle
      if (uIn && vIn) {
        this.triggerEdgeFlash(edge, '#EA4335');
        this.stats.mistakes++;
        this.savePlayerStats();
        this.showFeedback(
          'banner-cycle',
          '❌ Invalid Edge: Creates a Cycle!',
          `Both endpoints ${edge.u} and ${edge.v} are already in the tree set S. Adding this edge would form a cycle!`
        );
        return;
      }

      // Case 2: Neither endpoint in visited set -> Not crossing cut
      if (!uIn && !vIn) {
        this.triggerEdgeFlash(edge, '#FBBC05');
        this.stats.mistakes++;
        this.savePlayerStats();
        this.showFeedback(
          'banner-order',
          '⚠️ Invalid Choice: Not Crossing the Cut!',
          `Prim's algorithm grows a single tree outward. Neither vertex ${edge.u} nor ${edge.v} is currently connected to the tree set S = {${Array.from(this.visitedNodes).join(', ')}}!`
        );
        return;
      }

      // Case 3: Exactly one endpoint in visited set (crosses the cut)
      // Check if it is the minimum cut-crossing edge
      const cutEdges = this.graph.edges.filter(e => {
        const uVisited = this.visitedNodes.has(e.u);
        const vVisited = this.visitedNodes.has(e.v);
        return (uVisited && !vVisited) || (!uVisited && vVisited);
      });

      const minCutWeight = Math.min(...cutEdges.map(e => e.weight));

      if (edge.weight > minCutWeight) {
        this.triggerEdgeFlash(edge, '#FBBC05');
        this.stats.mistakes++;
        this.savePlayerStats();
        this.showFeedback(
          'banner-order',
          '⚠️ Incorrect Greedy Cut Choice!',
          `Prim's algorithm requires the minimum-weight edge crossing the cut. There is a cut edge with weight ${minCutWeight} available (< ${edge.weight})!`
        );
        return;
      }

      // Valid choice! Add to MST and expand visited set
      this.triggerEdgeFlash(edge, '#34A853');
      this.studentMstEdges.push(edge);
      this.visitedNodes.add(edge.u);
      this.visitedNodes.add(edge.v);
      this.updateProgressUI();
      this.draw();

      if (this.studentMstEdges.length === this.graph.nodes.length - 1) {
        this.celebrateCompletion();
      } else {
        const addedNode = uIn ? edge.v : edge.u;
        this.showFeedback(
          'banner-correct',
          '✅ Correct Edge Selected!',
          `Edge (${edge.u}, ${edge.v}) [weight ${edge.weight}] added. Vertex ${addedNode} joined the tree set S!`
        );
      }
    },

    triggerEdgeFlash(edge, color) {
      this.flashingEdge = edge;
      this.flashColor = color;
      this.draw();

      if (this.flashTimer) clearTimeout(this.flashTimer);
      this.flashTimer = setTimeout(() => {
        this.flashingEdge = null;
        this.flashColor = null;
        this.draw();
      }, 500);
    },

    celebrateCompletion() {
      this.isCompleted = true;
      const totalWeight = this.studentMstEdges.reduce((sum, e) => sum + e.weight, 0);

      this.stats.solved++;
      this.stats.streak++;
      this.stats.xp += 50;
      this.savePlayerStats();

      this.showFeedback(
        'banner-win',
        '🎉 MST Completed Successfully!',
        `Outstanding! You selected all ${this.studentMstEdges.length} edges in flawless greedy order. Total Minimum Spanning Tree Weight: ${totalWeight}. +50 Mastery XP awarded!`
      );
    },

    validateMst() {
      const requiredEdges = this.graph.nodes.length - 1;
      const currentCount = this.studentMstEdges.length;

      if (currentCount < requiredEdges) {
        this.showFeedback(
          'banner-order',
          'Incomplete MST',
          `You currently have ${currentCount} / ${requiredEdges} edges selected. Spanning all ${this.graph.nodes.length} vertices requires exactly ${requiredEdges} edges.`
        );
        return;
      }

      // Check connectivity using DSU
      const nodeIds = this.graph.nodes.map(n => n.id);
      const dsu = new DisjointSet(nodeIds);
      this.studentMstEdges.forEach(e => dsu.union(e.u, e.v));

      const groups = dsu.getGroups(nodeIds);
      if (groups.length === 1) {
        const totalWeight = this.studentMstEdges.reduce((sum, e) => sum + e.weight, 0);
        this.showFeedback(
          'banner-win',
          '🎉 Valid Minimum Spanning Tree!',
          `Verified: All ${this.graph.nodes.length} vertices form a single connected component with 0 cycles and minimum total weight ${totalWeight}!`
        );
      } else {
        this.showFeedback(
          'banner-cycle',
          'Disconnected Graph',
          `Selected edges do not form a spanning tree. Graph has ${groups.length} disconnected components.`
        );
      }
    },

    showFeedback(typeClass, title, desc) {
      const banner = document.getElementById('arena-feedback-banner');
      const titleEl = document.getElementById('arena-feedback-title');
      const descEl = document.getElementById('arena-feedback-desc');

      if (!banner || !titleEl || !descEl) return;
      banner.className = `arena-feedback ${typeClass}`;
      titleEl.textContent = title;
      descEl.textContent = desc;
      banner.classList.remove('hidden');
    },

    hideFeedback() {
      const banner = document.getElementById('arena-feedback-banner');
      if (banner) banner.classList.add('hidden');
    },

    updateProgressUI() {
      const countEl = document.getElementById('arena-edge-count');
      const weightEl = document.getElementById('arena-total-weight');
      const visitedEl = document.getElementById('arena-visited-nodes');
      const selectedList = document.getElementById('arena-selected-edges-list');

      const targetCount = this.graph ? this.graph.nodes.length - 1 : 0;
      if (countEl) countEl.textContent = `${this.studentMstEdges.length} / ${targetCount}`;

      const totalWeight = this.studentMstEdges.reduce((sum, e) => sum + e.weight, 0);
      if (weightEl) weightEl.textContent = totalWeight;

      if (visitedEl) {
        visitedEl.textContent = `{ ${Array.from(this.visitedNodes).join(', ') || '∅'} }`;
      }

      if (selectedList) {
        if (this.studentMstEdges.length === 0) {
          selectedList.innerHTML = '<span class="arena-mst-placeholder">No edges chosen yet. Tap the first minimum edge on the canvas!</span>';
        } else {
          selectedList.innerHTML = this.studentMstEdges.map(e => `
            <span class="arena-mst-edge-tag">(${e.u}, ${e.v}) <strong>w=${e.weight}</strong></span>
          `).join('');
        }
      }
    },

    /* ─── Arena Canvas Rendering ─── */
    draw() {
      if (!this.ctx || !this.canvas || !this.graph) return;
      const width = this.canvas.width / this.dpr;
      const height = this.canvas.height / this.dpr;
      const isDark = ThemeManager.isDark();

      this.ctx.clearRect(0, 0, width, height);
      this.ctx.fillStyle = isDark ? '#16213E' : '#FFFFFF';
      this.ctx.fillRect(0, 0, width, height);

      // Subtle background grid
      this.ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
      const gridSize = 28;
      for (let x = 14; x < width; x += gridSize) {
        for (let y = 14; y < height; y += gridSize) {
          this.ctx.beginPath();
          this.ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }

      const selectedIds = new Set(this.studentMstEdges.map(e => e.id));

      // Draw Edges
      this.graph.edges.forEach(edge => {
        const uNode = this.graph.nodes.find(n => n.id === edge.u);
        const vNode = this.graph.nodes.find(n => n.id === edge.v);
        if (!uNode || !vNode) return;

        const isSelected = selectedIds.has(edge.id);
        const isHovered = this.hoveredEdge && this.hoveredEdge.id === edge.id;
        const isFlashing = this.flashingEdge && this.flashingEdge.id === edge.id;

        let stroke = isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.45)';
        let lineWidth = 2.5;

        if (isFlashing) {
          stroke = this.flashColor;
          lineWidth = 6;
        } else if (isSelected) {
          stroke = '#34A853'; // Emerald green
          lineWidth = 5;
        } else if (isHovered) {
          stroke = '#4285F4'; // Blue hover
          lineWidth = 4;
        }

        this.ctx.save();
        this.ctx.strokeStyle = stroke;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(uNode.x, uNode.y);
        this.ctx.lineTo(vNode.x, vNode.y);
        this.ctx.stroke();
        this.ctx.restore();

        // Edge Weight Pill
        const midX = (uNode.x + vNode.x) / 2;
        const midY = (uNode.y + vNode.y) / 2;

        this.ctx.save();
        this.ctx.font = 'bold 12px Roboto Mono, Consolas, monospace';
        const weightText = String(edge.weight);
        const textWidth = this.ctx.measureText(weightText).width;
        const pillW = textWidth + 14;
        const pillH = 20;

        // Pill background
        this.ctx.fillStyle = isDark ? '#1E293B' : '#FFFFFF';
        this.ctx.strokeStyle = stroke;
        this.ctx.lineWidth = isSelected || isHovered ? 2 : 1;
        this.ctx.beginPath();
        this.ctx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, 10);
        this.ctx.fill();
        this.ctx.stroke();

        // Pill Text
        this.ctx.fillStyle = isDark ? '#F8FAFC' : '#1E293B';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(weightText, midX, midY + 0.5);
        this.ctx.restore();
      });

      // Draw Nodes
      const radius = 22;
      this.graph.nodes.forEach(node => {
        const isVisitedInPrim = this.mode === 'prim' && this.visitedNodes.has(node.id);

        this.ctx.save();
        let fill = isDark ? '#1E293B' : '#FFFFFF';
        let stroke = isDark ? '#60A5FA' : '#4285F4';

        if (isVisitedInPrim) {
          fill = isDark ? '#1B5E20' : '#E8F5E9';
          stroke = '#34A853';
        }

        this.ctx.fillStyle = fill;
        this.ctx.strokeStyle = stroke;
        this.ctx.lineWidth = isVisitedInPrim ? 3.5 : 2.5;

        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Label
        this.ctx.font = 'bold 14px Google Sans, Inter, sans-serif';
        this.ctx.fillStyle = isDark ? '#F8FAFC' : '#202124';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(node.label, node.x, node.y);

        this.ctx.restore();
      });
    }
  };

  /* ══════════════════════════════════════════════════════════════════
     6. APP INITIALIZATION
     ══════════════════════════════════════════════════════════════════ */
  window.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    NavigationManager.init();
    FoundationsModule.init();
    MSTVisualizer.init();
    MSTPracticeArena.init();

    window.FoundationsModule = FoundationsModule;
    window.MSTVisualizer = MSTVisualizer;
    window.MSTPracticeArena = MSTPracticeArena;
  });

})();
