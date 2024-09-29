// @ts-nocheck
import { useState, useEffect } from 'react';
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { ethers } from 'ethers';

export function useSessionSigs() {
  const [sessionSigs, setSessionSigs] = useState(null);

  useEffect(() => {
    const getSessionSigs = async () => {
      const client = new LitJsSdk.LitNodeClient({
        litNetwork: "datil-dev",
      });
      await client.connect();

      const authSig = await LitJsSdk.checkAndSignAuthMessage({
        chain: 'sepolia' // Changed from 'ethereum' to 'sepolia'
      });

      const sessionSigs = await client.getSessionSigs({
        expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        chain: 'sepolia', // Changed from 'ethereum' to 'sepolia'
        resources: ['*'],
        authSig,
      });

      setSessionSigs(sessionSigs);
    };

    getSessionSigs();
  }, []);

  return sessionSigs;
}