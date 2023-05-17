import { Keypair, Connection } from "@solana/web3.js";
import wallet from "../prerequisite/ts/wba-wallet.json";
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  toMetaplexFile,
} from "@metaplex-foundation/js";
import { readFile } from "fs/promises";

// Create a devnet connection
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Import keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Metaplex connection
const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(keypair))
  .use(
    bundlrStorage({
      address: "https://devnet.bundlr.network",
      providerUrl: "https://api.devnet.solana.com",
      timeout: 60000,
    })
  );

(async () => {
  try {
    // Upload the image
    const image = await readFile("./cluster1/images/generug.png");
    const metaplexImage = toMetaplexFile(image, "generug.png");
    const uri = await metaplex.storage().upload(metaplexImage);
    console.log(uri);
  } catch (e) {
    console.log(e);
  }
})();
