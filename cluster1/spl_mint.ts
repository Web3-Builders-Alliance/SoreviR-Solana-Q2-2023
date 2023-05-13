import { Keypair, PublicKey, Connection, Commitment } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import wallet from "../prerequisite/ts/wba-wallet.json";

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

const token_decimals = 1_000_000_000n;

// Mint address (The one created with spl_init)
const mint = new PublicKey("FNR7QBxNNJC9TSCv4WunRf1m4cfW32Uvm71GDeNYYmRm");

(async () => {
  try {
    // Start here

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      // Associated Token Account (ATA)
      connection,
      keypair, // signer
      mint,
      keypair.publicKey // owner of the ATA
    );

    console.log(`Your ata is: ${tokenAccount.address.toBase58()}`);
    // FJKw62EusxJXMi6qTmciPUJPF411JxfQHJ92hAtyLXrS

    const mintTx = await mintTo(
      connection,
      keypair,
      mint,
      tokenAccount.address,
      keypair,
      1000n * token_decimals // because decimals for the mint are set to 9
    );

    console.log(`Your mint txid is: ${mintTx}`);
    // 2bKLhEwYib4AAJa3dgafnsGnPXDcDQWoGngg9DcJhSdxJAMPpnbjfRACAJF3qrMM28czkh5wehrT7z2sPEpxB8Zq
  } catch (error) {
    console.log(`Oops, something went wrong: ${error}`);
  }
})();
