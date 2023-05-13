import { Keypair, Connection, Commitment } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import wallet from "../prerequisite/ts/wba-wallet.json";

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

(async () => {
  try {
    // Start here

    const mint = await createMint(
      connection,
      keypair, // signer
      keypair.publicKey,
      null,
      9 // We are using 9 to match the CLI decimal default exactly
    );

    console.log(mint.toBase58());
    // FNR7QBxNNJC9TSCv4WunRf1m4cfW32Uvm71GDeNYYmRm
  } catch (error) {
    console.log(`Oops, something went wrong: ${error}`);
  }
})();
