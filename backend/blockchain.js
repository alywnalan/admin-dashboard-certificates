import { ethers } from 'ethers';

export async function anchorHashOnChain(contentHashHex) {
  try {
    const rpcUrl = process.env.ETH_RPC;
    const privateKey = process.env.ETH_PRIVATE_KEY;
    const useRealBlockchain = process.env.USE_REAL_BLOCKCHAIN === 'true';
    
    if (!useRealBlockchain || !rpcUrl || !privateKey) {
      console.log('🔗 Using simulated blockchain anchoring');
      return {
        network: 'simulated',
        txId: `sim-${contentHashHex.slice(2, 10)}-${Date.now()}`,
        anchoredAt: new Date(),
        status: 'confirmed'
      };
    }

    console.log('🔗 Anchoring to real blockchain...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Get current gas price
    const gasPrice = await provider.getFeeData();
    
    // Create transaction with hash in data field
    const tx = await wallet.sendTransaction({
      to: wallet.address, // Send to self to minimize cost
      value: 0,
      data: contentHashHex,
      gasLimit: 21000,
      gasPrice: gasPrice.gasPrice
    });

    console.log('⏳ Transaction sent:', tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    console.log('✅ Transaction confirmed:', {
      hash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return {
      network: 'ethereum',
      txId: receipt.hash,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      anchoredAt: new Date(),
      status: 'confirmed'
    };

  } catch (error) {
    console.warn('⚠️ Blockchain anchoring error, using simulated:', error.message);
    return {
      network: 'simulated',
      txId: `sim-${contentHashHex.slice(2, 10)}-${Date.now()}`,
      anchoredAt: new Date(),
      status: 'failed',
      error: error.message
    };
  }
}

export function computeContentHashHex(payload) {
  // Compute keccak256 over UTF-8 payload string
  const bytes = ethers.getBytes(ethers.toUtf8Bytes(payload));
  return ethers.keccak256(bytes);
}


