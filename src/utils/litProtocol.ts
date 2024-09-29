// @ts-nocheck
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';

const client = new LitJsSdk.LitNodeClient({
  litNetwork: "datil-dev",
});

const chain = 'sepolia';

const accessControlConditions = [
  {
    contractAddress: '',
    standardContractType: '',
    chain: 'sepolia',
    method: 'eth_getBalance',
    parameters: [':userAddress', 'latest'],
    returnValueTest: {
      comparator: '>=',
      value: '0',  
    },
  },
];

const ipfs = create({ url: 'https://ipfs.infura.io:5001/api/v0' });

export const encryptWasteData = async (data) => {
  await client.connect();
  const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
    {
      accessControlConditions,
      chain,
      dataToEncrypt: JSON.stringify(data),
    },
    client
  );

  return { ciphertext, dataToEncryptHash };
};

export const submitEncryptedWasteData = async (encryptedData) => {
  try {
    const { ciphertext, dataToEncryptHash } = encryptedData;
    
    const ciphertextResult = await ipfs.add(JSON.stringify(ciphertext));
    const ciphertextCID = ciphertextResult.cid.toString();

    const hashResult = await ipfs.add(JSON.stringify(dataToEncryptHash));
    const hashCID = hashResult.cid.toString();

    console.log(`Ciphertext stored with CID: ${ciphertextCID}`);
    console.log(`Data hash stored with CID: ${hashCID}`);

    return { ciphertextCID, hashCID };
  } catch (error) {
    console.error("Error submitting encrypted data:", error);
    throw error;
  }
};

export const performDataAnalysis = async (sessionSigs) => {
  const litActionCode = `
    const go = async () => {
      const decryptedData = await Lit.Actions.decryptAndCombine({
        accessControlConditions,
        ciphertext,
        dataToEncryptHash,
        authSig: null,
        chain: 'sepolia'
      });

      const wasteData = JSON.parse(decryptedData);

      const totalWaste = wasteData.reduce((sum, record) => sum + record.quantity, 0);
      const averageWaste = totalWaste / wasteData.length;
      const hotspots = wasteData.filter(record => record.quantity > averageWaste * 1.5)
                                .map(record => ({ lat: record.lat, lng: record.lng }));

      const insights = {
        totalWaste,
        averageWaste,
        hotspotCount: hotspots.length,
        hotspotLocations: hotspots
      };

      Lit.Actions.setResponse({ response: JSON.stringify(insights) });
    };

    go();
  `;

  try {
    const ciphertextCID = 'your-ciphertext-cid';
    const hashCID = 'your-hash-cid';

    const ciphertextStream = ipfs.cat(ciphertextCID);
    let ciphertext = '';
    for await (const chunk of ciphertextStream) {
      ciphertext += chunk.toString();
    }

    const hashStream = ipfs.cat(hashCID);
    let dataToEncryptHash = '';
    for await (const chunk of hashStream) {
      dataToEncryptHash += chunk.toString();
    }

    const results = await client.executeJs({
      code: litActionCode,
      sessionSigs,
      jsParams: {
        accessControlConditions,
        ciphertext: JSON.parse(ciphertext),
        dataToEncryptHash: JSON.parse(dataToEncryptHash),
      }
    });

    return JSON.parse(results.response);
  } catch (error) {
    console.error("Error performing data analysis:", error);
    throw error;
  }
};

export const proposeAndSignInitiative = async (sessionSigs, proposal) => {
  const litActionCode = `
    const go = async () => {
      if (!verifyProposal(proposal)) {
        return Lit.Actions.setResponse({ response: JSON.stringify({ error: 'Invalid proposal' }) });
      }

      const sigShare = await Lit.Actions.signEcdsa({ toSign: proposal, publicKey, sigName: 'proposalSig' });

      const allSigs = await Lit.Actions.broadcastAndCollect({
        name: 'proposalSigs',
        value: sigShare,
      });

      if (allSigs.length >= REQUIRED_SIGNATURES) {
        const combinedSig = combineSignatures(allSigs);
        const txHash = await broadcastTransaction(proposal, combinedSig);
        Lit.Actions.setResponse({ response: JSON.stringify({ success: true, txHash }) });
      } else {
        Lit.Actions.setResponse({ response: JSON.stringify({ success: false, sigCount: allSigs.length }) });
      }
    };

    go();
  `;

  const results = await client.executeJs({
    code: litActionCode,
    sessionSigs,
    jsParams: {
      proposal,
      publicKey: '<Your PKP public key>',
      REQUIRED_SIGNATURES: 3,
    }
  });

  return JSON.parse(results.response);
};

function verifyProposal(proposal) {
  if (!proposal || typeof proposal !== 'string' || proposal.length < 10) {
    return false;
  }
  return true;
}

function combineSignatures(signatures) {
  return signatures.join(',');
}

async function broadcastTransaction(proposal, combinedSig) {
  const mockTx = {
    to: '0x1234567890123456789012345678901234567890',
    data: ethers.utils.toUtf8Bytes(proposal),
    value: ethers.utils.parseEther('0'),
  };

  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR-PROJECT-ID');
  const wallet = new ethers.Wallet('YOUR-PRIVATE-KEY', provider);

  const tx = await wallet.sendTransaction(mockTx);
  await tx.wait();

  return tx.hash;
}