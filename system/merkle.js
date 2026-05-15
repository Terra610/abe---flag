// system/merkle.js — Tamper-proof Merkle Tree for A.B.E. Audit Ledger
// Pure Web Crypto — 100% local, deterministic, verifiable

async function sha256(data) {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(typeof data === 'string' ? data : JSON.stringify(data));
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function buildMerkleTree(leaves) {
  if (leaves.length === 0) return { root: null, tree: [], leaves: [] };

  // Make leaves deterministic + self-describing
  const processedLeaves = leaves.map((leaf, i) => ({
    index: i,
    timestamp: new Date().toISOString(),
    data: leaf,                    // can be object or string
    hash: null
  }));

  let tree = await Promise.all(
    processedLeaves.map(async (leaf) => {
      leaf.hash = await sha256(leaf.data);
      return leaf.hash;
    })
  );

  const levels = [tree.slice()];   // copy

  while (tree.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < tree.length; i += 2) {
      const left = tree[i];
      const right = i + 1 < tree.length ? tree[i + 1] : left; // Bitcoin-style duplicate
      const combined = left < right ? left + right : right + left; // canonical order
      nextLevel.push(await sha256(combined));
    }
    tree = nextLevel;
    levels.push(tree.slice());
  }

  return {
    root: tree[0],
    levels,
    leaves: processedLeaves,
    generatedAt: new Date().toISOString()
  };
}

async function getMerkleProof(levels, leafIndex) {
  const proof = [];
  let index = leafIndex;
  for (let level = 0; level < levels.length - 1; level++) {
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
    if (siblingIndex < levels[level].length) {
      proof.push({
        hash: levels[level][siblingIndex],
        position: siblingIndex < index ? 'left' : 'right'
      });
    }
    index = Math.floor(index / 2);
  }
  return proof;
}

async function verifyMerkleProof(leafData, proof, root) {
  let hash = await sha256(leafData);
  for (const sibling of proof) {
    const left = sibling.position === 'left' ? sibling.hash : hash;
    const right = sibling.position === 'left' ? hash : sibling.hash;
    hash = await sha256(left + right);
  }
  return hash === root;
}

// Convenience: Generate full audit receipt
async function generateAuditReceipt(modulesOutputs) {
  const tree = await buildMerkleTree(modulesOutputs);
  return {
    abeVersion: "1.0",
    receiptId: await sha256(tree.root + tree.generatedAt),
    merkleRoot: tree.root,
    generatedAt: tree.generatedAt,
    moduleCount: modulesOutputs.length,
    proof: tree.leaves.map((leaf, i) => ({
      module: leaf.data.module || `module_${i}`,
      hash: leaf.hash,
      proof: null // filled when needed
    })),
    fullTree: tree // only store if user wants full verifiability
  };
}
