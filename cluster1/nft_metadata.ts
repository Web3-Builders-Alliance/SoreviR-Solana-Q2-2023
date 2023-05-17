import { Commitment, Connection, Keypair } from "@solana/web3.js";
import wallet from "../prerequisite/ts/wba-wallet.json";
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
} from "@metaplex-foundation/js";

// We're going to import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

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
    const { uri } = await metaplex.nfts().uploadMetadata({
      name: "Sore Rug",
      symbol: "SRR",
      description: "Rug of SoreviR",
      image: "https://arweave.net/9eYZxp9Gl3bK3kuAY8O1DxhBOae_3wK4uUAW5uMogOs",
      attributes: [],
      properties: {
        files: [
          {
            type: "image/png",
            uri: "https://arweave.net/9eYZxp9Gl3bK3kuAY8O1DxhBOae_3wK4uUAW5uMogOs",
          },
        ],
      },
      creators: [
        {
          address: keypair.publicKey.toBase58(),
          share: 100,
        },
      ],
      sellerFeeBasisPoints: 420,
      isMutable: true,
    });

    console.log(uri);
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
