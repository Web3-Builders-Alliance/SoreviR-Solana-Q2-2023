import {
  Commitment,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import wallet from "../prerequisite/ts/wba-wallet.json";
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";

// We're going to import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

// Mint address
const mint = new PublicKey("FNR7QBxNNJC9TSCv4WunRf1m4cfW32Uvm71GDeNYYmRm");

// Recipient address
const to = new PublicKey("tiosTcRdt9TW7baDB3BLL3LY16w5pP5XsTbeQNZJKjD"); // Daniel: tiosTcRdt9TW7baDB3BLL3LY16w5pP5XsTbeQNZJKjD

(async () => {
  try {
    // Get the token account (ATA) of the fromWallet address, and if it does not exist, create it
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      keypair.publicKey
    );

    // Get the token account of the toWallet address, and if it does not exist, create it
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      to
    );

    // Transfer the new token to the "toTokenAccount" we just created
    const txHash = transfer(
      connection,
      keypair,
      fromTokenAccount.address,
      toTokenAccount.address,
      keypair.publicKey,
      1000n * 1_000_000n
    );

    console.log(`Your TX is: ${toTokenAccount.address.toBase58()}`);
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
