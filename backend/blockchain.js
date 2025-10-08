import { ethers } from 'ethers';

export async function anchorHashOnChain(contentHashHex) {
  try {
    const rpcUrl = process.env.ETH_RPC;
    const privateKey = process.env.ETH_PRIVATE_KEY;
    
    // Always use simulated anchoring for now to avoid blockchain issues
    console.log('🔗 Using simulated blockchain anchoring');
    return {
      network: 'simulated',
      txId: `sim-${contentHashHex.slice(2, 10)}-${Date.now()}`,
      anchoredAt: new Date()
    };
    
    // Uncomment the code below when you have proper blockchain credentials
    /*
    if (!rpcUrl || !privateKey) {
      // Fallback to simulated anchoring
      return {
        network: 'simulated',
        txId: `sim-${contentHashHex.slice(2, 10)}-${Date.now()}`,
        anchoredAt: new Date()
      };
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Send minimal value tx with data containing the hash
    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0n,
      data: contentHashHex
    });
    const receipt = await tx.wait();
    return {
      network: await provider.getNetwork().then(n => n.name || String(n.chainId)),
      txId: receipt.hash,
      anchoredAt: new Date()
    };
    */
  } catch (error) {
    console.warn('⚠️ Blockchain anchoring error, using simulated:', error.message);
    return {
      network: 'simulated',
      txId: `sim-${contentHashHex.slice(2, 10)}-${Date.now()}`,
      anchoredAt: new Date(),
      error: error.message
    };
  }
}

export function computeContentHashHex(payload) {
  // Compute keccak256 over UTF-8 payload string
  const bytes = ethers.getBytes(ethers.toUtf8Bytes(payload));
  return ethers.keccak256(bytes);
}


